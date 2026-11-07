# feed_data/views.py
# ============================================================
# Feed views.
#
# Public feeds (no auth required — AllowAny):
#
#     GET /feed/businesses/                    → mixed (default)
#     GET /feed/businesses/all/                → explicit mixed alias
#     GET /feed/businesses/products/           → products only
#     GET /feed/businesses/posts/              → posts only
#     GET /feed/businesses/youpata/            → managed, mixed
#     GET /feed/businesses/youpata/products/   → managed products
#     GET /feed/businesses/youpata/posts/      → managed posts
#
# Personalised feed (auth required — IsAuthenticated):
#
#     GET /feed/businesses/mine/
#
# Story feeds (re-exported from feed_views/story_view.py):
#
#     GET /feed/stories/mine/
#     GET /feed/stories/
# ============================================================

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# Re-exported from the story view file — those views live there.
from .feed_views.story_view import (
    my_feed,
    personalised_stories_feed,
)

# Helpers only — no views in this module.
from .feed_views.businesses_view import (
    build_feed_page,
    build_personalised_feed_page,
    _parse_limit,
    _parse_kind,
)


# ============================================================
# SHARED PLUMBING
# ============================================================
#
# Every public feed endpoint shares the same filter-building
# and response-shaping logic. Factoring it out keeps each
# endpoint to one or two lines of "what kind / managed-only
# do I want".
# ============================================================

def _public_base_q(request):
    """
    Build the `Q` filter from the shared query params:

        ?county=<name>
        ?region=<name>
        ?category=goods|services

    Always restricts to active businesses.
    """
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

    return base


def _feed_response(request, kind, youpata_only):
    """
    Shared plumbing for every public feed endpoint.

    Reads `limit` and `before` from the request, calls
    `build_feed_page`, and returns the standard envelope.
    """
    limit = _parse_limit(
        request.query_params.get("limit"), default=20, maximum=60
    )
    before = request.query_params.get("before")

    payload = build_feed_page(
        _public_base_q(request),
        kind,
        limit,
        before,
        youpata_only=youpata_only,
    )
    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# 1. PUBLIC MIXED FEED — GET /feed/businesses/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def public_businesses_feed(request):
    """
    Public mixed feed of Posts + Products from active businesses.
    Newest first.

    Query params:
        kind     — 'all' (default) | 'post' | 'product'
        limit    — 1..60, default 20
        before   — ISO datetime cursor
        county   — filter by county
        region   — filter by region
        category — 'goods' | 'services'
    """
    kind = _parse_kind(request.query_params.get("kind"))
    return _feed_response(request, kind, youpata_only=False)


# ============================================================
# 2. ALL FEED — GET /feed/businesses/all/
# ============================================================
#
# Explicit alias for the mixed feed. The frontend "All" tab
# uses this URL so its data source is unambiguous even if
# the default behaviour of /feed/businesses/ ever changes.
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def all_feed(request):
    return _feed_response(request, kind="all", youpata_only=False)


# ============================================================
# 3. PRODUCTS FEED — GET /feed/businesses/products/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def products_feed(request):
    """
    Products only. Mixed managed + unmanaged, newest first.
    """
    return _feed_response(request, kind="product", youpata_only=False)


# ============================================================
# 4. POSTS FEED — GET /feed/businesses/posts/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def posts_feed(request):
    """
    Posts only. Mixed managed + unmanaged, newest first.
    """
    return _feed_response(request, kind="post", youpata_only=False)


# ============================================================
# 5. YOUPATA FEED — GET /feed/businesses/youpata/
# ============================================================
#
# Mixed feed restricted to `is_youpata_managed=True`. Both
# managed posts and managed products, newest first.
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def youpata_feed(request):
    kind = _parse_kind(request.query_params.get("kind"))
    return _feed_response(request, kind=kind, youpata_only=True)


# ============================================================
# 6. YOUPATA PRODUCTS — GET /feed/businesses/youpata/products/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def youpata_products_feed(request):
    return _feed_response(request, kind="product", youpata_only=True)


# ============================================================
# 7. YOUPATA POSTS — GET /feed/businesses/youpata/posts/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def youpata_posts_feed(request):
    return _feed_response(request, kind="post", youpata_only=True)


# ============================================================
# 8. PERSONAL FEED — GET /feed/businesses/mine/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_businesses_feed(request):
    """
    Personalised feed for the logged-in user.

    Excludes anything owned by the requesting user, so the
    feed shows only OTHER people's posts and products.

    Ranking blends:
        - Businesses the user already likes / follows
        - Same region / city / county as the user's own business
        - Same category / business type as businesses they
          already engage with
        - Popularity (likes + follows) as a soft tie-breaker
        - Recency within each tier

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

    payload = build_personalised_feed_page(
        request.user, base, kind, limit, before
    )
    return Response(payload, status=status.HTTP_200_OK)


# ============================================================
# PUBLIC API
# ============================================================

__all__ = [
    # Public feeds
    "public_businesses_feed",
    "all_feed",
    "products_feed",
    "posts_feed",
    "youpata_feed",
    "youpata_products_feed",
    "youpata_posts_feed",
    # Personalised
    "my_businesses_feed",
    # Story re-exports
    "my_feed",
    "personalised_stories_feed",
]