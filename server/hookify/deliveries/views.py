# deliveries/views.py

import logging

from django.db.models import Q

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Deliveries
from .serializers import DeliverySerializer


logger = logging.getLogger(__name__)


# ============================================================
# LIST — MY DELIVERIES
# GET /deliveries/
# ============================================================
#
# One endpoint, one purpose: return every delivery the
# requesting user is involved in.
#
# A delivery involves a user in three ways:
#   • they're the `client` (the buyer)
#   • they're the `delivered_by` (the courier)
#   • they're the `delivered_to` (the recipient)
#
# Any of the three is enough to see the row. The vast
# majority of deliveries have all three pointing at the
# same or two people (buyer ≈ courier for the seller-
# ships-own-item case, buyer = recipient for a personal
# order), so a single user often sees a delivery through
# more than one lens. De-duplication is handled by the DB
# — one row per delivery, matched by OR of the three FKs.
#
# Optional query params let the frontend narrow without
# new endpoints:
#
#   ?role=client|courier|recipient  — narrow by involvement
#   ?status=pending|delivered|...   — narrow by state
#   ?town=<name>                    — narrow by destination
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_deliveries(request):
    """
    Return deliveries where the requesting user is the
    client, courier, or recipient.

    Query params:
        role   — 'client' | 'courier' | 'recipient'
                 (default: all three)
        status — 'pending' | 'delivered' | 'cancelled' | 'failed'
        town   — filter by destination (case-insensitive)
    """

    user = request.user

    role = (request.query_params.get("role") or "").lower()
    status_filter = (
        request.query_params.get("status") or ""
    ).lower()
    town = (request.query_params.get("town") or "").strip()

    # ── Role filter ────────────────────────────────────────
    #
    # If a role is specified, narrow to that relationship.
    # If not, return anything the user is involved in,
    # through any of the three FKs.
    #
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

    # ── Status filter ──────────────────────────────────────
    if status_filter in (
        Deliveries.STATUS_PENDING,
        Deliveries.STATUS_DELIVERED,
        Deliveries.STATUS_CANCELLED,
        Deliveries.STATUS_FAILED,
    ):
        qs = qs.filter(status=status_filter)

    # ── Town filter ────────────────────────────────────────
    if town:
        qs = qs.filter(town__iexact=town)

    # ── Eager-load every related row ───────────────────────
    #
    # Every delivery in the response references five other
    # rows: the payment, the client, the product, the
    # courier, and the recipient. Without select_related,
    # a list of 25 deliveries would trigger 25 × 5 extra
    # queries when the serializer walks those relations.
    #
    # prefetch_related("product__images") pulls the product
    # images in a separate query so `get_product_image_url`
    # can resolve `product.primary_image` from the
    # prefetched cache instead of per-row.
    #
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