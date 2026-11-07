# product_payment/controllers/services.py

import logging

from django.db import models, transaction
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
            logger.info(
                "Skipping payment-pending notification — no user "
                "account on payment | ref=%s | email=%s",
                payment.merchant_reference,
                payment.email or "—",
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
            logger.info(
                "Skipping payment-completed notification — no user "
                "account on payment | ref=%s | email=%s",
                payment.merchant_reference,
                payment.email or "—",
            )
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


def _notify_seller_of_sale(payment):
    """
    Notify the seller that a sale completed.

    Shared by the gateway completion path (via
    `_mark_product_purchased`) and the manual-payment path
    (via `complete_manual_payment`), so a manual payment
    produces exactly the same seller notification a
    gateway payment does.

    Best-effort: the caller is always inside a transaction,
    so a `notify()` hiccup must never roll back the payment
    row or the stock decrement.
    """
    business = payment.business
    if business is None or not business.owner_id:
        logger.info(
            "Skipping seller-sale notification — business has "
            "no owner | ref=%s | business_id=%s",
            payment.merchant_reference,
            payment.business_id,
        )
        return

    try:
        product_name = payment.product.name if payment.product else "an item"

        notify(
            recipient=business.owner,
            title="New sale",
            body=(
                f"You sold {product_name} "
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
        - creates the Deliveries row (with delivered_by =
          business owner)
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

            _mark_product_purchased(payment)
            _create_delivery_for_payment(payment)
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

    If the credit fails, we RAISE — which rolls back the whole
    atomic block. A payment row can never be marked completed
    without the platform balance reflecting it.
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
    _notify_seller_of_sale(payment)

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

def _create_delivery_for_payment(payment):
    """
    Create a Deliveries row for a completed product payment.

    Two-layer protection:

      1. Runtime guard — refuses to run unless the payment is
         genuinely completed.

      2. DB constraint — the OneToOneField on
         Deliveries.payment means a duplicate insert raises
         IntegrityError, which this function catches and
         treats as "already exists". Safe to call from a
         retried IPN.

    Defaults `delivered_by` to the business owner — the
    account that posted the product is the natural shipper.
    A dispatcher can reassign the courier later via
    `POST /deliveries/<id>/assign/` if someone else fulfills
    the order.
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

    # ── 4. Default courier = the business owner ───────────
    default_courier = None
    if (
        payment.business_id
        and payment.business is not None
        and payment.business.owner_id is not None
    ):
        default_courier = payment.business.owner

    # ── 5. Create — idempotent against retried IPNs ───────
    try:
        delivery = Deliveries.objects.create(
            payment=payment,
            client=payment.user,
            product=payment.product,
            quantity=1,
            town=town,
            delivered_by=default_courier,
            delivered_to=payment.user,
        )
    except IntegrityError:
        delivery = Deliveries.objects.get(payment=payment)
        logger.info(
            "Delivery already exists for ref=%s | delivery_id=%s",
            payment.merchant_reference,
            delivery.id,
        )
        return delivery

    logger.info(
        "Delivery created from product payment | ref=%s | "
        "delivery_id=%s | product_id=%s | town=%s | client=%s | "
        "courier=%s",
        payment.merchant_reference,
        delivery.id,
        payment.product_id,
        delivery.town,
        payment.user.email if payment.user_id else "—",
        default_courier.email if default_courier else "—",
    )

    return delivery


# ============================================================
# COMPLETE MANUAL PAYMENT
# ============================================================

@transaction.atomic
def complete_manual_payment(
    *,
    user,
    product,
    merchant_reference,
    order_tracking_id,
    amount,
    quantity,
    town,
    phone_number,
    email,
    gateway,
    note,
    currency="KES",
):
    """
    Create a ProductPayment row for a manually-recorded payment
    and run the same post-completion side effects the gateway
    path runs:

        1. persist the ProductPayment row in `completed`
        2. atomically decrement product stock (clamped to 0)
        3. create the Deliveries row
        4. notify the buyer ("Payment received")
        5. notify the seller ("New sale")

    Returns the created ProductPayment.

    `currency` defaults to "KES" so any older call site that
    doesn't pass it keeps working unchanged. New callers (the
    manual-payment view) pass the admin's chosen currency.

    Notifications run AFTER the DB writes so that a notify()
    failure can't prevent the payment row from being persisted.
    Both notify helpers already wrap their own bodies in
    try/except and only log on failure — nothing here can
    raise past the atomic block boundary.
    """

    from product_payment.models import ProductPayment
    from products.models import Products

    # ── 1. Persist the completed row ──────────────────
    payment = ProductPayment.objects.create(
        merchant_reference=merchant_reference,
        order_tracking_id=order_tracking_id,
        user=user,
        product=product,
        business=product.business if product.business_id else None,
        quantity=quantity,
        town=town,
        gateway=gateway,
        status=ProductPayment.STATUS_COMPLETED,
        amount=amount,
        currency=currency,
        email=email,
        phone_number=phone_number,
        confirmation_code=f"MANUAL-{merchant_reference[-8:]}",
        payment_method=gateway,
        payment_account=note or None,
        paid_at=timezone.now(),
        submit_response={
            "source": "manual",
            "recorded_by_superadmin": True,
            "note": note,
        },
    )

    # ── 2. Decrement stock atomically (clamped to 0) ──
    #
    # Same guarantee as the gateway path: never negative.
    # If quantity requested > available, stock lands on 0
    # rather than going below — the sale is still recorded.
    Products.objects.filter(id=product.id).update(
        quantity=models.functions.Greatest(
            F("quantity") - quantity,
            0,
        )
    )

    # ── 3. Create the Deliveries row via the shared helper ──
    #
    # `_create_delivery_for_payment` handles the completed
    # guard, the missing-product guard, the town fallback,
    # the courier default, and the OneToOne idempotency —
    # so the manual path inherits everything the gateway
    # path does with zero duplication.
    _create_delivery_for_payment(payment)

    # ── 4. Notify the buyer ───────────────────────────
    #
    # Mirrors what the gateway flow fires when PesaPal
    # confirms a payment. Same title, same body, same
    # action link — the buyer can't tell whether the sale
    # was recorded automatically or by an admin.
    #
    # `_notify_payment_completed` already short-circuits
    # cleanly if `payment.user_id` is None (walk-in buyer),
    # logging the skip rather than raising.
    _notify_payment_completed(payment)

    # ── 5. Notify the seller ──────────────────────────
    #
    # Mirrors the inline notify in `_mark_product_purchased`.
    # We can't call `_mark_product_purchased` itself because
    # it also decrements stock — which we already did above
    # — so we call the extracted notify helper directly.
    _notify_seller_of_sale(payment)

    logger.info(
        "Manual product payment recorded | ref=%s | product=%s | "
        "qty=%s | amount=%s %s | gateway=%s | by_superadmin",
        merchant_reference,
        product.id,
        quantity,
        amount,
        currency,
        gateway,
    )

    return payment