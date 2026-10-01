# subscription_payment/views.py
import logging
import time

from django.conf import settings
from django.shortcuts import redirect

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from plans.models import Plan

from .controllers.Fetch_plan_amount import Plan_Amount
from .controllers.fetch_pesapal_token import get_pesapal_token
from .controllers.get_registered_ipns import get_registered_ipns
from .controllers.submit_order_request import submit_the_order
from .controllers.services import (
    record_pending_payment,
    sync_payment_from_pesapal,
)

from .models import SubscriptionPayment


logger = logging.getLogger(__name__)


# ============================================================
# CREATE SUBSCRIPTION PAYMENT
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_subscription_payment(request):

    # --------------------------------------------------------
    # 1. plan_id
    # --------------------------------------------------------
    plan_id = request.data.get("plan_id")

    if not plan_id:
        return Response(
            {"error": "plan_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # 2. Load the plan explicitly
    # --------------------------------------------------------
    try:
        plan = Plan.objects.get(id=plan_id)
    except Plan.DoesNotExist:
        return Response(
            {"error": f"Plan {plan_id} not found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # 3. User's subscription
    # --------------------------------------------------------
    subscription = getattr(request.user, "subscription", None)

    if not subscription:
        return Response(
            {
                "error": (
                    "No subscription found for this user. "
                    "Please contact support."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # 4. Amount
    # --------------------------------------------------------
    try:
        amount = Plan_Amount(plan_id)
    except Exception as e:
        logger.exception(
            "Failed to fetch plan amount for plan_id=%s",
            plan_id,
        )
        return Response(
            {"error": f"Failed to fetch plan amount: {e}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not amount or amount <= 0:
        return Response(
            {"error": "Invalid plan amount."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # 5. Phone
    # --------------------------------------------------------
    phone_number = (
        request.data.get("phone_number")
        or getattr(request.user, "phone_number", "")
        or ""
    ).strip() or None

    if not phone_number:
        return Response(
            {"error": "phone_number is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # 6. Token
    # --------------------------------------------------------
    token_response = get_pesapal_token()
    token = token_response.get("token")

    if not token:
        logger.error(
            "PesaPal token failed: %s",
            token_response,
        )
        return Response(
            {
                "error": "Failed to get PesaPal token.",
                "response": token_response,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # --------------------------------------------------------
    # 7. IPN
    # --------------------------------------------------------
    try:
        registered_ipns = get_registered_ipns(token)
    except Exception as e:
        logger.exception("Failed to fetch registered IPNs.")
        return Response(
            {"error": f"Failed to fetch registered IPNs: {e}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    ipn_id = None

    if isinstance(registered_ipns, list) and registered_ipns:
        for ipn in registered_ipns:
            if ipn.get("url") == settings.PESAPAL_IPN_URL:
                ipn_id = ipn.get("ipn_id")
                break
        if not ipn_id:
            ipn_id = registered_ipns[0].get("ipn_id")

    if not ipn_id:
        logger.error(
            "No registered IPN id found: %s",
            registered_ipns,
        )
        return Response(
            {
                "error": (
                    "No registered IPN found. "
                    "Register one first via register_ipn_url()."
                ),
                "registered_ipns": registered_ipns,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # --------------------------------------------------------
    # 8. Build order
    # --------------------------------------------------------
    user = request.user

    merchant_reference = (
        f"SUB-{user.id}-{plan_id}-{int(time.time())}"
    )

    order_data = {
        "merchant_reference": merchant_reference,
        "amount": float(amount),
        "currency": "KES",
        "description": f"Subscription plan {plan.name}",
        "notification_id": ipn_id,
        "email": user.email,
        "phone": phone_number,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
    }

    # --------------------------------------------------------
    # 9. Submit
    # --------------------------------------------------------
    try:
        order_response = submit_the_order(order_data)
    except Exception as e:
        logger.exception("Failed to submit order to PesaPal.")
        return Response(
            {"error": f"Failed to submit order: {e}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    redirect_url = order_response.get("redirect_url")
    order_tracking_id = order_response.get("order_tracking_id")

    if not redirect_url or not order_tracking_id:
        logger.error(
            "PesaPal order response missing fields: %s",
            order_response,
        )
        return Response(
            {
                "error": "PesaPal did not return a redirect URL.",
                "response": order_response,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # --------------------------------------------------------
    # 10. Persist pending row — MUST succeed
    # --------------------------------------------------------
    try:
        payment = record_pending_payment(
            subscription=subscription,
            plan=plan,
            merchant_reference=merchant_reference,
            order_tracking_id=order_tracking_id,
            amount=amount,
            phone_number=phone_number,
            email=user.email,
            gateway="pesapal",
            submit_response=order_response,
        )
    except Exception:
        logger.exception(
            "CRITICAL: PesaPal order %s could not be recorded "
            "(tracking=%s).",
            merchant_reference,
            order_tracking_id,
        )
        return Response(
            {
                "error": (
                    "Payment was submitted to PesaPal but could "
                    "not be recorded locally. Please contact "
                    "support with this reference."
                ),
                "merchant_reference": merchant_reference,
                "order_tracking_id": order_tracking_id,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # 11. Respond
    # --------------------------------------------------------
    return Response(
        {
            "message": "Subscription payment created successfully.",
            "amount": amount,
            "currency": "KES",
            "merchant_reference": merchant_reference,
            "order_tracking_id": order_tracking_id,
            "redirect_url": redirect_url,
            "ipn_id": ipn_id,
            "payment_id": str(payment.subscription_payment_id),
            "status": payment.status,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# TRANSACTION STATUS (frontend polling)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def subscription_payment_status(request, merchant_reference):

    payment = (
        SubscriptionPayment.objects
        .select_related(
            "subscription",
            "subscription__plan",
            "subscription__user",
            "plan",
        )
        .filter(
            merchant_reference=merchant_reference,
            subscription__user=request.user,
        )
        .first()
    )

    if not payment:
        return Response(
            {"error": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if payment.is_terminal:
        return Response(
            {
                "merchant_reference": merchant_reference,
                "status": payment.status,
                "is_completed": payment.status == "completed",
                "order_tracking_id": payment.order_tracking_id,
                "paid_at": payment.paid_at,
                "confirmation_code": payment.confirmation_code,
                "payment_method": payment.payment_method,
                "payment_account": payment.payment_account,
                "plan_id": payment.plan_id,
            },
            status=status.HTTP_200_OK,
        )

    if not payment.order_tracking_id:
        return Response(
            {
                "merchant_reference": merchant_reference,
                "status": payment.status,
                "is_completed": False,
                "message": "No order tracking id yet.",
            },
            status=status.HTTP_200_OK,
        )

    try:
        data = sync_payment_from_pesapal(merchant_reference)
    except Exception as e:
        logger.exception(
            "Failed to sync transaction status for ref=%s",
            merchant_reference,
        )
        return Response(
            {"error": f"Failed to fetch status: {e}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    payment.refresh_from_db()

    return Response(
        {
            "merchant_reference": merchant_reference,
            "status": payment.status,
            "is_completed": payment.status == "completed",
            "order_tracking_id": payment.order_tracking_id,
            "paid_at": payment.paid_at,
            "confirmation_code": payment.confirmation_code,
            "payment_method": payment.payment_method,
            "payment_account": payment.payment_account,
            "plan_id": payment.plan_id,
            "pesapal": {
                "status_code": data.get("status_code"),
                "payment_status_description": data.get(
                    "payment_status_description"
                ),
                "payment_method": data.get("payment_method"),
                "amount": data.get("amount"),
                "currency": data.get("currency"),
                "confirmation_code": data.get("confirmation_code"),
                "message": data.get("message"),
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# IPN (server-to-server)
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def pesapal_ipn(request):
    """
    PesaPal POSTs here after processing.
    """

    order_tracking_id = request.data.get("OrderTrackingId")
    merchant_reference = request.data.get("OrderMerchantReference")

    logger.info(
        "IPN received | tracking=%s | ref=%s | payload=%s",
        order_tracking_id,
        merchant_reference,
        request.data,
    )

    if not order_tracking_id or not merchant_reference:
        return Response(
            {
                "error": (
                    "Missing OrderTrackingId or "
                    "OrderMerchantReference."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        sync_payment_from_pesapal(merchant_reference)
    except Exception:
        logger.exception(
            "IPN sync failed for %s", merchant_reference
        )

    return Response(
        {
            "orderNotificationType": "IPNCHANGE",
            "orderTrackingId": order_tracking_id,
            "orderMerchantReference": merchant_reference,
            "status": 200,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CALLBACK (browser redirect)
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def pesapal_callback(request):
    """
    PesaPal redirects the customer's browser here.
    """

    order_tracking_id = request.query_params.get("OrderTrackingId")
    merchant_reference = request.query_params.get("OrderMerchantReference")

    logger.info(
        "Callback received | tracking=%s | ref=%s",
        order_tracking_id,
        merchant_reference,
    )

    paid = False
    failure_reason = None

    if merchant_reference:
        try:
            data = sync_payment_from_pesapal(merchant_reference)
            paid = bool(data.get("is_completed"))

            if not paid:
                failure_reason = data.get(
                    "payment_status_description"
                ) or data.get("description") or "failed"
        except Exception as e:
            logger.exception(
                "Callback sync failed for %s", merchant_reference
            )
            failure_reason = str(e)

    status_flag = "success" if paid else "failed"

    url = (
        f"{settings.FRONTEND_URL}/subscription/payment-result"
        f"?status={status_flag}"
        f"&ref={merchant_reference or ''}"
    )
    if failure_reason:
        from urllib.parse import quote
        url += f"&reason={quote(str(failure_reason))}"

    return redirect(url)