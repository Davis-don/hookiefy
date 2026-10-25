# product_payment/controllers/services.py

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from notifications.models import Notification
from notifications.services import notify

from ..models import ProductPayment
from .get_transaction_status import get_transaction_status


logger = logging.getLogger(__name__)


# ============================================================
# ACTIVE PAYMENT CONFIGURATION
# ============================================================
#
# Same table as subscription payments — PesaPal credentials
# are per-gateway, not per-vertical. The single active
# `gateway_name="pesapal"` row is shared by both products and
# subscriptions, including its `ipn_id`.
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
    user,
    product,
    merchant_reference,
    order_tracking_id,
    amount,
    quantity=1,
    phone_number=None,
    email=None,
    gateway="pesapal",
    submit_response=None,
):
    """
    Persist a ProductPayment row in `pending` status.

    `product` is the Products instance being purchased. The
    owning business is derived from it so the row is
    denormalised for later accounting / payouts and doesn't
    depend on the product row surviving a future delete.
    """
    payment = ProductPayment.objects.create(
        user=user,
        product=product,
        business=product.business if product else None,
        quantity=quantity,
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
        "Pending product payment recorded | ref=%s | tracking=%s | "
        "user=%s | product=%s | amount=%s",
        payment.merchant_reference,
        payment.order_tracking_id,
        user.email if user else None,
        product.name if product else "—",
        payment.amount,
    )

    _notify_payment_pending(payment)

    return payment


# ============================================================
# NOTIFICATION HELPERS
# ============================================================

def _payment_recipient(payment):
    return payment.user if payment.user_id else None


def _notify_payment_pending(payment):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            logger.warning(
                "No recipient for pending product-payment notification | ref=%s",
                payment.merchant_reference,
            )
            return

        product_name = payment.product.name if payment.product else "your item"

        notify(
            recipient=recipient,
            title="Payment in progress",
            body=(
                f"We've started processing your payment of "
                f"{payment.currency} {payment.amount} for "
                f"{product_name}. You'll receive another notification "
                f"the moment the gateway confirms it."
            ),
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_INFO,
            action_label="View payment",
            action_url="/useraccount/payments",
            metadata={
                "payment_id": str(payment.id),
                "merchant_reference": payment.merchant_reference,
                "product_id": payment.product_id,
                "business_id": payment.business_id,
                "status": payment.status,
                "amount": str(payment.amount),
                "currency": payment.currency,
            },
            expires_in_days=7,
        )
    except Exception:
        logger.exception(
            "Failed to send pending product-payment notification | ref=%s",
            payment.merchant_reference,
        )


def _notify_payment_completed(payment):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            return

        product_name = payment.product.name if payment.product else "your item"

        notify(
            recipient=recipient,
            title="Payment received",
            body=(
                f"We've received your payment of "
                f"{payment.currency} {payment.amount} for "
                f"{product_name}. Your order is confirmed."
            ),
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_SUCCESS,
            action_label="View order",
            action_url="/useraccount/payments",
            metadata={
                "payment_id": str(payment.id),
                "merchant_reference": payment.merchant_reference,
                "confirmation_code": payment.confirmation_code,
                "payment_method": payment.payment_method,
                "product_id": payment.product_id,
                "business_id": payment.business_id,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
            },
        )
    except Exception:
        logger.exception(
            "Failed to send product-payment-completed notification | ref=%s",
            payment.merchant_reference,
        )


def _notify_payment_failed(payment, terminal_status):
    try:
        recipient = _payment_recipient(payment)
        if recipient is None:
            return

        product_name = payment.product.name if payment.product else "your item"

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
                f"You can retry purchasing {product_name} from "
                f"the product page."
            ),
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_ERROR,
            action_label="Try again",
            action_url="/useraccount/home",
            metadata={
                "payment_id": str(payment.id),
                "merchant_reference": payment.merchant_reference,
                "product_id": payment.product_id,
                "business_id": payment.business_id,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
                "error": payment.error_message,
            },
        )
    except Exception:
        logger.exception(
            "Failed to send product-payment-failed notification | ref=%s",
            payment.merchant_reference,
        )


# ============================================================
# SYNC PRODUCT PAYMENT FROM PESAPAL
# ============================================================

def sync_product_payment_from_pesapal(merchant_reference):
    """
    Ask PesaPal for the latest status of `merchant_reference`
    and update the local ProductPayment row.

    On a completed payment:
      - marks the payment completed
      - marks the purchase as fulfilled (notifies seller;
        extend via _mark_product_purchased for order rows,
        download tokens, shipping, etc.)
      - credits the SystemBalance (inside the same atomic
        block, so a completed payment can never be persisted
        without the balance reflecting it)

    On a terminal failure:
      - updates the payment status
      - sends a failure notification

    Returns the PesaPal response dict.
    """

    payment = (
        ProductPayment.objects
        .select_related(
            "user",
            "product",
            "business",
        )
        .filter(merchant_reference=merchant_reference)
        .first()
    )

    if not payment:
        raise Exception(
            f"No product payment with reference {merchant_reference}"
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
            "Product payment has no order_tracking_id — cannot sync."
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

            # ── The subscription equivalent of this line is
            #    activate_subscription(payment). For a one-off
            #    product purchase there's no subscription to
            #    flip; instead the seller is notified and any
            #    downstream fulfillment happens here.
            _mark_product_purchased(payment)

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
      whole atomic block (payment status change + purchase
      confirmation). A payment row can never be marked
      completed without the platform balance reflecting it.
    """

    from system_balance.services import credit_system_balance

    new_balance = credit_system_balance(
        payment.amount,
        reference=payment.merchant_reference,
    )

    logger.info(
        "SystemBalance credited after product payment | ref=%s | "
        "amount=%s | new_balance=%s",
        payment.merchant_reference,
        payment.amount,
        new_balance,
    )


# ============================================================
# MARK PRODUCT PURCHASED
# ============================================================
#
# Product-side equivalent of activate_subscription(). Whatever
# "granting the buyer access to the product" means in your
# domain goes here — e.g. creating a ProductOrder row,
# incrementing a sales counter, unlocking download links, or
# (as below) simply notifying the seller.
#
# Kept as a single named function so the parallel with
# `activate_subscription` is obvious and future fulfilment
# logic has exactly one home.
# ============================================================

def _mark_product_purchased(payment):
    """
    Hook invoked when a ProductPayment transitions to
    `completed`.

    Default behaviour: notify the seller they have a sale.
    Extend here when the domain grows (order rows, download
    tokens, shipping, digital delivery, etc.).
    """
    business = payment.business
    product = payment.product

    if not business:
        logger.warning(
            "ProductPayment %s completed but no business attached.",
            payment.merchant_reference,
        )
        return

    try:
        recipient = business.owner if business.owner_id else None
        if recipient is not None:
            notify(
                recipient=recipient,
                title="New sale",
                body=(
                    f"You sold {product.name if product else 'an item'} "
                    f"for {payment.currency} {payment.amount}."
                ),
                category=Notification.CATEGORY_PAYMENT,
                severity=Notification.SEVERITY_SUCCESS,
                action_label="View business",
                action_url="/useraccount/business",
                metadata={
                    "payment_id": str(payment.id),
                    "merchant_reference": payment.merchant_reference,
                    "product_id": payment.product_id,
                    "buyer_email": payment.email,
                    "amount": str(payment.amount),
                    "currency": payment.currency,
                },
            )
    except Exception:
        logger.exception(
            "Failed to notify seller for product payment | ref=%s",
            payment.merchant_reference,
        )

    logger.info(
        "Product purchased | ref=%s | product_id=%s | "
        "business_id=%s | buyer=%s | amount=%s",
        payment.merchant_reference,
        payment.product_id,
        payment.business_id,
        payment.email,
        payment.amount,
    )