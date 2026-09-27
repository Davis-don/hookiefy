# subscription_payment/views.py
# ============================================================
# SUBSCRIPTION PAYMENT VIEWS
# ============================================================
# Uses the SAME Pesapal services as the payments app:
#   - submit_order
#   - get_transaction_status
#   - SuperAdminValidator
#   - register_ipn_url
#
# Records go into SubscriptionPayment. On success, the
# payment is linked back on the Subscription — same pattern
# as Connection.payment.
# ============================================================

import uuid
import logging
from datetime import timedelta

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone
from django.shortcuts import redirect
from django.conf import settings
from django.db import connection as db_connection, close_old_connections
from django.db.utils import OperationalError, InterfaceError

from account.models import Accounts
from notification.models import Notification
from plans.models import Plan
from subscription.models import Subscription
from paymentconfigurations.models import PaymentConfiguration

from payments.services.register_ipn import register_ipn_url
from payments.services.submit_order import submit_order
from payments.services.get_transaction_status import get_transaction_status
from payments.services.check_superadmin import SuperAdminValidator

from .models import SubscriptionPayment
from .serializers import (
    PlanPaymentInitiationSerializer,
    SubscriptionPaymentSerializer,
    ReconcileSubscriptionPaymentSerializer,
)


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def notify(
    receiver,
    title,
    message,
    category=Notification.CATEGORY_PAYMENT,
    sender=None,
    connection=None,
):
    """Safe notification creator. Never breaks the flow."""
    try:
        return Notification.objects.create(
            sender=sender,
            receiver=receiver,
            category=category,
            connection=connection,
            title=title,
            message=message,
            is_read=False,
        )
    except Exception as e:
        logger.error(
            f"❌ Notification failed (receiver="
            f"{getattr(receiver, 'id', receiver)}, "
            f"title='{title}'): {e}",
            exc_info=True,
        )
        return None


def get_superadmin():
    try:
        return (
            Accounts.objects
            .filter(role="superadmin", is_active=True)
            .first()
        )
    except Exception as e:
        logger.error(f"❌ Superadmin fetch failed: {e}")
        return None


def get_pesapal_configuration():
    try:
        config = PaymentConfiguration.objects.filter(
            gateway_name__iexact="Pesapal",
            is_active=True,
        ).first()

        if config:
            logger.info(
                f"✅ Pesapal config found | ID={config.id} | "
                f"Gateway={config.gateway_name}"
            )
            return config

        logger.error(
            "❌ No active Pesapal configuration found. "
            f"Available: "
            f"{list(PaymentConfiguration.objects.values('id', 'gateway_name', 'is_active'))}"
        )
        return None
    except Exception as e:
        logger.error(f"❌ Pesapal config error: {e}", exc_info=True)
        return None


def ensure_db_connection():
    try:
        close_old_connections()
        db_connection.ensure_connection()
        with db_connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except (OperationalError, InterfaceError) as e:
        logger.warning(f"⚠️ DB connection error: {e}")
        try:
            db_connection.close()
            db_connection.ensure_connection()
            with db_connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            logger.info("✅ DB reconnected")
            return True
        except Exception as reconnect_error:
            logger.error(
                f"❌ DB reconnect failed: {reconnect_error}"
            )
            return False
    except Exception as e:
        logger.error(f"❌ Unexpected DB error: {e}")
        return False


def get_frontend_url(path):
    frontend_url = getattr(settings, "FRONTEND_URL", None)
    if not frontend_url:
        raise ValueError(
            "FRONTEND_URL is not configured in Django settings."
        )
    frontend_url = frontend_url.rstrip("/")
    return f"{frontend_url}/{path.lstrip('/')}"


# ============================================================
# FINALIZE
# ============================================================

def _finalize_subscription_payment(sub_payment):
    """
    Success handler for a SubscriptionPayment. Idempotent.

    - Marks the payment completed.
    - Extends the subscription plan + end_date.
    - LINKS the payment back on the subscription
      (subscription.payment = sub_payment) so that
      `subscription.status` reads from the payment.
    """
    # 1. Flip the payment to completed
    if sub_payment.status != "completed":
        sub_payment.status = "completed"
        sub_payment.paid_at = timezone.now()
        sub_payment.save(update_fields=["status", "paid_at"])

    subscription = sub_payment.subscription
    plan = sub_payment.plan

    if subscription and plan:
        base = (
            subscription.end_date
            if subscription.end_date
            and subscription.end_date > timezone.now()
            else timezone.now()
        )
        subscription.plan = plan
        subscription.end_date = base + timedelta(days=30)

        # ----------------------------------------------------
        # CRITICAL: link the payment back on the subscription
        # so `subscription.status` and `subscription.is_paid`
        # derive from the completed payment.
        # ----------------------------------------------------
        subscription.payment = sub_payment
        subscription.save(
            update_fields=[
                "plan",
                "end_date",
                "payment",
                "updated_at",
            ]
        )

        logger.info(
            f"✅ Subscription {subscription.id} linked to "
            f"SubscriptionPayment {sub_payment.id} "
            f"(status={sub_payment.status})"
        )

    notify(
        receiver=sub_payment.user,
        sender=None,
        category=Notification.CATEGORY_PAYMENT,
        title=(
            f"'{plan.name}' Plan Activated 🎉"
            if plan else "Plan Activated 🎉"
        ),
        message=(
            f"Your payment of KES {sub_payment.amount} was successful. "
            f"You are now on the '{plan.name}' plan."
        ),
    )

    superadmin = get_superadmin()
    if superadmin and plan:
        notify(
            receiver=superadmin,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            title="💰 New Plan Subscription Payment",
            message=(
                f"{sub_payment.user.full_name} subscribed to the "
                f"'{plan.name}' plan for KES {sub_payment.amount}."
            ),
        )


# ============================================================
# INITIATE PLAN PAYMENT
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_plan_payment(request):
    """
    Body:
        plan_id       (int)  — required
        phone_number  (str)  — required
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
                "error_code": "DB_CONNECTION_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    user = request.user

    serializer = PlanPaymentInitiationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Validation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    plan_id = serializer.validated_data["plan_id"]
    phone_number = serializer.validated_data["phone_number"]

    eligible, message, data = (
        SuperAdminValidator.check_payment_eligibility()
    )
    if not eligible:
        logger.error(f"❌ Plan payment blocked: {message}")
        return Response(
            {
                "success": False,
                "message": (
                    "Payment service is currently unavailable. "
                    "Please try again later."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        plan = Plan.objects.get(id=plan_id, is_active=True)
    except Plan.DoesNotExist:
        logger.warning(f"Plan not found or inactive: {plan_id}")
        return Response(
            {"success": False, "message": "Plan not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    subscription = getattr(user, "subscription", None)
    if not subscription:
        return Response(
            {
                "success": False,
                "message": (
                    "You don't have a subscription yet. "
                    "Please contact support."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_free_target = (plan.slug or "").lower() == "free"
    if is_free_target and subscription.is_active:
        current_is_free = (
            (subscription.plan.slug or "").lower() == "free"
        )
        if not current_is_free:
            return Response(
                {
                    "success": False,
                    "message": (
                        "You cannot downgrade to the Free plan. "
                        "Please wait for your current plan to expire."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    payment_config = get_pesapal_configuration()
    if not payment_config:
        return Response(
            {
                "success": False,
                "message": "Payment service unavailable.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    merchant_reference = f"PLAN-{uuid.uuid4().hex[:12].upper()}"

    # --------------------------------------------------------
    # Create the SubscriptionPayment
    # --------------------------------------------------------
    try:
        sub_payment = SubscriptionPayment.objects.create(
            subscription=subscription,
            user=user,
            plan=plan,
            merchant_reference=merchant_reference,
            amount=plan.price,
            phone_number=phone_number,
            status="pending",
        )
    except Exception:
        logger.exception("❌ Failed to create subscription payment.")
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # Link the payment on the subscription immediately so
    # `subscription.status` shows "pending" while awaiting PIN
    # --------------------------------------------------------
    if subscription.payment_id != sub_payment.id:
        subscription.payment = sub_payment
        subscription.save(update_fields=["payment"])

    notify(
        receiver=user,
        sender=None,
        category=Notification.CATEGORY_PAYMENT,
        title="Plan Payment Initiated ⏳",
        message=(
            f"Your payment of KES {sub_payment.amount} to subscribe "
            f"to the '{plan.name}' plan has been initiated. "
            f"Reference: {sub_payment.merchant_reference}."
        ),
    )

    # --------------------------------------------------------
    # Submit to Pesapal — same service used by the payments app
    # --------------------------------------------------------
    try:
        pesapal_response = submit_order(
            payment=sub_payment,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
        )
    except Exception:
        sub_payment.status = "failed"
        sub_payment.save(update_fields=["status"])

        notify(
            receiver=user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            title="Plan Payment Failed ❌",
            message=(
                f"Your payment of KES {sub_payment.amount} for the "
                f"'{plan.name}' plan could not be initiated. "
                "Please try again."
            ),
        )

        logger.exception("❌ Pesapal submit order error (plan).")
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if (
        not pesapal_response
        or pesapal_response.get("status") != "200"
    ):
        sub_payment.status = "failed"
        sub_payment.save(update_fields=["status"])

        notify(
            receiver=user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            title="Plan Payment Failed ❌",
            message=(
                f"Your payment of KES {sub_payment.amount} for the "
                f"'{plan.name}' plan failed to start. "
                "Please try again."
            ),
        )

        logger.error(
            f"❌ Pesapal response error (plan): {pesapal_response}"
        )
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    sub_payment.order_tracking_id = pesapal_response.get(
        "order_tracking_id"
    )
    sub_payment.save(update_fields=["order_tracking_id"])

    logger.info(
        "✅ Plan payment initiated | "
        f"SubscriptionPayment ID={sub_payment.id} | "
        f"Plan ID={plan.id} | "
        f"Tracking ID={sub_payment.order_tracking_id}"
    )

    return Response(
        {
            "success": True,
            "message": "Payment initiated.",
            "payment": SubscriptionPaymentSerializer(
                sub_payment
            ).data,
            "plan": {
                "id": plan.id,
                "name": plan.name,
                "slug": plan.slug,
                "price": str(plan.price),
            },
            "redirect_url": pesapal_response.get("redirect_url"),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RECONCILE / LIVE STATUS POLL
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reconcile_subscription_payment(request, payment_id):
    """
    Polled by the frontend after a plan payment is initiated.
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
                "error_code": "DB_CONNECTION_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    sub_payment = (
        SubscriptionPayment.objects
        .select_related(
            "subscription",
            "subscription__plan",
            "plan",
            "user",
        )
        .filter(id=payment_id, user=request.user)
        .first()
    )

    if not sub_payment:
        return Response(
            {"success": False, "message": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if (
        sub_payment.order_tracking_id
        and not sub_payment.is_terminal
    ):
        try:
            verification = get_transaction_status(
                sub_payment.order_tracking_id
            )
            live = verification.get("payment_status_description")

            status_map = {
                "Completed": "completed",
                "Failed": "failed",
                "Cancelled": "cancelled",
                "Pending": "pending",
            }
            new_status = status_map.get(live)

            if new_status and new_status != sub_payment.status:
                logger.info(
                    f"🔄 reconcile: {sub_payment.merchant_reference} "
                    f"{sub_payment.status} → {new_status}"
                )

                if new_status == "completed":
                    _finalize_subscription_payment(sub_payment)
                else:
                    sub_payment.status = new_status
                    sub_payment.save(update_fields=["status"])
        except Exception as e:
            logger.warning(
                f"⚠️ reconcile: {sub_payment.merchant_reference}: {e}"
            )

    sub_payment.refresh_from_db()
    subscription = sub_payment.subscription
    if subscription:
        subscription.refresh_from_db()

    serializer = ReconcileSubscriptionPaymentSerializer(
        {
            "payment": sub_payment,
            "subscription": subscription,
            "is_terminal": sub_payment.is_terminal,
        }
    )

    return Response(
        {"success": True, **serializer.data},
        status=status.HTTP_200_OK,
    )


# ============================================================
# GET ONE PAYMENT
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_subscription_payment_status(request, payment_id):
    """
    Return a single SubscriptionPayment for the current user.
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    sub_payment = (
        SubscriptionPayment.objects
        .select_related("subscription", "plan", "user")
        .filter(id=payment_id, user=request.user)
        .first()
    )

    if not sub_payment:
        return Response(
            {"success": False, "message": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "payment": SubscriptionPaymentSerializer(
                sub_payment
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# IPN CALLBACK
# ============================================================

@api_view(["GET", "POST"])
def ipn_callback(request):
    """
    Handle Pesapal IPN for SubscriptionPayment rows.
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = (
        request.query_params
        if request.method == "GET"
        else request.data
    )

    logger.info("=" * 60)
    logger.info("SUBSCRIPTION PAYMENT IPN")
    logger.info(data)
    logger.info("=" * 60)

    order_tracking_id = (
        data.get("OrderTrackingId")
        or data.get("orderTrackingId")
        or data.get("order_tracking_id")
    )

    if not order_tracking_id:
        return Response(
            {"success": False, "message": "Invalid IPN."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    sub_payment = (
        SubscriptionPayment.objects
        .select_related("subscription", "plan", "user")
        .filter(order_tracking_id=order_tracking_id)
        .first()
    )

    if not sub_payment:
        logger.error(
            f"❌ SubscriptionPayment not found for "
            f"tracking ID: {order_tracking_id}"
        )
        return Response(
            {"success": False, "message": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        verification = get_transaction_status(order_tracking_id)
        status_desc = verification.get("payment_status_description")

        logger.info(f"Verified status: {status_desc}")

        if status_desc == "Completed":
            _finalize_subscription_payment(sub_payment)
            return Response(
                {
                    "success": True,
                    "message": "IPN processed.",
                    "payment_status": sub_payment.status,
                },
                status=status.HTTP_200_OK,
            )

        if status_desc == "Failed":
            sub_payment.status = "failed"
            sub_payment.save(update_fields=["status"])

            notify(
                receiver=sub_payment.user,
                sender=None,
                category=Notification.CATEGORY_PAYMENT,
                title="Plan Payment Failed ❌",
                message=(
                    f"Your payment of KES {sub_payment.amount} for "
                    f"the '{sub_payment.plan.name}' plan failed."
                ),
            )

            return Response(
                {"success": True, "message": "IPN processed."},
                status=status.HTTP_200_OK,
            )

        if status_desc == "Cancelled":
            sub_payment.status = "cancelled"
            sub_payment.save(update_fields=["status"])
            return Response(
                {"success": True, "message": "IPN processed."},
                status=status.HTTP_200_OK,
            )

        # Still pending
        sub_payment.status = "pending"
        sub_payment.save(update_fields=["status"])
        return Response(
            {"success": True, "message": "IPN processed."},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(
            f"❌ SubscriptionPayment IPN error: {e}",
            exc_info=True,
        )
        return Response(
            {"success": False, "message": "IPN failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# PAYMENT SUCCESS (browser redirect)
# ============================================================

@api_view(["GET"])
def payment_success(request):
    """
    Handle Pesapal browser redirect for SubscriptionPayment.
    """

    if not ensure_db_connection():
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    order_tracking_id = request.query_params.get(
        "OrderTrackingId"
    )
    merchant_reference = request.query_params.get(
        "OrderMerchantReference"
    )

    if not order_tracking_id:
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    sub_payment = (
        SubscriptionPayment.objects
        .select_related("subscription", "plan", "user")
        .filter(order_tracking_id=order_tracking_id)
        .first()
    )

    if not sub_payment:
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    try:
        verification = get_transaction_status(order_tracking_id)
        status_desc = verification.get("payment_status_description")

        if status_desc == "Completed":
            _finalize_subscription_payment(sub_payment)

        frontend_url = get_frontend_url("/payment-success")
        redirect_url = (
            f"{frontend_url}"
            f"?order_tracking_id={order_tracking_id}"
            f"&merchant_reference="
            f"{merchant_reference or sub_payment.merchant_reference}"
            f"&payment_status={sub_payment.status}"
            f"&amount={sub_payment.amount}"
            f"&payment_type=plan"
            f"&plan_id={sub_payment.plan_id}"
            f"&payment_id={sub_payment.id}"
        )
        return redirect(redirect_url)

    except Exception as e:
        logger.error(
            f"❌ SubscriptionPayment success error: {e}",
            exc_info=True,
        )
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )


# ============================================================
# PAYMENT FAILURE (browser redirect)
# ============================================================

@api_view(["GET"])
def payment_failure(request):
    """
    Handle Pesapal browser redirect when the plan payment fails.
    """

    if not ensure_db_connection():
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    order_tracking_id = request.query_params.get(
        "OrderTrackingId"
    )
    merchant_reference = request.query_params.get(
        "OrderMerchantReference"
    )

    if order_tracking_id:
        sub_payment = (
            SubscriptionPayment.objects
            .select_related("plan", "user")
            .filter(order_tracking_id=order_tracking_id)
            .first()
        )

        if sub_payment:
            sub_payment.status = "failed"
            sub_payment.save(update_fields=["status"])

            notify(
                receiver=sub_payment.user,
                sender=None,
                category=Notification.CATEGORY_PAYMENT,
                title="Plan Payment Failed ❌",
                message=(
                    f"Your payment of KES {sub_payment.amount} for "
                    f"the '{sub_payment.plan.name}' plan failed."
                ),
            )

    frontend_url = get_frontend_url("/payment-failure")
    redirect_url = (
        f"{frontend_url}"
        f"?order_tracking_id={order_tracking_id or ''}"
        f"&merchant_reference={merchant_reference or ''}"
        "&message=Payment+was+not+completed"
    )
    return redirect(redirect_url)


# ============================================================
# REGISTER PESAPAL IPN
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def register_ipn(request):
    """
    Register IPN URL with Pesapal (uses the same service).
    """

    try:
        response = register_ipn_url()

        if not response or response.get("status") != "200":
            logger.error(
                f"❌ Pesapal IPN registration failed: {response}"
            )
            return Response(
                {
                    "success": False,
                    "message": (
                        "IPN registration failed. Please try again."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        config = (
            PaymentConfiguration.objects
            .filter(gateway_name__iexact="Pesapal")
            .first()
        )

        if config:
            config.ipn_id = response.get("ipn_id")
            config.ipn_url = response.get("url")
            config.is_active = True
            config.save()
            logger.info(
                f"✅ Pesapal configuration updated | ID={config.id}"
            )
        else:
            config = PaymentConfiguration.objects.create(
                gateway_name="Pesapal",
                ipn_id=response.get("ipn_id"),
                ipn_url=response.get("url"),
                is_active=True,
            )
            logger.info(
                f"✅ Pesapal configuration created | ID={config.id}"
            )

        return Response(
            {
                "success": True,
                "message": "IPN registered successfully.",
                "data": {
                    "id": config.id,
                    "gateway_name": config.gateway_name,
                    "ipn_id": config.ipn_id,
                    "ipn_url": config.ipn_url,
                    "is_active": config.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(
            f"❌ IPN registration error: {e}",
            exc_info=True,
        )
        return Response(
            {
                "success": False,
                "message": "IPN registration failed.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )