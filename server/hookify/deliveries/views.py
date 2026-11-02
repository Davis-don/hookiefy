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
        Deliveries.STATUS_CANCELLED,
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
        Deliveries.STATUS_CANCELLED,
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
        { "status": "pending" | "delivered" | "cancelled" | "failed" }

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