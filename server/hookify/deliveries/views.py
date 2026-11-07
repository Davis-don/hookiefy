# deliveries/views.py

import logging
from functools import wraps

from django.db.models import Q
from django.utils.dateparse import parse_datetime
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from notifications.models import Notification
from notifications.services import notify

from .models import Deliveries
from .serializers import (
    DeliverySerializer,
    DeliveryAdminDetailSerializer,
    DeliveryAdminStatusUpdateSerializer,
)


logger = logging.getLogger(__name__)


# ============================================================
# PAGINATION DEFAULTS
# ============================================================

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


# ============================================================
# PERMISSION DECORATOR — SUPERADMIN ONLY
# ============================================================

def superadmin_required(view_func):
    """
    Reject the request with 403 unless `request.user.is_superadmin`.

    Must be applied below `@permission_classes([IsAuthenticated])`
    so `request.user` is always a resolved `Accounts` instance,
    never `AnonymousUser`.
    """

    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        user = request.user

        if not getattr(user, "is_authenticated", False):
            return Response(
                {"message": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_superadmin:
            logger.warning(
                "Non-superadmin attempted to access a "
                "superadmin-only endpoint | user=%s | path=%s",
                user.email,
                request.path,
            )
            return Response(
                {"message": "Only superadmins can access this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return view_func(request, *args, **kwargs)

    return wrapped


# ============================================================
# HELPERS
# ============================================================

def _parse_limit(value, default=DEFAULT_PAGE_SIZE, maximum=MAX_PAGE_SIZE):
    """Clamp the `?limit=` query param to a safe range."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


def _parse_before(value):
    """Parse the ISO cursor; None for the first page."""
    if not value:
        return None

    parsed = parse_datetime(value)
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone=timezone.utc)
    return parsed


def _paginate(qs, limit, before_dt):
    """
    Cursor-paginate by `created_at`, returning the standard
    envelope: { count, next_cursor, has_more, results }.
    """
    if before_dt is not None:
        qs = qs.filter(created_at__lt=before_dt)

    rows = list(qs[: limit + 1])
    has_more = len(rows) > limit
    page = rows[:limit]

    next_cursor = None
    if has_more and page:
        next_cursor = page[-1].created_at.isoformat()

    serializer = DeliverySerializer(
        page, many=True, context={"request": None}
    )

    return {
        "count": len(page),
        "next_cursor": next_cursor,
        "has_more": has_more,
        "results": serializer.data,
    }


def _base_queryset():
    """Every delivery query starts with the same eager-loads."""
    return (
        Deliveries.objects
        .select_related(
            "payment",
            "client",
            "product",
            "delivered_by",
            "delivered_to",
        )
        .prefetch_related("product__images")
        .order_by("-created_at")
    )


# ============================================================
# NOTIFY DELIVERY CREATED
# ============================================================
#
# Called whenever a Deliveries row is created — both from the
# admin's manual `create_delivery` endpoint below and (through
# the same helper, if you wire it) from the gateway path's
# `_create_delivery_for_payment`. One recipient, always the
# buyer (`delivery.client`), never the seller or the courier.
#
# Failures never bubble up: the notification is a best-effort
# side channel, not a precondition for delivery creation. If
# the notify() call raises, we log it and move on — the
# delivery row is already committed by the caller and the
# user still sees it in `GET /deliveries/`.
# ============================================================

def _notify_delivery_created(delivery):
    """
    Tell the buyer that a delivery has been created for them.

    The recipient is always `delivery.client` — the account
    that placed the order. A walk-in buyer with no account
    can't be notified (there's nothing to notify), so we skip
    silently in that case.
    """
    try:
        recipient = (
            delivery.client
            if delivery.client_id else None
        )

        if recipient is None:
            logger.info(
                "Skipping delivery-created notification — "
                "no client account | delivery_id=%s",
                delivery.pk,
            )
            return

        product_name = (
            delivery.product.name
            if delivery.product_id else "your item"
        )

        # The buyer sees the delivery in their account, so
        # deep-link to the delivery list. If your app has a
        # dedicated delivery-detail route, swap this.
        action_url = "/useraccount/deliveries"

        # Body varies slightly by the initial status — a
        # delivery created as "delivered" is a handoff, not
        # a dispatch.
        if delivery.status == Deliveries.STATUS_DELIVERED:
            body = (
                f"Your order for {product_name} has been marked "
                f"as delivered to {delivery.town}."
            )
            severity = Notification.SEVERITY_SUCCESS
            title = "Order delivered"
        elif delivery.status == Deliveries.STATUS_FAILED:
            body = (
                f"A delivery attempt for {product_name} to "
                f"{delivery.town} failed. Please contact support "
                f"if you'd like us to try again."
            )
            severity = Notification.SEVERITY_ERROR
            title = "Delivery failed"
        else:
            body = (
                f"Your order for {product_name} is on the way "
                f"to {delivery.town}."
            )
            severity = Notification.SEVERITY_INFO
            title = "Delivery created"

        notify(
            recipient=recipient,
            title=title,
            body=body,
            category=Notification.CATEGORY_PAYMENT,
            severity=severity,
            action_label="View delivery",
            action_url=action_url,
            metadata={
                "delivery_id": str(delivery.pk),
                "payment_id": (
                    str(delivery.payment_id)
                    if delivery.payment_id else None
                ),
                "payment_reference": (
                    delivery.payment.merchant_reference
                    if delivery.payment_id else None
                ),
                "product_id": delivery.product_id,
                "town": delivery.town,
                "quantity": delivery.quantity,
                "status": delivery.status,
            },
            expires_in_days=14,
        )

        logger.info(
            "Delivery-created notification sent | delivery_id=%s | "
            "recipient=%s | status=%s",
            delivery.pk,
            recipient.email,
            delivery.status,
        )

    except Exception:
        logger.exception(
            "Failed to send delivery-created notification | "
            "delivery_id=%s",
            getattr(delivery, "pk", "—"),
        )


# ============================================================
# LIST — MY DELIVERIES
# GET /deliveries/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_deliveries(request):
    """
    Paginated list of the current user's deliveries.
    Available to any authenticated user.
    """

    user = request.user

    role = (request.query_params.get("role") or "").lower()
    status_filter = (
        request.query_params.get("status") or ""
    ).lower()
    town = (request.query_params.get("town") or "").strip()

    limit = _parse_limit(request.query_params.get("limit"))
    before_dt = _parse_before(request.query_params.get("before"))

    if role == "client":
        qs = Deliveries.objects.filter(client=user)
    elif role == "courier":
        qs = Deliveries.objects.filter(delivered_by=user)
    elif role == "recipient":
        qs = Deliveries.objects.filter(delivered_to=user)
    else:
        qs = Deliveries.objects.filter(
            Q(client=user)
            | Q(delivered_by=user)
            | Q(delivered_to=user)
        )

    if status_filter in (
        Deliveries.STATUS_PENDING,
        Deliveries.STATUS_DELIVERED,
        Deliveries.STATUS_FAILED,
    ):
        qs = qs.filter(status=status_filter)

    if town:
        qs = qs.filter(town__iexact=town)

    qs = (
        qs.select_related(
            "payment",
            "client",
            "product",
            "delivered_by",
            "delivered_to",
        )
        .prefetch_related("product__images")
        .order_by("-created_at")
    )

    payload = _paginate(qs, limit, before_dt)
    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# LIST — ALL DELIVERIES (superadmin only)
# GET /deliveries/all/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
@superadmin_required
def all_deliveries(request):
    """
    Paginated list of every delivery in the system.

    Superadmin only. Non-superadmin callers are rejected
    with 403 by the `superadmin_required` decorator before
    this body runs.
    """

    status_filter = (
        request.query_params.get("status") or ""
    ).lower()
    town = (request.query_params.get("town") or "").strip()
    business_id = request.query_params.get("business")
    delivered_by_id = request.query_params.get("delivered_by")

    limit = _parse_limit(request.query_params.get("limit"))
    before_dt = _parse_before(request.query_params.get("before"))

    qs = _base_queryset()

    if status_filter in (
        Deliveries.STATUS_PENDING,
        Deliveries.STATUS_DELIVERED,
        Deliveries.STATUS_FAILED,
    ):
        qs = qs.filter(status=status_filter)

    if town:
        qs = qs.filter(town__iexact=town)

    if business_id:
        try:
            qs = qs.filter(product__business_id=int(business_id))
        except (TypeError, ValueError):
            return Response(
                {"business": ["Invalid business id."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if delivered_by_id:
        try:
            qs = qs.filter(delivered_by_id=int(delivered_by_id))
        except (TypeError, ValueError):
            return Response(
                {"delivered_by": ["Invalid account id."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    payload = _paginate(qs, limit, before_dt)
    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# DETAIL — ONE DELIVERY (superadmin only)
# GET /deliveries/all/<id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
@superadmin_required
def all_delivery_detail(request, pk):
    """
    Single delivery with expanded account info for the
    buyer, courier, recipient, and seller. Superadmin only.
    """

    qs = (
        Deliveries.objects
        .select_related(
            "payment",
            "client",
            "product",
            "product__business",
            "delivered_by",
            "delivered_to",
        )
        .prefetch_related("product__images")
    )

    try:
        delivery = qs.get(pk=pk)
    except Deliveries.DoesNotExist:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = DeliveryAdminDetailSerializer(
        delivery, context={"request": request}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================
# UPDATE STATUS — ONE DELIVERY (superadmin only)
# PATCH /deliveries/all/<id>/status/
# ============================================================

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@superadmin_required
def all_delivery_update_status(request, pk):
    """
    Update the status of one delivery. Superadmin only.

    Body:
        { "status": "pending" | "delivered" | "failed" }

    Transition rules are enforced by
    `DeliveryAdminStatusUpdateSerializer`.

    Stamps `delivered_at` when the status becomes `delivered`;
    clears it otherwise.
    """
    try:
        delivery = Deliveries.objects.get(pk=pk)
    except Deliveries.DoesNotExist:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = DeliveryAdminStatusUpdateSerializer(
        data=request.data,
        context={"delivery": delivery, "request": request},
    )
    serializer.is_valid(raise_exception=True)

    new_status = serializer.validated_data["status"]
    old_status = delivery.status

    delivery.status = new_status

    if new_status == Deliveries.STATUS_DELIVERED:
        if delivery.delivered_at is None:
            delivery.delivered_at = timezone.now()
    else:
        delivery.delivered_at = None

    delivery.save(update_fields=["status", "delivered_at", "updated_at"])

    logger.info(
        "Delivery %s status updated | old=%s | new=%s | by=%s",
        delivery.pk,
        old_status,
        new_status,
        request.user.email,
    )

    # Re-serialize with the detail serializer so the caller
    # gets the fresh row back (including the new updated_at).
    qs = (
        Deliveries.objects
        .select_related(
            "payment",
            "client",
            "product",
            "product__business",
            "delivered_by",
            "delivered_to",
        )
        .prefetch_related("product__images")
    )
    fresh = qs.get(pk=delivery.pk)

    out = DeliveryAdminDetailSerializer(
        fresh, context={"request": request}
    )
    return Response(out.data, status=status.HTTP_200_OK)


# ============================================================
# CREATE — one delivery (superadmin only)
# POST /deliveries/create/
# ============================================================
#
# The ManualDeliveryModal posts here. Unlike the gateway path
# (which creates deliveries automatically inside
# `_create_delivery_for_payment`), this endpoint exists so an
# admin can create a delivery by hand — typically because the
# automatic one was skipped (no town on the payment, product
# deleted, walk-in buyer with no account) or because the
# delivery needs to be re-issued (failed courier, returned,
# etc.).
#
# Body:
#   {
#     "payment_reference": "PROD-…",   optional — if present,
#                                       links the delivery to the
#                                       matching ProductPayment
#     "product": <int>,                 required if payment_reference
#                                       is absent
#     "business": <int | null>,
#     "client": <int | null>,           required by the model
#     "town": "<string>",               required
#     "quantity": <int>,                defaults to 1
#     "status": "pending" | "delivered" | "failed",
#     "delivered_by": <int | null>,
#     "delivered_to": <int | null>,
#     "notes": "<string>",              free-text, stored on
#                                       the delivery if the model
#                                       has a notes field
#   }
#
# Everything is derived from what the admin supplies. The view
# refuses to proceed if the payment_reference points to a
# payment that already has a delivery (the OneToOne constraint
# would raise IntegrityError anyway — surfacing it as a clear
# 400 is friendlier than a 500).
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@superadmin_required
def create_delivery(request):
    """
    Create a delivery by hand. Superadmin only.

    Two shapes are supported, in priority order:

      1. `payment_reference` is given → the ProductPayment
         with that merchant_reference is loaded, and every
         field derivable from it (client, product, business,
         town, quantity) is defaulted from it. Admin-supplied
         values for the same fields override the defaults.

      2. No `payment_reference` → product + client + town
         must all be supplied by the admin. The delivery is
         not linked to any payment (Deliveries.payment is
         nullable in that case — see the note at the bottom
         if it isn't).

    Returns the newly-created delivery, serialized with the
    same detail serializer the superadmin list/detail views
    use, so the caller sees the full shape immediately.

    On success, the buyer (`delivery.client`) receives an
    in-app notification via `_notify_delivery_created`.
    """
    from product_payment.models import ProductPayment

    data = request.data

    # ── 1. Resolve the payment (optional) ─────────────
    merchant_reference = (data.get("payment_reference") or "").strip()
    payment = None

    if merchant_reference:
        payment = (
            ProductPayment.objects
            .select_related("user", "product", "business")
            .filter(merchant_reference=merchant_reference)
            .first()
        )
        if payment is None:
            return Response(
                {
                    "payment_reference": [
                        "No payment with that merchant reference."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If a delivery already exists for this payment,
        # say so clearly rather than letting the DB raise
        # IntegrityError on the OneToOne.
        if Deliveries.objects.filter(payment=payment).exists():
            return Response(
                {
                    "payment_reference": [
                        "A delivery already exists for this payment."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── 2. Derive field values ────────────────────────
    #
    # Priority: admin-supplied value > value on the linked
    # payment > None. This lets an admin override the
    # payment's town (buyer asked for a different destination)
    # while still getting every other field for free.

    def _pick(field, payment_attr=None):
        """Admin value if present and non-empty, else payment value."""
        raw = data.get(field)
        if raw not in (None, "", []):
            return raw
        if payment is not None:
            return getattr(payment, payment_attr or field, None)
        return None

    product_id = _pick("product", "product_id")
    client_id = _pick("client", "user_id")
    business_id = _pick("business", "business_id")
    town = _pick("town")
    quantity = _pick("quantity") or 1
    status_value = _pick("status") or Deliveries.STATUS_PENDING
    delivered_by_id = data.get("delivered_by") or None
    delivered_to_id = data.get("delivered_to") or None

    # ── 3. Minimum required set ───────────────────────
    errors: dict = {}

    if not town or not str(town).strip():
        errors["town"] = ["Town is required."]

    if not client_id:
        errors["client"] = [
            "A client is required. Link this delivery to a "
            "payment, or supply a client explicitly."
        ]

    if status_value not in (
        Deliveries.STATUS_PENDING,
        Deliveries.STATUS_DELIVERED,
        Deliveries.STATUS_FAILED,
    ):
        errors["status"] = [
            "Status must be one of: pending, delivered, failed."
        ]

    try:
        quantity = int(quantity)
        if quantity < 1:
            raise ValueError
    except (TypeError, ValueError):
        errors["quantity"] = ["Quantity must be a positive integer."]

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    # ── 4. Create ─────────────────────────────────────
    delivered_at = (
        timezone.now()
        if status_value == Deliveries.STATUS_DELIVERED
        else None
    )

    delivery = Deliveries.objects.create(
        payment=payment,
        client_id=client_id,
        product_id=product_id or None,
        quantity=quantity,
        town=str(town).strip(),
        status=status_value,
        delivered_by_id=delivered_by_id,
        delivered_to_id=delivered_to_id,
        delivered_at=delivered_at,
    )

    logger.info(
        "Manual delivery created | delivery_id=%s | payment_ref=%s | "
        "product_id=%s | client_id=%s | town=%s | by=%s",
        delivery.pk,
        payment.merchant_reference if payment else "—",
        product_id,
        client_id,
        delivery.town,
        request.user.email,
    )

    # ── 5. Notify the buyer ───────────────────────────
    #
    # The recipient is `delivery.client` — the buyer.
    # A walk-in buyer with no account can't be notified
    # (there's no inbox to deliver to), so the helper
    # handles that gracefully.
    #
    _notify_delivery_created(delivery)

    # ── 6. Re-serialize with the admin detail serializer ──
    fresh = (
        Deliveries.objects
        .select_related(
            "payment",
            "client",
            "product",
            "product__business",
            "delivered_by",
            "delivered_to",
        )
        .prefetch_related("product__images")
        .get(pk=delivery.pk)
    )

    out = DeliveryAdminDetailSerializer(
        fresh, context={"request": request}
    )
    return Response(out.data, status=status.HTTP_201_CREATED)