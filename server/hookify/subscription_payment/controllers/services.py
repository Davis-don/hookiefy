# subscription_payment/controllers/services.py
import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from ..models import SubscriptionPayment
from .get_transaction_status import get_transaction_status


logger = logging.getLogger(__name__)


# ============================================================
# ACTIVE PAYMENT CONFIGURATION
# ============================================================

def get_active_pesapal_config():
    """
    Return the active PaymentConfiguration row for PesaPal.

    Raises if none exists, or if the row has no ipn_id,
    so the caller can surface a clear error.
    """

    from paymentconfigurations.models import PaymentConfiguration

    config = (
        PaymentConfiguration.objects
        .filter(gateway_name="pesapal", is_active=True)
        .first()
    )

    if not config:
        raise Exception(
            "No active PesaPal payment configuration found. "
            "Add one in the admin under Payment Configurations."
        )

    if not config.ipn_id:
        raise Exception(
            "PesaPal PaymentConfiguration exists but has no "
            "ipn_id. Register the IPN URL first and save the "
            "returned ipn_id on the configuration."
        )

    return config


# ============================================================
# RECORD PENDING PAYMENT
# ============================================================

def record_pending_payment(
    *,
    subscription,
    plan,
    merchant_reference,
    order_tracking_id,
    amount,
    phone_number=None,
    email=None,
    gateway="pesapal",
    submit_response=None,
):
    """
    Create a SubscriptionPayment row with status='pending'.

    Called immediately after the gateway accepts the order.
    Raises on failure — the caller must NOT return the
    redirect URL if this raises.
    """

    payment = SubscriptionPayment.objects.create(
        subscription=subscription,
        plan=plan,
        merchant_reference=merchant_reference,
        order_tracking_id=order_tracking_id,
        amount=amount,
        currency="KES",
        phone_number=phone_number,
        email=email,
        gateway=gateway,
        status="pending",
        submit_response=submit_response,
    )

    logger.info(
        "Pending payment recorded | ref=%s | tracking=%s | "
        "subscription_id=%s | plan=%s | amount=%s",
        payment.merchant_reference,
        payment.order_tracking_id,
        subscription.id,
        plan.name if plan else "—",
        payment.amount,
    )

    return payment


# ============================================================
# SYNC PAYMENT FROM PESAPAL
# ============================================================

def sync_payment_from_pesapal(merchant_reference):
    """
    Ask PesaPal for the latest status of `merchant_reference`
    and update the local SubscriptionPayment row.

    If PesaPal says the payment is completed, activate the
    subscription too.

    Returns the PesaPal response dict.
    """

    payment = (
        SubscriptionPayment.objects
        .select_related(
            "subscription",
            "subscription__plan",
            "subscription__user",
            "plan",
        )
        .filter(merchant_reference=merchant_reference)
        .first()
    )

    if not payment:
        raise Exception(
            f"No payment with reference {merchant_reference}"
        )

    # Already terminal — return cached.
    if payment.status in (
        "completed", "failed", "reversed", "invalid", "cancelled"
    ):
        return {
            "is_completed": payment.status == "completed",
            "status_code": None,
            "merchant_reference": merchant_reference,
            "cached": True,
        }

    if not payment.order_tracking_id:
        raise Exception(
            "Payment has no order_tracking_id — cannot sync."
        )

    data = get_transaction_status(payment.order_tracking_id)

    with transaction.atomic():

        # ----------------------------------------------------
        # COMPLETED
        # ----------------------------------------------------
        if data.get("is_completed"):

            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.confirmation_code = data.get("confirmation_code")
            payment.payment_method = data.get("payment_method")
            payment.payment_account = data.get("payment_account")
            payment.currency = data.get("currency") or payment.currency
            payment.status_response = data
            payment.save(
                update_fields=[
                    "status",
                    "paid_at",
                    "confirmation_code",
                    "payment_method",
                    "payment_account",
                    "currency",
                    "status_response",
                    "updated_at",
                ]
            )

            activate_subscription(payment)

        # ----------------------------------------------------
        # FAILED / REVERSED / INVALID
        # ----------------------------------------------------
        elif data.get("status_code") in (0, 2, 3):

            new_status = {
                0: "invalid",
                2: "failed",
                3: "reversed",
            }[data["status_code"]]

            if payment.status != new_status:
                payment.status = new_status
                payment.status_response = data
                payment.error_message = data.get("description")
                payment.save(
                    update_fields=[
                        "status",
                        "status_response",
                        "error_message",
                        "updated_at",
                    ]
                )

    return data


# ============================================================
# ACTIVATE SUBSCRIPTION
# ============================================================

def activate_subscription(payment):
    """
    On a completed payment:
      - apply the paid plan to the user's Subscription
      - refresh the billing window:
          * renewal of SAME plan → stack
          * plan change / expired → reset from now
      - persist changes
    """

    sub = payment.subscription

    if not sub:
        logger.warning(
            "Payment %s completed but subscription is missing.",
            payment.merchant_reference,
        )
        return

    purchased_plan = payment.plan or sub.plan

    if not purchased_plan:
        logger.warning(
            "Payment %s completed but no plan to apply.",
            payment.merchant_reference,
        )
        return

    now = timezone.now()
    previous_plan_id = sub.plan_id
    is_free = (purchased_plan.name or "").lower() == "free"

    sub.plan = purchased_plan

    if not is_free:

        is_renewal = previous_plan_id == purchased_plan.id

        if is_renewal and sub.end_date and sub.end_date > now:
            sub.end_date = sub.end_date + timedelta(days=30)
        else:
            sub.start_date = now
            sub.end_date = now + timedelta(days=30)

    sub.save(
        update_fields=[
            "plan",
            "start_date",
            "end_date",
            "updated_at",
        ]
    )

    logger.info(
        "Subscription activated | sub_id=%s | user=%s | "
        "plan=%s | start=%s | end=%s | renewal=%s",
        sub.id,
        sub.user.email,
        purchased_plan.name,
        sub.start_date,
        sub.end_date,
        previous_plan_id == purchased_plan.id,
    )