# product_payment/views.py

import logging
import uuid

from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import (
    IsAuthenticated,
    IsAdminUser,
)
from rest_framework.response import Response
from rest_framework import status

from .models import ProductPayment

from .serializers import (
    InitiateProductPaymentSerializer,
    ProductPaymentSerializer,
    ManualProductPaymentSerializer,
)
from .controllers.submit_order_request import submit_the_order
from .controllers.product_amount import Product_Amount
from .controllers.services import (
    get_active_pesapal_config,
    record_pending_payment,
    complete_manual_payment,
)


logger = logging.getLogger(__name__)


# ============================================================
# SHARED SYNC DISPATCH
# ============================================================
#
# Same helper as subscription_payment/views.py. When called
# from a product-payment context, PROD-… references route to
# product_payment's own sync, and SUB-… references route to
# subscription_payment's sync. That symmetry means the shared
# callback and IPN handlers (owned by subscription_payment)
# can call the same dispatcher without caring which view
# invoked them.
#
# Both branches import lazily to avoid the circular import
# between subscription_payment and product_payment at module
# load time.
# ============================================================

def _sync_by_reference(merchant_reference):
    """
    Sync the payment row matching `merchant_reference`, whether
    it's a subscription payment or a product payment.
    """
    if merchant_reference.startswith("SUB-"):
        from subscription_payment.controllers.services import (
            sync_payment_from_pesapal,
        )
        sync_payment_from_pesapal(merchant_reference)
        return

    if merchant_reference.startswith("PROD-"):
        from .controllers.services import (
            sync_product_payment_from_pesapal,
        )
        sync_product_payment_from_pesapal(merchant_reference)
        return

    raise Exception(
        f"Unrecognised merchant_reference prefix: {merchant_reference}"
    )


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

    The frontend calls this after the user returns from
    PesaPal — it guarantees the row is fresh regardless of
    whether the IPN has arrived yet.

    Uses `_sync_by_reference` rather than calling the
    product-specific sync directly: the shared dispatcher
    routes by prefix, so even if a SUB-… reference somehow
    lands on this endpoint, it still syncs correctly.

    Manual rows (`…MAN`) are terminal on creation — they
    are already `completed` and have no gateway to poll.
    For those, the sync is a no-op: we short-circuit
    before dispatching so we don't burn a PesaPal call
    on a reference the gateway has never heard of.
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

    # Manual rows have no gateway counterpart — nothing to
    # sync against. Return the row as-is.
    if payment.merchant_reference.endswith(".MAN"):
        return Response(
            {
                "message": "Manual payment — no gateway sync required.",
                "payment": ProductPaymentSerializer(payment).data,
            },
            status=status.HTTP_200_OK,
        )

    try:
        _sync_by_reference(merchant_reference)
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
# MANUAL PAYMENT — superadmin only
# POST /product_payments/manual/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAdminUser])
def manual_payment(request):
    """
    Record a product payment that did NOT go through a
    gateway — cheque, cash, bank transfer confirmed by
    finance, etc. Superadmin only.

    The row is created directly in `completed` status (the
    money is already in hand — that's why it's being
    recorded manually), and the same post-payment side
    effects that run on a gateway completion are applied:
    stock is decremented and a Deliveries row is created.

    Unlike the client initiate endpoint, this view does
    NOT hit PesaPal. There is no `redirect_url`, no
    `submit_response` from a gateway — instead the row's
    `submit_response` carries a small structured note for
    audit ("recorded by superadmin", the free-text note).

    `IsAdminUser` grants access to `is_staff=True` accounts.
    If you want superadmin-role-only (narrower than
    is_staff), replace it with a custom permission class
    that checks `request.user.role == "superadmin"`.
    """

    serializer = ManualProductPaymentSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    product = serializer.product
    user = serializer.resolved_user          # may be None
    email = serializer.resolved_email        # may be None
    stock_warning = serializer.stock_warning

    v = serializer.validated_data
    quantity = v["quantity"]
    amount = v["amount"]
    town = v["town"]
    gateway = v["gateway"]
    currency = v["currency"]
    phone = (v.get("phone_number") or "").strip() or None
    note = (v.get("note") or "").strip()

    # ── Build a reference that follows the PROD- convention ──
    #
    # Same shape as the client flow so the row is routed
    # correctly by `_sync_by_reference` if anyone ever
    # POSTs it to the sync endpoint — though `sync_payment`
    # short-circuits on `.MAN` refs before dispatching, so
    # that path never actually reaches PesaPal.
    #
    # The ".MAN" suffix makes manual rows instantly
    # filterable for reporting, and the matching
    # `MAN-…` order_tracking_id satisfies the model's
    # `unique=True` on that field without any risk of
    # colliding with a real gateway tracking ID (those
    # are alphanumeric-only and never start with "MAN-").
    #
    manual_suffix = uuid.uuid4().hex[:10].upper()
    merchant_reference = (
        f"PROD-{product.id}-{manual_suffix}.MAN"
    )
    order_tracking_id = f"MAN-{manual_suffix}"

    try:
        payment = complete_manual_payment(
            user=user,
            product=product,
            merchant_reference=merchant_reference,
            order_tracking_id=order_tracking_id,
            amount=amount,
            quantity=quantity,
            town=town,
            phone_number=phone,
            email=email,
            gateway=gateway,
            note=note,
            currency=currency,
        )
    except Exception as e:
        logger.exception(
            "Manual product payment failed product=%s amount=%s",
            product.id, amount,
        )
        return Response(
            {
                "message": "Could not record the manual payment.",
                "code": "record_failed",
                "detail": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Manual payment recorded.",
            "payment": ProductPaymentSerializer(payment).data,
            "stock_warning": stock_warning,
        },
        status=status.HTTP_201_CREATED,
    )

# product_payment/views.py  (append at the bottom)

from rest_framework.pagination import PageNumberPagination


class _OrdersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ============================================================
# LIST ORDERS
# GET /product_payments/
# ============================================================
#
# Query params (all optional):
#   ?status=completed|pending|failed|…     filter by status
#   ?gateway=pesapal|manual_cash|…         filter by gateway
#   ?manual=1                              manual rows only
#   ?search=<text>                         matches merchant_reference,
#                                          email, phone, product name
#   ?product=<id>                          filter to one product
#   ?user=<id>                             filter to one buyer
#   ?page=<n>                              pagination (default 20)
#   ?page_size=<n>                         page size (max 100)
#
# Response: { count, next, previous, results: [ProductPaymentSerializer] }
#
# Permissions:
#   - superadmin (is_staff=True) sees ALL rows
#   - a normal authenticated user sees only rows they bought
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_product_payments(request):
    """
    Paginated, filterable list of product payments.

    Superadmins see every row; regular authenticated users
    see only their own rows. The response shape is the same
    either way, so a future "my purchases" view can reuse
    this endpoint.
    """

    qs = (
        ProductPayment.objects
        .select_related("user", "product", "business")
        .order_by("-created_at")
    )

    # Scoping — non-superadmins only see their own
    if not request.user.is_staff:
        qs = qs.filter(user=request.user)

    # ── Filters ────────────────────────────────────────
    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    gateway_filter = request.query_params.get("gateway")
    if gateway_filter:
        qs = qs.filter(gateway=gateway_filter)

    if request.query_params.get("manual") in ("1", "true", "True"):
        qs = qs.filter(merchant_reference__endswith=".MAN")

    product_filter = request.query_params.get("product")
    if product_filter:
        qs = qs.filter(product_id=product_filter)

    user_filter = request.query_params.get("user")
    if user_filter:
        qs = qs.filter(user_id=user_filter)

    search = (request.query_params.get("search") or "").strip()
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(merchant_reference__icontains=search)
            | Q(email__icontains=search)
            | Q(phone_number__icontains=search)
            | Q(product__name__icontains=search)
        )

    # ── Paginate ───────────────────────────────────────
    paginator = _OrdersPagination()
    page = paginator.paginate_queryset(qs, request)

    data = ProductPaymentSerializer(page, many=True).data
    return paginator.get_paginated_response(data)