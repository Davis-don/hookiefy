# subscription_payment/controllers/services.py

import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.services import notify

from ..models import SubscriptionPayment
from .get_transaction_status import get_transaction_status


logger = logging.getLogger(__name__)


# ============================================================
# ACTIVE PAYMENT CONFIGURATION
# ============================================================

def get_active_pesapal_config():
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
    payment = SubscriptionPayment.objects.create(
        subscription=subscription,
        plan=plan,
        user=subscription.user if subscription else None,
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
        subscription.id if subscription else None,
        plan.plan_name if plan else "—",
        payment.amount,
    )

    _notify_payment_pending(payment)

    return payment


# ============================================================
# NOTIFICATION HELPERS
# ============================================================

def _payment_recipient(payment):
    if payment.user_id:
        return payment.user
    if payment.subscription_id and payment.subscription.user_id:
        return payment.subscription.user
    return None


def _notify_payment_pending(payment):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            logger.warning(
                "No recipient for pending-payment notification | ref=%s",
                payment.merchant_reference,
            )
            return

        plan_name = payment.plan.plan_name if payment.plan else "your plan"

        notify(
            recipient=recipient,
            title="Payment in progress",
            body=(
                f"We've started processing your payment of "
                f"{payment.currency} {payment.amount} for "
                f"{plan_name}. You'll receive another notification "
                f"the moment the gateway confirms it."
            ),
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_INFO,
            action_label="View billing",
            action_url="/useraccount/billing",
            metadata={
                "payment_id": str(payment.id),
                "merchant_reference": payment.merchant_reference,
                "plan_slug": payment.plan.slug if payment.plan else None,
                "status": payment.status,
                "amount": str(payment.amount),
                "currency": payment.currency,
            },
            expires_in_days=7,
        )
    except Exception:
        logger.exception(
            "Failed to send pending-payment notification | ref=%s",
            payment.merchant_reference,
        )


def _notify_payment_completed(payment):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            return

        plan_name = payment.plan.plan_name if payment.plan else "your plan"

        end_hint = ""
        if payment.subscription_id and payment.subscription.end_date:
            end_hint = (
                " Your plan is active until "
                f"{payment.subscription.end_date.strftime('%d %b %Y')}."
            )

        notify(
            recipient=recipient,
            title="Payment received",
            body=(
                f"We've received your payment of "
                f"{payment.currency} {payment.amount}. "
                f"You're now subscribed to {plan_name}.{end_hint}"
            ),
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_SUCCESS,
            action_label="View billing",
            action_url="/useraccount/billing",
            metadata={
                "payment_id": str(payment.id),
                "merchant_reference": payment.merchant_reference,
                "confirmation_code": payment.confirmation_code,
                "payment_method": payment.payment_method,
                "plan_slug": payment.plan.slug if payment.plan else None,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
            },
        )
    except Exception:
        logger.exception(
            "Failed to send payment-completed notification | ref=%s",
            payment.merchant_reference,
        )


def _notify_payment_failed(payment, terminal_status):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            return

        plan_name = payment.plan.plan_name if payment.plan else "your plan"

        copy = {
            "failed": (
                "Your payment could not be completed. "
                "You have not been charged."
            ),
            "reversed": (
                "Your payment was reversed by the gateway. "
                "The amount will be refunded to your account."
            ),
            "invalid": (
                "The gateway flagged this payment as invalid. "
                "Please try again with a different method."
            ),
            "cancelled": "Your payment was cancelled.",
        }
        body_lead = copy.get(
            terminal_status,
            "Your payment did not go through.",
        )

        if payment.error_message:
            body_lead = f"{body_lead} Reason: {payment.error_message}"

        notify(
            recipient=recipient,
            title="Payment did not complete",
            body=(
                f"{body_lead} "
                f"You can retry the {plan_name} subscription from "
                f"your billing page."
            ),
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_ERROR,
            action_label="Try again",
            action_url="/useraccount/billing",
            metadata={
                "payment_id": str(payment.id),
                "merchant_reference": payment.merchant_reference,
                "plan_slug": payment.plan.slug if payment.plan else None,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
                "error": payment.error_message,
            },
        )
    except Exception:
        logger.exception(
            "Failed to send payment-failed notification | ref=%s",
            payment.merchant_reference,
        )


# ============================================================
# SYNC PAYMENT FROM PESAPAL
# ============================================================

def sync_payment_from_pesapal(merchant_reference):
    """
    Ask PesaPal for the latest status of `merchant_reference`
    and update the local SubscriptionPayment row.

    On a completed payment:
      - marks the payment completed
      - activates the subscription
      - credits the SystemBalance (inside the same atomic block)

    On a terminal failure:
      - updates the payment status
      - sends a failure notification

    Returns the PesaPal response dict.
    """

    payment = (
        SubscriptionPayment.objects
        .select_related(
            "subscription",
            "subscription__plan",
            "subscription__user",
            "plan",
            "user",
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

    became_completed = False
    became_failed_status = None

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

            # ── Credit the platform balance in the same tx ──
            _credit_system_balance_for_payment(payment)

            became_completed = True

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
                became_failed_status = new_status

    # ── Notifications fire outside the transaction ────────
    if became_completed:
        _notify_payment_completed(payment)

    elif became_failed_status:
        _notify_payment_failed(payment, became_failed_status)

    return data


# ============================================================
# SYSTEM BALANCE CREDIT (runs inside the payment transaction)
# ============================================================

def _credit_system_balance_for_payment(payment):
    """
    Credit the platform's SystemBalance with the amount that
    just landed.

    - Ensures the singleton row exists (creates at 0.00 KES if
      missing).
    - Uses select_for_update so concurrent payments can't race.
    - If the credit fails, we RAISE — which rolls back the
      whole atomic block (payment status change + subscription
      activation). This keeps the accounting consistent: a
      payment row can never be marked completed without the
      platform balance reflecting it.
    """

    # Import inside the function to avoid a circular import at
    # module load time.
    from system_balance.services import credit_system_balance

    new_balance = credit_system_balance(
        payment.amount,
        reference=payment.merchant_reference,
    )

    logger.info(
        "SystemBalance credited after payment | ref=%s | "
        "amount=%s | new_balance=%s",
        payment.merchant_reference,
        payment.amount,
        new_balance,
    )


# ============================================================
# ACTIVATE SUBSCRIPTION
# ============================================================

def activate_subscription(payment):
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
    is_free = purchased_plan.is_free

    sub.plan = purchased_plan

    if not is_free:
        is_renewal = previous_plan_id == purchased_plan.id

        if is_renewal and sub.end_date and sub.end_date > now:
            sub.end_date = sub.end_date + timedelta(days=30)
        else:
            sub.start_date = now
            sub.end_date = now + timedelta(days=30)

    sub.status = "active"

    sub.save(
        update_fields=[
            "plan",
            "status",
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
        purchased_plan.plan_name,
        sub.start_date,
        sub.end_date,
        previous_plan_id == purchased_plan.id,
    )