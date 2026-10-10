# subscription_payment/controllers/services.py

import logging
from datetime import timedelta

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

    # ── Notify the user that the payment is in progress ──
    _notify_payment_pending(payment)

    return payment


# ============================================================
# NOTIFICATION HELPERS
# ============================================================
#
# All notification calls are wrapped so a failure here can
# never break the payment flow itself. The payment state is
# the source of truth; notifications are best-effort.
# ============================================================

def _payment_recipient(payment):
    """
    Figure out who should receive notifications for this
    payment. Preference order:
        1. The explicit `user` FK on the payment.
        2. The owning user of the linked subscription.
    Returns None when neither is available.
    """
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
                "No recipient for pending-payment notification "
                "| ref=%s",
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
            "Failed to send pending-payment notification "
            "| ref=%s",
            payment.merchant_reference,
        )


def _notify_payment_completed(payment):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            return

        plan_name = payment.plan.plan_name if payment.plan else "your plan"

        # Read the subscription's end date so the notification
        # can tell the user exactly when the new cycle runs out.
        end_hint = ""
        if (
            payment.subscription_id
            and payment.subscription.end_date
        ):
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
            "Failed to send payment-completed notification "
            "| ref=%s",
            payment.merchant_reference,
        )


def _notify_payment_failed(payment, terminal_status):
    """
    `terminal_status` is one of: failed, reversed, invalid,
    cancelled.
    """
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            return

        plan_name = payment.plan.plan_name if payment.plan else "your plan"

        # Copy per status so the message reads naturally.
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
            "cancelled": (
                "Your payment was cancelled."
            ),
        }
        body_lead = copy.get(
            terminal_status,
            "Your payment did not go through.",
        )

        # If the gateway gave a human-readable reason, append it.
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
            "Failed to send payment-failed notification "
            "| ref=%s",
            payment.merchant_reference,
        )


# ============================================================
# SYNC PAYMENT FROM PESAPAL
# ============================================================

def sync_payment_from_pesapal(merchant_reference):
    """
    Ask PesaPal for the latest status of `merchant_reference`
    and update the local SubscriptionPayment row.

    If PesaPal says the payment is completed, activate the
    subscription too and send a success notification.

    If PesaPal reports a terminal failure, send a failure
    notification.

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

    # Track the transition so the notification fires only
    # when we actually moved the row to a new state.
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
    # We do this after commit so a notification-creation
    # error can't roll back a real payment state change.
    if became_completed:
        _notify_payment_completed(payment)

    elif became_failed_status:
        _notify_payment_failed(payment, became_failed_status)

    return data


# ============================================================
# ACTIVATE SUBSCRIPTION
# ============================================================

def activate_subscription(payment):
    """
    On a completed payment:
      - apply the paid plan to the user's Subscription
      - refresh the billing window:
          * renewal of SAME plan → stack 30 days
          * plan change / expired → reset from now
      - mark the subscription as ACTIVE
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
    is_free = purchased_plan.is_free

    sub.plan = purchased_plan

    if not is_free:
        is_renewal = previous_plan_id == purchased_plan.id

        if is_renewal and sub.end_date and sub.end_date > now:
            sub.end_date = sub.end_date + timedelta(days=30)
        else:
            sub.start_date = now
            sub.end_date = now + timedelta(days=30)

    # A paid subscription should be marked active once payment
    # succeeds — otherwise a row created in 'pending' during
    # initiate/ stays pending forever.
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