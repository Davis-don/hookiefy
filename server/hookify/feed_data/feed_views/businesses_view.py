# feed_data/feed_views/businesses_view.py
# ============================================================
# Feed helpers — serializers + item builders.
#
# No views here. The actual views live in this same package
# (or in feed_data/views.py) and import from this module.
#
# Each feed item carries:
#     business: { id, business_name }
#     owner:    { profile_image_url }
# ============================================================

from rest_framework import serializers

from posts.models import Posts
from products.models import Products


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
# HELPERS
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


def build_feed_page(base_q, kind, limit, before):
    """
    Reusable feed builder.

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