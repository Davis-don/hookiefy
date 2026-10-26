# deliveries/views.py

import logging

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Deliveries
from .serializers import (
    DeliverySerializer,
    DeliveryStatusUpdateSerializer,
)


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _own_delivery_or_404(user, delivery_id):
    """
    Return the delivery if it belongs to `user` in any
    capacity (as the client, the recipient, or the courier).
    Otherwise None.

    A user is allowed to see a delivery when:
      • they placed the order (`client`)
      • it's addressed to them (`delivered_to`)
      • they're the courier handling it (`delivered_by`)
    """
    return (
        Deliveries.objects
        .select_related(
            "payment",
            "client",
            "product",
            "delivered_by",
            "delivered_to",
        )
        .filter(
            Q(id=delivery_id),
            Q(client=user)
            | Q(delivered_to=user)
            | Q(delivered_by=user),
        )
        .first()
    )


# ============================================================
# LIST — MY DELIVERIES
# GET /deliveries/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_deliveries(request):
    """
    Return deliveries where the requesting user is any of:
    client, recipient, or courier.

    Query params:
        role   — 'client' | 'courier' | 'recipient'
                 (default: all three)
        status — 'pending' | 'delivered' | 'cancelled' | 'failed'
        town   — filter by town (case-insensitive)
    """

    user = request.user

    role = (request.query_params.get("role") or "").lower()
    status_filter = (request.query_params.get("status") or "").lower()
    town = (request.query_params.get("town") or "").strip()

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
        .order_by("-created_at")
    )

    serializer = DeliverySerializer(
        qs, many=True, context={"request": request}
    )

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RETRIEVE — A SINGLE DELIVERY
# GET /deliveries/<delivery_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_delivery(request, delivery_id):
    """
    Return a single delivery row, if the requesting user is
    allowed to see it (client, recipient, or courier).
    """

    delivery = _own_delivery_or_404(request.user, delivery_id)

    if delivery is None:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = DeliverySerializer(
        delivery, context={"request": request}
    )

    return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================
# LIST — COURIER QUEUE
# GET /deliveries/assigned/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def assigned_deliveries(request):
    """
    Return deliveries where the requesting user is the courier
    (`delivered_by`). Defaults to pending only — the natural
    "what do I need to deliver?" view for a courier app.

    Query params:
        status — 'pending' (default) | 'delivered' | 'all'
        town   — filter by town
    """

    user = request.user

    status_filter = (
        request.query_params.get("status") or "pending"
    ).lower()
    town = (request.query_params.get("town") or "").strip()

    qs = Deliveries.objects.filter(delivered_by=user)

    if status_filter == "all":
        pass
    elif status_filter in (
        Deliveries.STATUS_PENDING,
        Deliveries.STATUS_DELIVERED,
        Deliveries.STATUS_CANCELLED,
        Deliveries.STATUS_FAILED,
    ):
        qs = qs.filter(status=status_filter)
    else:
        qs = qs.filter(status=Deliveries.STATUS_PENDING)

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
        .order_by("-created_at")
    )

    serializer = DeliverySerializer(
        qs, many=True, context={"request": request}
    )

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LIST — UNASSIGNED QUEUE
# GET /deliveries/unassigned/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unassigned_deliveries(request):
    """
    Return pending deliveries with no courier assigned.

    Intended for a dispatcher / admin app where someone picks
    deliveries off the queue and assigns them. Add a
    `if not request.user.is_staff` guard if you want to
    restrict this to staff only.

    Query params:
        town — filter by town
    """

    town = (request.query_params.get("town") or "").strip()

    qs = Deliveries.objects.filter(
        status=Deliveries.STATUS_PENDING,
        delivered_by__isnull=True,
    )

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
        .order_by("-created_at")
    )

    serializer = DeliverySerializer(
        qs, many=True, context={"request": request}
    )

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CLAIM — COURIER TAKES AN UNASSIGNED DELIVERY
# POST /deliveries/<delivery_id>/claim/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def claim_delivery(request, delivery_id):
    """
    Assign the requesting user as the courier for a pending,
    unassigned delivery.

    Idempotent: if the delivery is already assigned to the
    requester, returns success. If assigned to someone else,
    returns 409 Conflict.
    """

    delivery = Deliveries.objects.filter(id=delivery_id).first()

    if delivery is None:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if delivery.status != Deliveries.STATUS_PENDING:
        return Response(
            {
                "message": (
                    f"Delivery cannot be claimed — status is "
                    f"{delivery.status!r}."
                ),
                "code": "not_claimable",
                "status": delivery.status,
            },
            status=status.HTTP_409_CONFLICT,
        )

    if delivery.delivered_by_id == request.user.id:
        serializer = DeliverySerializer(
            delivery, context={"request": request}
        )
        return Response(
            {
                "message": "Delivery is already assigned to you.",
                "delivery": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    if delivery.delivered_by_id is not None:
        return Response(
            {
                "message": "This delivery has already been claimed.",
                "code": "already_claimed",
            },
            status=status.HTTP_409_CONFLICT,
        )

    delivery.delivered_by = request.user
    delivery.save(update_fields=["delivered_by", "updated_at"])

    logger.info(
        "Delivery claimed | delivery_id=%s | courier=%s",
        delivery.id,
        request.user.email,
    )

    serializer = DeliverySerializer(
        delivery, context={"request": request}
    )

    return Response(
        {
            "message": "Delivery claimed.",
            "delivery": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UNCLAIM — COURIER RELEASES A DELIVERY
# POST /deliveries/<delivery_id>/unclaim/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unclaim_delivery(request, delivery_id):
    """
    Release a delivery the requesting user is currently
    assigned to. Returns 409 if the delivery is already
    delivered / cancelled / failed (i.e. terminal).
    """

    delivery = Deliveries.objects.filter(id=delivery_id).first()

    if delivery is None:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if delivery.delivered_by_id != request.user.id:
        return Response(
            {
                "message": "You are not assigned to this delivery.",
                "code": "not_assigned",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if delivery.is_terminal:
        return Response(
            {
                "message": (
                    f"Delivery cannot be released — status is "
                    f"{delivery.status!r}."
                ),
                "code": "terminal_status",
                "status": delivery.status,
            },
            status=status.HTTP_409_CONFLICT,
        )

    delivery.delivered_by = None
    delivery.save(update_fields=["delivered_by", "updated_at"])

    serializer = DeliverySerializer(
        delivery, context={"request": request}
    )

    return Response(
        {
            "message": "Delivery released.",
            "delivery": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE STATUS — MARK DELIVERED / CANCELLED / FAILED
# POST /deliveries/<delivery_id>/status/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_delivery_status(request, delivery_id):
    """
    Transition a delivery's status. Only the assigned courier
    (or the client, for cancellation) may call this.

    Allowed transitions:
        pending   → delivered  (courier only)
        pending   → failed     (courier only)
        pending   → cancelled  (client only, before pickup)
        any       → terminal   rejected once terminal

    Request body: { "status": "delivered" | "cancelled" | "failed" }
    """

    serializer = DeliveryStatusUpdateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_status = serializer.validated_data["status"]

    delivery = Deliveries.objects.filter(id=delivery_id).first()

    if delivery is None:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if delivery.is_terminal:
        return Response(
            {
                "message": (
                    f"Delivery is already {delivery.status!r}."
                ),
                "code": "already_terminal",
                "status": delivery.status,
            },
            status=status.HTTP_409_CONFLICT,
        )

    is_courier = delivery.delivered_by_id == request.user.id
    is_client = delivery.client_id == request.user.id

    if new_status in (
        Deliveries.STATUS_DELIVERED,
        Deliveries.STATUS_FAILED,
    ):
        if not is_courier:
            return Response(
                {
                    "message": (
                        "Only the assigned courier can mark this "
                        "delivery as delivered or failed."
                    ),
                    "code": "not_courier",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    elif new_status == Deliveries.STATUS_CANCELLED:
        if not is_client:
            return Response(
                {
                    "message": (
                        "Only the client who ordered this "
                        "delivery can cancel it."
                    ),
                    "code": "not_client",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    delivery.status = new_status

    if new_status == Deliveries.STATUS_DELIVERED:
        delivery.delivered_at = timezone.now()

    delivery.save(
        update_fields=["status", "delivered_at", "updated_at"]
    )

    logger.info(
        "Delivery status updated | delivery_id=%s | new=%s | by=%s",
        delivery.id,
        new_status,
        request.user.email,
    )

    serializer = DeliverySerializer(
        delivery, context={"request": request}
    )

    return Response(
        {
            "message": f"Delivery marked as {new_status}.",
            "delivery": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# ASSIGN COURIER — DISPATCHER ACTION
# POST /deliveries/<delivery_id>/assign/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_courier(request, delivery_id):
    """
    Assign a courier to a delivery. Intended for a dispatcher
    or admin role.

    Request body: { "courier_id": <int> }

    A delivery can be assigned any number of times before
    it's delivered — reassignment is allowed if the original
    courier can't make it.
    """

    from account.models import Accounts

    courier_id = request.data.get("courier_id")

    if not courier_id:
        return Response(
            {"courier_id": ["This field is required."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    courier = Accounts.objects.filter(id=courier_id).first()

    if courier is None:
        return Response(
            {"courier_id": ["Courier not found."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    delivery = Deliveries.objects.filter(id=delivery_id).first()

    if delivery is None:
        return Response(
            {"message": "Delivery not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if delivery.is_terminal:
        return Response(
            {
                "message": (
                    f"Delivery is already {delivery.status!r} — "
                    f"cannot reassign."
                ),
                "code": "already_terminal",
                "status": delivery.status,
            },
            status=status.HTTP_409_CONFLICT,
        )

    delivery.delivered_by = courier
    delivery.save(update_fields=["delivered_by", "updated_at"])

    logger.info(
        "Delivery assigned | delivery_id=%s | courier=%s | by=%s",
        delivery.id,
        courier.email,
        request.user.email,
    )

    serializer = DeliverySerializer(
        delivery, context={"request": request}
    )

    return Response(
        {
            "message": f"Delivery assigned to {courier.email}.",
            "delivery": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# SUMMARY — DASHBOARD COUNTS
# GET /deliveries/summary/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def delivery_summary(request):
    """
    Return count totals for the requesting user across
    client / courier / recipient roles. Useful for a
    dashboard card without fetching the full list.
    """

    user = request.user

    as_client_qs = Deliveries.objects.filter(client=user)
    as_courier_qs = Deliveries.objects.filter(delivered_by=user)
    as_recipient_qs = Deliveries.objects.filter(delivered_to=user)

    def _counts(qs):
        return {
            "total": qs.count(),
            "pending": qs.filter(
                status=Deliveries.STATUS_PENDING
            ).count(),
            "delivered": qs.filter(
                status=Deliveries.STATUS_DELIVERED
            ).count(),
            "cancelled": qs.filter(
                status=Deliveries.STATUS_CANCELLED
            ).count(),
            "failed": qs.filter(
                status=Deliveries.STATUS_FAILED
            ).count(),
        }

    return Response(
        {
            "as_client": _counts(as_client_qs),
            "as_courier": _counts(as_courier_qs),
            "as_recipient": _counts(as_recipient_qs),
        },
        status=status.HTTP_200_OK,
    )