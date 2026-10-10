# subscription_payment/views.py

import logging
import uuid

from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from subscription.models import Subscription

from .serializers import (
    InitiatePaymentSerializer,
    SubscriptionPaymentSerializer,
)
from .controllers.submit_order_request import submit_the_order
from .controllers.services import (
    get_active_pesapal_config,
    record_pending_payment,
)


logger = logging.getLogger(__name__)


# ============================================================
# INITIATE PAYMENT
# POST /subscription_payments/initiate/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Start a PesaPal payment for a plan.
    """

    # ── 1. Validate input ──────────────────────────────
    serializer = InitiatePaymentSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    plan = serializer.plan
    phone = serializer.validated_data.get("phone", "")
    user = request.user

    # ── 2. Ensure an active PesaPal config exists ─────
    try:
        config = get_active_pesapal_config()
    except Exception as e:
        logger.error("PesaPal config error: %s", e)
        return Response(
            {"message": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # ── 3. Reject a free plan through PesaPal ─────────
    if plan.is_free:
        return Response(
            {
                "message": (
                    f"{plan.plan_name} is free — no payment "
                    f"is required."
                ),
                "code": "plan_is_free",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Find or create the subscription row ────────
    subscription = (
        Subscription.objects
        .filter(user=user)
        .order_by("-created_at")
        .first()
    )

    if subscription is None:
        from plans.models import Plan

        fallback_plan = user.effective_plan or Plan.get_default()

        if fallback_plan is None:
            return Response(
                {
                    "message": (
                        "No plan available to attach the payment to. "
                        "Please contact support."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        subscription = Subscription.objects.create(
            user=user,
            plan=fallback_plan,
            status=Subscription.STATUS_PENDING,
            start_date=timezone.now(),
            end_date=None,
            note="Created on payment initiation.",
        )

    # ── 5. Build the merchant reference ───────────────
    merchant_reference = (
        f"SUB-{subscription.id}-{uuid.uuid4().hex[:12].upper()}"
    )

    # ── 6. Submit the order to PesaPal ────────────────
    order_payload = {
        "merchant_reference": merchant_reference,
        "amount": str(plan.price),
        "description": f"Subscription to {plan.plan_name}",
        "notification_id": config.ipn_id,
        "email": user.email,
        "phone": phone or getattr(user, "phone_number", "") or "",
        "first_name": getattr(user, "first_name", "") or "",
        "last_name": getattr(user, "last_name", "") or "",
    }

    try:
        result = submit_the_order(order_payload)
    except Exception as e:
        logger.exception(
            "PesaPal SubmitOrderRequest failed for user=%s plan=%s",
            user.email,
            plan.slug,
        )
        return Response(
            {
                "message": (
                    "Could not start the payment. "
                    "Please try again in a moment."
                ),
                "code": "gateway_error",
                "detail": str(e),
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    redirect_url = result.get("redirect_url")
    order_tracking_id = result.get("order_tracking_id")

    if not redirect_url or not order_tracking_id:
        logger.error(
            "PesaPal returned an incomplete response: %s",
            result,
        )
        return Response(
            {
                "message": (
                    "The payment gateway returned an incomplete "
                    "response. Please try again."
                ),
                "code": "gateway_incomplete",
                "detail": result,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # ── 7. Persist the pending payment row ────────────
    try:
        payment = record_pending_payment(
            subscription=subscription,
            plan=plan,
            merchant_reference=merchant_reference,
            order_tracking_id=order_tracking_id,
            amount=plan.price,
            phone_number=phone or None,
            email=user.email,
            gateway="pesapal",
            submit_response=result,
        )
    except Exception as e:
        logger.exception(
            "Failed to record pending payment for ref=%s",
            merchant_reference,
        )
        return Response(
            {
                "message": (
                    "The payment was started but could not be "
                    "recorded locally. Please contact support."
                ),
                "code": "record_failed",
                "detail": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── 8. Respond with the redirect URL ──────────────
    return Response(
        {
            "message": "Payment initialised. Redirecting…",
            "payment": SubscriptionPaymentSerializer(payment).data,
            "redirect_url": redirect_url,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# PAYMENT STATUS
# GET /subscription_payments/<merchant_reference>/status/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_status(request, merchant_reference):
    """
    Poll the local payment row for its latest status.
    """

    from .models import SubscriptionPayment

    payment = (
        SubscriptionPayment.objects
        .select_related("plan", "subscription")
        .filter(
            merchant_reference=merchant_reference,
            subscription__user=request.user,
        )
        .first()
    )

    if not payment:
        return Response(
            {"message": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        SubscriptionPaymentSerializer(payment).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# SYNC
# POST /subscription_payments/<merchant_reference>/sync/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_payment(request, merchant_reference):
    """
    Force a sync of this payment row against PesaPal, then
    return the updated row.

    The frontend calls this after the user returns from
    PesaPal — it guarantees the row is fresh regardless of
    whether the IPN has arrived yet.
    """

    from .models import SubscriptionPayment
    from .controllers.services import sync_payment_from_pesapal

    payment = (
        SubscriptionPayment.objects
        .select_related("plan", "subscription")
        .filter(
            merchant_reference=merchant_reference,
            user=request.user,
        )
        .first()
    )

    if not payment:
        return Response(
            {"message": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        sync_payment_from_pesapal(merchant_reference)
    except Exception as e:
        logger.exception(
            "Sync failed on user request ref=%s",
            merchant_reference,
        )
        payment.refresh_from_db()
        return Response(
            {
                "message": "Could not refresh from the gateway.",
                "detail": str(e),
                "payment": SubscriptionPaymentSerializer(payment).data,
            },
            status=status.HTTP_200_OK,
        )

    payment.refresh_from_db()

    return Response(
        {
            "message": "Payment status refreshed.",
            "payment": SubscriptionPaymentSerializer(payment).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CALLBACK
# GET /subscription_payments/payment-success/
#
# PesaPal redirects the customer's BROWSER here after payment.
#
# This view:
#   1. Syncs the payment against PesaPal (so the row is
#      immediately up to date even if the IPN hasn't landed).
#   2. Redirects the browser to the FRONTEND callback page,
#      which shows the result UI.
#
# The user never sees raw JSON.
# ============================================================

@api_view(["GET"])
@permission_classes([])
def payment_success_callback(request):
    """
    PesaPal browser redirect target.

    Syncs the payment, then 302-redirects to the frontend
    /payment/callback page. The frontend can re-sync and
    render the correct result screen (success / pending /
    failed).
    """

    from .controllers.services import sync_payment_from_pesapal

    merchant_reference = request.query_params.get(
        "OrderMerchantReference"
    )
    order_tracking_id = request.query_params.get("OrderTrackingId")

    logger.info(
        "Payment callback received | ref=%s | tracking=%s",
        merchant_reference,
        order_tracking_id,
    )

    # ── Best-effort sync. Never block the redirect on it. ──
    if merchant_reference:
        try:
            sync_payment_from_pesapal(merchant_reference)
        except Exception:
            logger.exception(
                "Failed to sync payment on callback ref=%s",
                merchant_reference,
            )

    # ── Build the frontend redirect URL ────────────────────
    frontend = settings.FRONTEND_URL.rstrip("/")

    query_parts = []
    if merchant_reference:
        query_parts.append(
            f"OrderMerchantReference={merchant_reference}"
        )
    if order_tracking_id:
        query_parts.append(
            f"OrderTrackingId={order_tracking_id}"
        )

    query_string = "&".join(query_parts)
    target = f"{frontend}/payment/callback"
    if query_string:
        target = f"{target}?{query_string}"

    logger.info("Redirecting browser to %s", target)

    return redirect(target)


# ============================================================
# IPN
# POST /subscription_payments/ipn/
#
# Server-to-server notification from PesaPal. Must return
# 200 (even on error) so PesaPal doesn't keep retrying.
# ============================================================

@api_view(["POST"])
@permission_classes([])
def payment_ipn(request):
    """
    Server-to-server notification from PesaPal.
    """

    from .controllers.services import sync_payment_from_pesapal

    payload = request.data if hasattr(request, "data") else {}

    merchant_reference = (
        payload.get("OrderMerchantReference")
        or payload.get("orderMerchantReference")
        or payload.get("merchant_reference")
    )

    logger.info(
        "IPN received | ref=%s | payload=%s",
        merchant_reference,
        dict(payload),
    )

    if not merchant_reference:
        return Response({"received": True}, status=status.HTTP_200_OK)

    try:
        sync_payment_from_pesapal(merchant_reference)
    except Exception:
        logger.exception(
            "IPN failed to sync ref=%s", merchant_reference
        )

    return Response({"received": True}, status=status.HTTP_200_OK)