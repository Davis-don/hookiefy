# feed_data/feed_views/businesses_view.py
# ============================================================
# Feed helpers — serializers + item builders + ranking.
#
# Pagination: cursor-based on `created_at`. Each response
# carries `next_cursor` (ISO datetime) and `has_more`. The
# client passes `?before=<next_cursor>` to fetch the next
# page. Page size defaults to 10, hard maximum 50.
#
# Two builders are exported:
#     build_feed_page(...)              ← public, no personalisation
#     build_personalised_feed_page(...) ← personalised for one user
# ============================================================

from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from posts.models import Posts
from products.models import Products
from businesses.models import Businesses
from my_engagements.models import Like, Follow


# ============================================================
# PAGINATION DEFAULTS
# ============================================================

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


# ============================================================
# MINIMAL BUSINESS + OWNER SHAPE
# ============================================================

class BusinessMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    business_name = serializers.CharField()


class OwnerMiniSerializer(serializers.Serializer):
    profile_image_url = serializers.URLField(
        allow_null=True,
        allow_blank=True,
    )


# ============================================================
# FEED ITEM SERIALIZER
# ============================================================

class FeedItemSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("post", "product"))
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    views = serializers.IntegerField()

    # Post-only
    title = serializers.CharField(required=False, allow_blank=True)
    body = serializers.CharField(required=False, allow_blank=True)
    image_public_id = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
    )

    # Product-only
    name = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        required=False, allow_null=True,
    )
    extra_images = serializers.ListField(
        child=serializers.URLField(),
        required=False, default=list,
    )
    properties = serializers.ListField(
        child=serializers.DictField(),
        required=False, default=list,
    )

    # Shared
    image_url = serializers.URLField(allow_null=True)
    business = BusinessMiniSerializer()
    owner = OwnerMiniSerializer(allow_null=True)


# ============================================================
# QUERY-PARAM PARSING
# ============================================================

def _parse_limit(value, default=DEFAULT_PAGE_SIZE, maximum=MAX_PAGE_SIZE):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


def _parse_kind(value):
    kind = (value or "all").lower()
    return kind if kind in ("all", "post", "product") else "all"


def _parse_before(value):
    """
    Parse the ISO cursor. Returns a timezone-aware datetime,
    or None for the first page.
    """
    if not value:
        return None
    from django.utils.dateparse import parse_datetime
    from django.utils import timezone

    parsed = parse_datetime(value)
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone=timezone.utc)
    return parsed


# ============================================================
# ITEM BUILDERS
# ============================================================

def _business_payload(business):
    if business is None:
        return None
    return {
        "id": business.id,
        "business_name": business.business_name,
    }


def _owner_payload(business):
    if business is None or business.owner is None:
        return None
    return {
        "profile_image_url": getattr(
            business.owner, "profile_image_url", None
        ),
    }


def _post_item(post):
    business = post.business
    return {
        "kind": "post",
        "id": post.id,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "views": post.views,
        "title": post.title,
        "body": post.body,
        "image_url": post.image_url,
        "image_public_id": post.image_public_id,
        "business": _business_payload(business),
        "owner": _owner_payload(business),
    }


def _product_item(product):
    business = product.business
    primary = product.primary_image

    extra_images = [
        img.image_url
        for img in product.images.all()
        if primary is None or img.id != primary.id
    ]

    properties = [
        {"name": p.name, "value": p.value}
        for p in product.property_items.all()
        if p.name and p.value
    ]

    return {
        "kind": "product",
        "id": product.id,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
        "views": product.views,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "image_url": primary.image_url if primary else None,
        "extra_images": extra_images,
        "properties": properties,
        "business": _business_payload(business),
        "owner": _owner_payload(business),
    }


# ============================================================
# PAGINATION — shared cursor computation
# ============================================================

def _paginate(items, limit, kind):
    """
    Given a list of ranked/sorted items (each a dict with
    `kind`, `created_at`, plus either a Post or Product obj),
    return:

        {
            "count": ...,
            "next_cursor": ...,
            "has_more": ...,
            "results": [...]
        }

    The cursor is the `created_at` of the OLDEST item on the
    page — not the last-ranked item — so pagination never
    skips or repeats rows. The next request asks for
    everything strictly older than that timestamp.
    """
    has_more = len(items) > limit
    page = items[:limit]

    # Cursor = oldest created_at in the page (guarantees no gaps).
    next_cursor = None
    if has_more and page:
        oldest = min(row["created_at"] for row in page)
        next_cursor = oldest.isoformat()

    # Rebuild the items in the order the caller wanted (ranked
    # or by recency) — the cursor computation above does NOT
    # reorder, it just picks a timestamp.
    payload = [
        _post_item(row["obj"]) if row["kind"] == "post"
        else _product_item(row["obj"])
        for row in page
    ]

    return {
        "count": len(payload),
        "next_cursor": next_cursor,
        "has_more": has_more,
        "results": FeedItemSerializer(payload, many=True).data,
    }


# ============================================================
# PUBLIC FEED BUILDER
# ============================================================

def build_feed_page(base_q, kind, limit, before):
    """
    Newest-first feed — no personalisation.

    Pagination contract:
        - `before` is an ISO datetime (the `next_cursor` from
          the previous page). First page: omit it.
        - Returns at most `limit` items.
        - `next_cursor` is the oldest `created_at` in the
          returned page; the client echoes it as `?before=`
          to fetch the next page.
    """
    limit = _parse_limit(limit)
    before_dt = _parse_before(before)

    posts_qs = (
        Posts.objects
        .filter(base_q)
        .select_related("business", "business__owner")
    )
    products_qs = (
        Products.objects
        .filter(base_q)
        .select_related("business", "business__owner")
        .prefetch_related("images", "property_items")
    )

    if before_dt:
        posts_qs = posts_qs.filter(created_at__lt=before_dt)
        products_qs = products_qs.filter(created_at__lt=before_dt)

    # Fetch one extra per stream so has_more is accurate.
    per_stream = limit + 1

    posts = (
        list(posts_qs.order_by("-created_at")[:per_stream])
        if kind in ("all", "post") else []
    )
    products = (
        list(products_qs.order_by("-created_at")[:per_stream])
        if kind in ("all", "product") else []
    )

    items = (
        [{"kind": "post", "created_at": p.created_at, "obj": p} for p in posts]
        + [{"kind": "product", "created_at": p.created_at, "obj": p} for p in products]
    )
    items.sort(key=lambda x: x["created_at"], reverse=True)

    return _paginate(items, limit, kind)


# ============================================================
# PERSONALISED FEED BUILDER
# ============================================================

def _collect_user_signals(user):
    """
    Gather every personalisation signal in a small number of
    cheap queries.
    """
    like_ct_post = ContentType.objects.get_for_model(Posts)
    like_ct_product = ContentType.objects.get_for_model(Products)

    liked_post_ids = set(
        Like.objects.filter(
            user=user, content_type=like_ct_post,
        ).values_list("object_id", flat=True)
    )
    liked_product_ids = set(
        Like.objects.filter(
            user=user, content_type=like_ct_product,
        ).values_list("object_id", flat=True)
    )
    followed_post_ids = set(
        Follow.objects.filter(
            user=user, content_type=like_ct_post,
        ).values_list("object_id", flat=True)
    )
    followed_product_ids = set(
        Follow.objects.filter(
            user=user, content_type=like_ct_product,
        ).values_list("object_id", flat=True)
    )

    engaged_business_ids = set()
    if liked_post_ids:
        engaged_business_ids.update(
            Posts.objects
            .filter(id__in=liked_post_ids)
            .values_list("business_id", flat=True)
        )
    if followed_post_ids:
        engaged_business_ids.update(
            Posts.objects
            .filter(id__in=followed_post_ids)
            .values_list("business_id", flat=True)
        )
    if liked_product_ids:
        engaged_business_ids.update(
            Products.objects
            .filter(id__in=liked_product_ids)
            .values_list("business_id", flat=True)
        )
    if followed_product_ids:
        engaged_business_ids.update(
            Products.objects
            .filter(id__in=followed_product_ids)
            .values_list("business_id", flat=True)
        )

    my_business = (
        Businesses.objects
        .filter(owner=user)
        .only("county", "city_town", "region")
        .first()
    )

    my_county = my_city = my_region = None
    if my_business is not None:
        my_county = (my_business.county or "").strip() or None
        my_city = (my_business.city_town or "").strip() or None
        my_region = (my_business.region or "").strip() or None

    preferred_categories = set()
    preferred_types = set()
    if engaged_business_ids:
        for category, btype in (
            Businesses.objects
            .filter(id__in=engaged_business_ids)
            .values_list("business_category", "business_type")
        ):
            if category:
                preferred_categories.add(category)
            if btype:
                preferred_types.add(btype)

    return {
        "engaged_business_ids": engaged_business_ids,
        "my_county": my_county,
        "my_city": my_city,
        "my_region": my_region,
        "preferred_categories": preferred_categories,
        "preferred_types": preferred_types,
    }


def _score_item(item, business, signals):
    """
    Higher = shown earlier. Additive scoring — not ML.
    """
    score = 0

    if signals["my_region"] and business.region:
        if business.region.strip().lower() == signals["my_region"].lower():
            score += 40

    if signals["my_city"] and business.city_town:
        if business.city_town.strip().lower() == signals["my_city"].lower():
            score += 30

    if signals["my_county"] and business.county:
        if business.county.strip().lower() == signals["my_county"].lower():
            score += 20

    if business.id in signals["engaged_business_ids"]:
        score += 60

    if business.business_category in signals["preferred_categories"]:
        score += 10

    if business.business_type in signals["preferred_types"]:
        score += 8

    score += min(getattr(item, "likes_count", 0), 25)
    score += min(getattr(item, "follows_count", 0), 15)

    return score


def build_personalised_feed_page(user, base_q, kind, limit, before):
    """
    Personalised variant of build_feed_page.

    Ranking:
        1. Businesses the user already likes/follows
        2. Same region → city → county
        3. Same category / business type
        4. Popularity tie-breaker
        5. Recency within the same score tier

    Pagination:
        - `before` is the ISO cursor.
        - We rank only the *candidates strictly older than
          `before`* (when provided), then take the top `limit`.
        - `next_cursor` = oldest `created_at` in this page,
          so the next request can safely ask for `<next_cursor`.
    """
    limit = _parse_limit(limit)
    before_dt = _parse_before(before)

    signals = _collect_user_signals(user)

    # Fetch a wider pool so ranking has material to work with,
    # but only ever look at candidates older than `before`.
    pool_size = max(limit * 5, 60)

    posts_qs = (
        Posts.objects
        .filter(base_q)
        .select_related("business", "business__owner")
    )
    products_qs = (
        Products.objects
        .filter(base_q)
        .select_related("business", "business__owner")
        .prefetch_related("images", "property_items")
    )

    if before_dt:
        posts_qs = posts_qs.filter(created_at__lt=before_dt)
        products_qs = products_qs.filter(created_at__lt=before_dt)

    posts = (
        list(posts_qs.order_by("-created_at")[:pool_size])
        if kind in ("all", "post") else []
    )
    products = (
        list(products_qs.order_by("-created_at")[:pool_size])
        if kind in ("all", "product") else []
    )

    scored = (
        [{"kind": "post", "created_at": p.created_at, "obj": p,
          "score": _score_item(p, p.business, signals)} for p in posts]
        + [{"kind": "product", "created_at": p.created_at, "obj": p,
            "score": _score_item(p, p.business, signals)} for p in products]
    )

    scored.sort(
        key=lambda row: (row["score"], row["created_at"]),
        reverse=True,
    )

    return _paginate(scored, limit, kind)