# feed_data/feed_views/businesses_view.py
# ============================================================
# Feed helpers — serializers + item builders + ranking.
#
# No views here. The actual views live in this same package
# (or in feed_data/views.py) and import from this module.
#
# Each feed item carries:
#     business: { id, business_name }
#     owner:    { profile_image_url }
#
# Two builders are exported:
#     build_feed_page(...)            ← public, no personalisation
#     build_personalised_feed_page(...) ← personalised for one user
# ============================================================

from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework import serializers

from posts.models import Posts
from products.models import Products
from businesses.models import Businesses
from my_engagements.models import Like, Follow


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
    """
    One flat shape for both post and product items.
    `kind` tells the client which fields to read.
    """

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
# HELPERS  (unchanged from before)
# ============================================================

def _parse_limit(value, default=20, maximum=60):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


def _parse_kind(value):
    kind = (value or "all").lower()
    return kind if kind in ("all", "post", "product") else "all"


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
        "profile_image_url": getattr(business.owner, "profile_image_url", None),
    }


def _post_item(post):
    """Shape a Post as a feed item."""
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
    """Shape a Product as a feed item."""
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
# PUBLIC FEED BUILDER  (unchanged behaviour)
# ============================================================

def build_feed_page(base_q, kind, limit, before):
    """
    Reusable feed builder — newest first, no personalisation.

    Args:
        base_q:  Q object filtering Posts/Products by business criteria
        kind:    'all' | 'post' | 'product'
        limit:   max items to return
        before:  ISO datetime cursor (may be None)

    Returns:
        dict ready for Response(...):
            { count, next_cursor, has_more, results: [...] }
    """
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

    if before:
        posts_qs = posts_qs.filter(created_at__lt=before)
        products_qs = products_qs.filter(created_at__lt=before)

    per_stream = limit + 1

    posts = (
        list(posts_qs.order_by("-created_at")[:per_stream])
        if kind in ("all", "post") else []
    )
    products = (
        list(products_qs.order_by("-created_at")[:per_stream])
        if kind in ("all", "product") else []
    )

    items = [_post_item(p) for p in posts] + [_product_item(p) for p in products]
    items.sort(key=lambda x: x["created_at"], reverse=True)

    has_more = len(items) > limit
    page = items[:limit]
    next_cursor = (
        page[-1]["created_at"].isoformat() if has_more and page else None
    )

    serializer = FeedItemSerializer(page, many=True)

    return {
        "count": len(page),
        "next_cursor": next_cursor,
        "has_more": has_more,
        "results": serializer.data,
    }


# ============================================================
# PERSONALISED FEED BUILDER
# ============================================================

def _collect_user_signals(user):
    """
    Gather every personalisation signal in a small number of
    cheap queries. Returns a dict of sets.

    Nothing here does a join against Posts / Products — we only
    look up the small tables and let the caller merge the IDs
    in Python. That keeps the query count constant regardless
    of how many posts or products the DB holds.
    """

    # ── 1. Businesses the user has interacted with ────────
    #      "Interacted" = the user liked or followed one of
    #      the business's posts / products.

    like_ct_post = ContentType.objects.get_for_model(Posts)
    like_ct_product = ContentType.objects.get_for_model(Products)

    # Every Post the user liked
    liked_post_ids = set(
        Like.objects.filter(
            user=user, content_type=like_ct_post
        ).values_list("object_id", flat=True)
    )

    # Every Product the user liked
    liked_product_ids = set(
        Like.objects.filter(
            user=user, content_type=like_ct_product
        ).values_list("object_id", flat=True)
    )

    # Every Post the user followed
    followed_post_ids = set(
        Follow.objects.filter(
            user=user, content_type=like_ct_post
        ).values_list("object_id", flat=True)
    )

    # Every Product the user followed
    followed_product_ids = set(
        Follow.objects.filter(
            user=user, content_type=like_ct_product
        ).values_list("object_id", flat=True)
    )

    # ── 2. Businesses that own those engaged items ────────
    #      Any business the user has ever liked or followed
    #      the content of.

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

    # ── 3. Same-location businesses (mine) ────────────────
    #      Only if the user owns at least one business — we
    #      treat its location as the user's location.

    my_business = (
        Businesses.objects
        .filter(owner=user)
        .only("county", "city_town", "region")
        .first()
    )

    my_county = None
    my_city = None
    my_region = None

    if my_business is not None:
        my_county = (my_business.county or "").strip() or None
        my_city = (my_business.city_town or "").strip() or None
        my_region = (my_business.region or "").strip() or None

    # ── 4. Categories / types the user already engages with ─
    #      "I like groceries" → show more groceries.

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
    Return a numeric score for one feed item.

    Higher = shown earlier.

    Scoring is intentionally simple and additive. It is NOT
    a machine-learning model — it just nudges the feed so
    people see local + familiar content before random far
    away content. Recency is broken down by tier in the
    final sort, not by score, so a fresh far-away post can
    still outrank an old local one inside the same tier.
    """

    score = 0

    # ── Location ─────────────────────────────────────────
    if signals["my_region"] and business.region:
        if business.region.strip().lower() == signals["my_region"].lower():
            score += 40

    if signals["my_city"] and business.city_town:
        if business.city_town.strip().lower() == signals["my_city"].lower():
            score += 30

    if signals["my_county"] and business.county:
        if business.county.strip().lower() == signals["my_county"].lower():
            score += 20

    # ── Already engaged business ─────────────────────────
    if business.id in signals["engaged_business_ids"]:
        score += 60

    # ── Same category / type as something I engage with ──
    if business.business_category in signals["preferred_categories"]:
        score += 10

    if business.business_type in signals["preferred_types"]:
        score += 8

    # ── Small tie-breaker: engagement on this item itself ─
    #      (likes_count already cached on the model)
    score += min(getattr(item, "likes_count", 0), 25)
    score += min(getattr(item, "follows_count", 0), 15)

    return score


def build_personalised_feed_page(user, base_q, kind, limit, before):
    """
    Personalised variant of build_feed_page.

    Ranking:

        1. Businesses the user already likes/follows
        2. Same region, then same city, then same county
        3. Same category / business type
        4. Popular (likes + follows) as a soft tie-breaker
        5. Recency within the same score tier

    Pagination is by `created_at` cursor, same as the public
    feed, so `has_more` / `next_cursor` keep working with the
    same client logic.

    Args:
        user:    the requesting user (Accounts instance)
        base_q:  Q object filtering Posts/Products
        kind:    'all' | 'post' | 'product'
        limit:   max items to return
        before:  ISO datetime cursor (may be None)

    Returns:
        dict ready for Response(...)
    """

    # ── 0. Signals ───────────────────────────────────────
    signals = _collect_user_signals(user)

    # ── 1. Fetch a wider window than usual ───────────────
    #      We rank in Python, so we need a bigger candidate
    #      pool than `limit`. 4× is a good balance between
    #      quality and cost — it caps the extra work at a
    #      few hundred rows regardless of `limit`.
    pool_size = max(limit * 4, 40)

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

    if before:
        posts_qs = posts_qs.filter(created_at__lt=before)
        products_qs = products_qs.filter(created_at__lt=before)

    posts = (
        list(posts_qs.order_by("-created_at")[:pool_size])
        if kind in ("all", "post") else []
    )
    products = (
        list(products_qs.order_by("-created_at")[:pool_size])
        if kind in ("all", "product") else []
    )

    # ── 2. Score each candidate ──────────────────────────
    scored = []

    for post in posts:
        scored.append({
            "score": _score_item(post, post.business, signals),
            "kind": "post",
            "created_at": post.created_at,
            "obj": post,
        })

    for product in products:
        scored.append({
            "score": _score_item(product, product.business, signals),
            "kind": "product",
            "created_at": product.created_at,
            "obj": product,
        })

    # ── 3. Sort: score DESC, then created_at DESC ────────
    scored.sort(
        key=lambda row: (row["score"], row["created_at"]),
        reverse=True,
    )

    # ── 4. Build the page ────────────────────────────────
    page_rows = scored[:limit]

    items = [
        _post_item(row["obj"]) if row["kind"] == "post"
        else _product_item(row["obj"])
        for row in page_rows
    ]

    # ── 5. Cursor + has_more ─────────────────────────────
    #      Because we rank in Python, the cursor is the
    #      created_at of the last item on this page — the
    #      next request asks for everything strictly older
    #      than that, then re-ranks. Same contract as the
    #      public builder.
    has_more = len(scored) > limit
    next_cursor = (
        page_rows[-1]["created_at"].isoformat()
        if has_more and page_rows
        else None
    )

    serializer = FeedItemSerializer(items, many=True)

    return {
        "count": len(items),
        "next_cursor": next_cursor,
        "has_more": has_more,
        "results": serializer.data,
    }