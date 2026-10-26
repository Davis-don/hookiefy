# product_payment/controllers/services.py

import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import F
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
    town=None,
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

    `town` is the only client-supplied field — the delivery
    destination frozen at checkout. It's read back by
    `_create_delivery_for_payment` when the payment completes.
    """
    payment = ProductPayment.objects.create(
        user=user,
        product=product,
        business=product.business if product else None,
        quantity=quantity,
        town=town,
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
        "user=%s | product=%s | town=%s | amount=%s",
        payment.merchant_reference,
        payment.order_tracking_id,
        user.email if user else None,
        product.name if product else "—",
        payment.town,
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

        town_hint = (
            f" It will be delivered to {payment.town}."
            if payment.town else ""
        )

        notify(
            recipient=recipient,
            title="Payment received",
            body=(
                f"We've received your payment of "
                f"{payment.currency} {payment.amount} for "
                f"{product_name}.{town_hint} Your order is confirmed."
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
                "town": payment.town,
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

    On a completed payment (all inside one atomic block):
        - marks the payment completed
        - decrements product stock
        - creates the Deliveries row
        - notifies the seller
        - credits the SystemBalance

    Any failure in the block rolls everything back — a
    completed payment can never be persisted without the
    stock decrement, delivery, and balance reflecting it.

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

            # ── Decrement stock + notify seller ───────────
            _mark_product_purchased(payment)

            # ── Create the delivery record ────────────────
            _create_delivery_for_payment(payment)

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
      whole atomic block (payment status change, stock
      decrement, delivery creation, purchase confirmation).
      A payment row can never be marked completed without the
      platform balance reflecting it.
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
# Product-side equivalent of activate_subscription(). Runs
# inside sync_product_payment_from_pesapal's atomic block, so:
#
#   • a successful stock decrement + seller notification is
#     only committed if SystemBalance credit also succeeds;
#   • a failure in any of these rolls the payment back to
#     `pending`, letting the IPN retry or the user re-sync.
# ============================================================

def _mark_product_purchased(payment):
    """
    Hook invoked when a ProductPayment transitions to
    `completed`.

    Runs inside the caller's transaction.atomic() block:

      1. Decrements Products.quantity atomically — using F()
         arithmetic so concurrent completions never lose
         updates, plus a clamp-to-zero for the rare race
         where two payments both passed the pre-check.
      2. Notifies the seller that they have a sale.

    A failure in either step raises, which rolls back the
    whole block — payment stays `pending`, stock is unchanged,
    SystemBalance is unchanged.
    """
    from products.models import Products

    business = payment.business
    product = payment.product

    if not business:
        logger.warning(
            "ProductPayment %s completed but no business attached.",
            payment.merchant_reference,
        )
        return

    # ── 1. Decrement stock atomically ─────────────────────
    #
    # Using Products.objects.filter(...).update(...) rather
    # than loading, subtracting, and saving:
    #
    #   • avoids the read-modify-write race — two purchases
    #     completing at the same time each subtract from the
    #     live DB value, not from a stale in-memory copy;
    #   • doesn't trigger ProductImage.save() side-effects
    #     or run any model save() hooks.
    #
    # Then clamp to zero for the race where quantity started
    # at 1 and two buyers both got through the pre-check.
    # The second buyer's payment still succeeds — we never
    # reject a real payment to protect inventory — but stock
    # never goes negative.
    #
    if product is not None:
        Products.objects.filter(id=product.id).update(
            quantity=F("quantity") - payment.quantity
        )
        Products.objects.filter(
            id=product.id,
            quantity__lt=0,
        ).update(quantity=0)

        logger.info(
            "Stock decremented | ref=%s | product_id=%s | "
            "sold=%s | remaining=%s",
            payment.merchant_reference,
            product.id,
            payment.quantity,
            Products.objects
            .filter(id=product.id)
            .values_list("quantity", flat=True)
            .first(),
        )

    # ── 2. Notify the seller ──────────────────────────────
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


# ============================================================
# CREATE DELIVERY FOR PAYMENT
# ============================================================
#
# Only runs when the payment transitions to `completed`.
# Creates a Deliveries row representing the physical handoff
# of the purchased product to the buyer.
#
# Everything on the Deliveries row is derived from the
# ProductPayment row — no fresh user input is consulted:
#
#   payment      ← payment               (1-to-1 link)
#   client       ← payment.user          (the buyer)
#   product      ← payment.product
#   quantity     ← 1                     (one physical handoff)
#   town         ← payment.town          (frozen at checkout)
#   delivered_to ← payment.user          (default recipient)
#   delivered_by ← None                  (unassigned; courier fills)
#   status       ← "pending"             (model default)
# ============================================================

def _create_delivery_for_payment(payment):
    """
    Create a Deliveries row for a completed product payment.

    Two-layer protection:

      1. Runtime guard — refuses to run unless the payment is
         genuinely completed. Closes the door on a future
         backfill script, test fixture, or admin action that
         might try to call this helper on a non-completed
         payment.

      2. DB constraint — the OneToOneField on
         Deliveries.payment means a duplicate insert raises
         IntegrityError, which this function catches and
         treats as "already exists". Safe to call from a
         retried IPN where PesaPal fires the notification
         twice.
    """
    from django.db import IntegrityError
    from deliveries.models import Deliveries

    # ── 1. Runtime guard: payment must be completed ───────
    if payment.status != payment.STATUS_COMPLETED:
        logger.warning(
            "Refusing to create delivery for non-completed "
            "payment | ref=%s | status=%s",
            payment.merchant_reference,
            payment.status,
        )
        return None

    # ── 2. Product must still exist ───────────────────────
    if payment.product_id is None:
        logger.warning(
            "Skipping delivery creation for ref=%s — product "
            "row is missing (was it deleted?).",
            payment.merchant_reference,
        )
        return None

    # ── 3. Derive the delivery destination ────────────────
    town = (payment.town or "").strip()
    if not town and payment.user_id:
        # Fallback for very old payments created before the
        # `town` field existed. Prefer the user's profile
        # town if available, otherwise there's nowhere to
        # deliver.
        town = (
            getattr(payment.user, "town", None)
            or getattr(payment.user, "city_town", None)
            or ""
        ).strip()

    if not town:
        logger.warning(
            "Skipping delivery creation for ref=%s — no town "
            "on payment row and none on user profile.",
            payment.merchant_reference,
        )
        return None

    # ── 4. Create — idempotent against retried IPNs ───────
    try:
        delivery = Deliveries.objects.create(
            payment=payment,
            client=payment.user,
            product=payment.product,
            quantity=1,
            town=town,
            delivered_by=None,
            delivered_to=payment.user,
        )
    except IntegrityError:
        # A delivery already exists for this payment.
        delivery = Deliveries.objects.get(payment=payment)
        logger.info(
            "Delivery already exists for ref=%s | delivery_id=%s",
            payment.merchant_reference,
            delivery.id,
        )
        return delivery

    logger.info(
        "Delivery created from product payment | ref=%s | "
        "delivery_id=%s | product_id=%s | town=%s | client=%s",
        payment.merchant_reference,
        delivery.id,
        payment.product_id,
        delivery.town,
        payment.user.email if payment.user_id else "—",
    )

    return delivery