# feed_data/views.py
# ============================================================
# Feed views.
#
#   public_businesses_feed  → GET /feed/businesses/
#   my_businesses_feed      → GET /feed/businesses/mine/
#   my_feed                 → GET /feed/stories/mine/  (re-export)
# ============================================================

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# Re-exported from the story view file — its view function stays there.
from .feed_views.story_view import my_feed

# Helpers only — no views in this module.
from .feed_views.businesses_view import (
    build_feed_page,
    _parse_limit,
    _parse_kind,
)


# ============================================================
# 1. PUBLIC FEED — GET /feed/businesses/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def public_businesses_feed(request):
    """
    Public mixed feed of Posts + Products from active businesses.

    Query params:
        kind     — 'all' (default) | 'post' | 'product'
        limit    — 1..60, default 20
        before   — ISO datetime cursor
        county   — filter by county
        region   — filter by region
        category — 'goods' | 'services'
    """

    kind = _parse_kind(request.query_params.get("kind"))
    limit = _parse_limit(
        request.query_params.get("limit"), default=20, maximum=60
    )
    before = request.query_params.get("before")

    county = request.query_params.get("county")
    region = request.query_params.get("region")
    category = request.query_params.get("category")

    base = Q(business__status="active")

    if county:
        base &= Q(business__county__iexact=county)
    if region:
        base &= Q(business__region__iexact=region)
    if category in ("goods", "services"):
        base &= Q(business__business_category=category)

    payload = build_feed_page(base, kind, limit, before)
    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# 2. PERSONAL FEED — GET /feed/businesses/mine/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_businesses_feed(request):
    """
    Personalised feed for the logged-in user.

    Excludes anything owned by the requesting user, so the feed
    shows only OTHER people's posts and products.

    Query params:
        kind     — 'all' (default) | 'post' | 'product'
        limit    — 1..60, default 20
        before   — ISO datetime cursor
        status   — business status filter (default 'active')
        category — 'goods' | 'services'
    """

    kind = _parse_kind(request.query_params.get("kind"))
    limit = _parse_limit(
        request.query_params.get("limit"), default=20, maximum=60
    )
    before = request.query_params.get("before")

    status_filter = (
        request.query_params.get("status") or "active"
    ).lower()
    category = request.query_params.get("category")

    # Exclude the requesting user's own content
    base = ~Q(business__owner=request.user)

    if status_filter and status_filter != "all":
        base &= Q(business__status=status_filter)
    if category in ("goods", "services"):
        base &= Q(business__business_category=category)

    payload = build_feed_page(base, kind, limit, before)
    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# PUBLIC API
# ============================================================

__all__ = [
    "public_businesses_feed",
    "my_businesses_feed",
    "my_feed",
]