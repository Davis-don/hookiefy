# product_payment/views.py

import logging
import uuid

from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ProductPayment

from .serializers import (
    InitiateProductPaymentSerializer,
    ProductPaymentSerializer,
)
from .controllers.submit_order_request import submit_the_order
from .controllers.product_amount import Product_Amount
from .controllers.services import (
    get_active_pesapal_config,
    record_pending_payment,
)


logger = logging.getLogger(__name__)


# ============================================================
# INITIATE PAYMENT
# POST /product_payments/initiate/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Start a PesaPal payment for a product purchase.

    The client supplies only two pieces of information:

      - product_id: which product (selected by tapping its
                    card, sent as a route/body param)
      - town:       delivery destination (the only typed
                    field)

    Everything else — quantity (fixed at 1), amount, user,
    email, phone — is derived here or by the serializer.

    Stock enforcement:

      • The product must have at least 1 unit available.
        Otherwise the request is rejected with
        `insufficient_stock` before ever reaching PesaPal.

      • The atomic decrement of `Products.quantity` happens
        later, in `sync_product_payment_from_pesapal`, when
        the payment transitions to `completed` — so an
        abandoned checkout doesn't lock inventory forever.

      • Between initiate and sync, the stock shown on the
        product is the *pre-purchase* value. That's the
        correct UX: a user shouldn't see "out of stock"
        because they (or someone else) once started a
        checkout and walked away.
    """

    # ── 1. Validate input ──────────────────────────────
    serializer = InitiateProductPaymentSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    product = serializer.product
    town = serializer.validated_data["town"]              # required
    phone = serializer.validated_data.get("phone", "")     # optional
    user = request.user

    # Fixed at 1 — the buyer can't choose a quantity. Every
    # product in the catalogue is treated as a single heavy
    # item, delivered one at a time. If that policy ever
    # changes for a product, gate it on a Products flag.
    quantity = 1

    # ── 2. Ensure an active PesaPal config exists ─────
    try:
        config = get_active_pesapal_config()
    except Exception as e:
        logger.error("PesaPal config error: %s", e)
        return Response(
            {"message": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # ── 3. Compute total (must be > 0) ────────────────
    amount = Product_Amount(product.id, quantity)

    if amount == 0:
        return Response(
            {
                "message": (
                    "This product cannot be purchased right now. "
                    "It may have no price set, or the seller has "
                    "removed it."
                ),
                "code": "product_not_purchasable",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Reject self-purchase ───────────────────────
    if (
        product.business_id
        and product.business.owner_id == user.id
    ):
        return Response(
            {
                "message": "You cannot purchase your own product.",
                "code": "self_purchase_not_allowed",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Stock pre-check ────────────────────────────
    #
    # This is UX, not the real guarantee. The real guarantee
    # is the atomic F()-expression decrement that runs when
    # the payment completes (inside sync_product_payment_from_pesapal).
    #
    # Here, we just prevent the user from landing on the
    # PesaPal checkout page with a request that will fail
    # anyway. If two buyers race between this check and
    # payment, both can be allowed through — the atomic
    # decrement clamps quantity to zero instead of allowing
    # negatives, and the second buyer's purchase is still
    # recorded. That's the standard overselling trade-off
    # (never lose a real payment), not a bug.
    #
    if product.quantity < 1:
        return Response(
            {
                "message": "This product is currently out of stock.",
                "code": "insufficient_stock",
                "available": product.quantity,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 6. Build the merchant reference ───────────────
    merchant_reference = (
        f"PROD-{product.id}-{uuid.uuid4().hex[:12].upper()}"
    )

    # ── 7. Submit the order to PesaPal ────────────────
    order_payload = {
        "merchant_reference": merchant_reference,
        "amount": str(amount),
        "description": f"Purchase of {product.name}",
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
            "PesaPal SubmitOrderRequest failed for user=%s product=%s",
            user.email,
            product.id,
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

    # ── 8. Persist the pending payment row ────────────
    try:
        payment = record_pending_payment(
            user=user,
            product=product,
            merchant_reference=merchant_reference,
            order_tracking_id=order_tracking_id,
            amount=amount,
            quantity=quantity,
            town=town,
            phone_number=phone or None,
            email=user.email,
            gateway="pesapal",
            submit_response=result,
        )
    except Exception as e:
        logger.exception(
            "Failed to record pending product payment for ref=%s",
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

    # ── 9. Respond with the redirect URL + delivery context ──
    #
    # `remaining_stock` is what the product's quantity *will*
    # be once this purchase completes. Because the decrement
    # happens on completion (in sync), not on initiate, the
    # value here is `product.quantity - 1`, clamped to 0.
    #
    remaining_stock = max(0, product.quantity - quantity)

    return Response(
        {
            "message": "Payment initialised. Redirecting…",
            "payment": ProductPaymentSerializer(payment).data,
            "redirect_url": redirect_url,

            # Convenience fields — the frontend gets everything
            # it needs to render the pending state without a
            # second product fetch.
            "quantity": quantity,
            "amount": str(amount),
            "currency": payment.currency,
            "remaining_stock": remaining_stock,
            "product": {
                "id": product.id,
                "name": product.name,
                "quantity": product.quantity,
                "in_stock": product.quantity > 0,
            },
            "delivery": {
                "town": town,
                "status": "pending",
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# PAYMENT STATUS
# GET /product_payments/<merchant_reference>/status/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_status(request, merchant_reference):
    """
    Poll the local product-payment row for its latest status.
    """

    payment = (
        ProductPayment.objects
        .select_related("product", "business")
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

    return Response(
        ProductPaymentSerializer(payment).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# SYNC
# POST /product_payments/<merchant_reference>/sync/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_payment(request, merchant_reference):
    """
    Force a sync of this product-payment row against PesaPal,
    then return the updated row.
    """

    from .controllers.services import sync_product_payment_from_pesapal

    payment = (
        ProductPayment.objects
        .select_related("product", "business")
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
        sync_product_payment_from_pesapal(merchant_reference)
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
                "payment": ProductPaymentSerializer(payment).data,
            },
            status=status.HTTP_200_OK,
        )

    payment.refresh_from_db()

    return Response(
        {
            "message": "Payment status refreshed.",
            "payment": ProductPaymentSerializer(payment).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CALLBACK — browser redirect from PesaPal
# GET /subscription_payments/payment-success/
#
# Shared with subscription payments — the callback URL is set
# once in settings (PESAPAL_CALLBACK_URL) and used by both
# verticals. This view exists in product_payment mainly to
# document that it must dispatch by prefix; the actual handler
# lives in subscription_payment.views and is the one you
# should extend.
# ============================================================


# ============================================================
# IPN — server-to-server
# POST /subscription_payments/ipn/
#
# Same story: shared endpoint, dispatch by merchant_reference
# prefix. The authoritative handler lives in subscription
# payment (see `subscription_payment/views.py::payment_ipn`),
# extended with product dispatch.
# ============================================================