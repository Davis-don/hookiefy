# feed_data/feed_views/businesses_view.py
# ============================================================
# Feed helpers — serializers + item builders + ranking.
#
# Pagination: cursor-based on `created_at`. Each response
# carries `next_cursor` (ISO datetime) and `has_more`. The
# client passes `?before=<next_cursor>` to fetch the next
# page. Page size defaults to 10, hard maximum 50.
#
# Builders exported:
#     build_feed_page(...)              ← public, no personalisation
#     build_personalised_feed_page(...) ← personalised for one user
#
# Both accept a `youpata_only` kwarg. When True, only rows
# where `is_youpata_managed=True` are returned. This lets the
# per-tab endpoints (products / posts / youpata) share the
# same pagination and serialisation code.
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
# DELIVERY POLICY — canonical values
# ============================================================
#
# Keep these in sync with:
#   - Products.DELIVERY_CHOICES (backend model)
#   - DeliveryScope              (frontend feedApi.ts)
#
# 'everywhere' → ships to any town the buyer enters
# 'specific'   → ships only to the towns in delivery_towns
# 'none'       → pickup-only, digital, or unavailable
# ============================================================

DELIVERY_SCOPES = ("everywhere", "specific", "none")
DEFAULT_DELIVERY_SCOPE = "none"


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

    is_youpata_managed = serializers.BooleanField(default=False)

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
    quantity = serializers.IntegerField(required=False, default=0)
    in_stock = serializers.BooleanField(required=False, default=True)
    extra_images = serializers.ListField(
        child=serializers.URLField(),
        required=False, default=list,
    )
    properties = serializers.ListField(
        child=serializers.DictField(),
        required=False, default=list,
    )

    # ── Product-only — delivery policy ───────────────────
    # Must stay in sync with:
    #   - Products.DELIVERY_CHOICES on the model
    #   - DeliveryScope on the frontend (feedApi.ts)
    delivery_scope = serializers.ChoiceField(
        choices=DELIVERY_SCOPES,
        required=False,
        allow_null=True,
    )
    delivery_towns = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    can_be_delivered = serializers.BooleanField(
        required=False,
        default=True,
    )

    # Shared
    image_url = serializers.URLField(allow_null=True)
    business = BusinessMiniSerializer()
    owner = OwnerMiniSerializer(allow_null=True)

    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )


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
        parsed = timezone.make_aware(parsed, timezone.utc)
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


def _phone_payload(business):
    """
    Seller phone — the business owner's `Accounts.phone_number`.
    Returns a stripped string or `None`.
    """
    if business is None:
        return None
    owner = getattr(business, "owner", None)
    if owner is None:
        return None
    raw = owner.phone_number
    if not raw:
        return None
    return str(raw).strip() or None


# ── Delivery payload extraction ──────────────────────────

def _normalise_scope(raw):
    """
    Coerce anything the DB might hold into one of
    DELIVERY_SCOPES. Unknown / NULL → 'none'.
    """
    if not raw:
        return DEFAULT_DELIVERY_SCOPE
    s = str(raw).strip().lower()
    return s if s in DELIVERY_SCOPES else DEFAULT_DELIVERY_SCOPE


def _delivery_towns_payload(product, scope):
    """
    Return `list[str]` of town names for a product.

    Handles the shapes the column might take:

      1. JSONField / ArrayField of strings:
             product.delivery_towns → ["Nairobi", ...]
      2. Comma-separated CharField / TextField:
             product.delivery_towns → "Nairobi, Mombasa"
      3. M2M / reverse-FK manager (future-proofing):
             product.delivery_towns.all() → [Town, ...]
      4. None / empty

    Only returns towns when scope is 'specific' — the
    contract says the list is empty otherwise.
    """
    if scope != "specific":
        return []

    raw = getattr(product, "delivery_towns", None)
    if raw is None:
        return []

    # Case 1: already a list of strings
    if isinstance(raw, (list, tuple)):
        return [str(t).strip() for t in raw if str(t).strip()]

    # Case 2: comma-separated string
    if isinstance(raw, str):
        return [t.strip() for t in raw.split(",") if t.strip()]

    # Case 3: related manager (M2M / reverse FK)
    if hasattr(raw, "all"):
        names = []
        for row in raw.all():
            name = getattr(row, "name", None)
            if not name and hasattr(row, "town"):
                name = getattr(row.town, "name", None)
            if name:
                names.append(str(name).strip())
        return [n for n in names if n]

    return []


def _delivery_payload(product):
    """
    Build the three delivery keys for a product payload.
    """
    scope = _normalise_scope(getattr(product, "delivery_scope", None))
    towns = _delivery_towns_payload(product, scope)
    return {
        "delivery_scope": scope,
        "delivery_towns": towns,
        "can_be_delivered": scope != "none",
    }


def _post_item(post):
    business = post.business
    return {
        "kind": "post",
        "id": post.id,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "views": post.views,
        "is_youpata_managed": post.is_youpata_managed,
        "title": post.title,
        "body": post.body,
        "image_url": post.image_url,
        "image_public_id": post.image_public_id,
        "business": _business_payload(business),
        "owner": _owner_payload(business),
        "phone_number": _phone_payload(business),
        # No delivery_* keys — the frontend type marks them
        # optional, and DeliveryBadge only renders on products.
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

    delivery = _delivery_payload(product)

    return {
        "kind": "product",
        "id": product.id,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
        "views": product.views,
        "is_youpata_managed": product.is_youpata_managed,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "quantity": product.quantity,
        "in_stock": product.in_stock,
        "image_url": primary.image_url if primary else None,
        "extra_images": extra_images,
        "properties": properties,
        "business": _business_payload(business),
        "owner": _owner_payload(business),
        "phone_number": _phone_payload(business),
        # ── Delivery policy ─────────────────────────────
        "delivery_scope": delivery["delivery_scope"],
        "delivery_towns": delivery["delivery_towns"],
        "can_be_delivered": delivery["can_be_delivered"],
    }


# ============================================================
# PAGINATION — shared cursor computation
# ============================================================

def _paginate(items, limit, kind):
    """
    Given a list of ranked/sorted items (each a dict with
    `kind`, `created_at`, plus either a Post or Product obj),
    return the standard feed envelope.
    """
    has_more = len(items) > limit
    page = items[:limit]

    next_cursor = None
    if has_more and page:
        oldest = min(row["created_at"] for row in page)
        next_cursor = oldest.isoformat()

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
# PREFETCH HELPER
# ============================================================
#
# Only *relational* fields can be prefetched. `delivery_scope`
# and `delivery_towns` are scalar columns on Products, so they
# are excluded on purpose — there's no N+1 to avoid, and
# prefetch_related() raises ValueError on them.
# ============================================================

def _prefetch_products(qs):
    """
    Eagerly load every *relational* field `_product_item`
    reads. Scalar columns (delivery_scope, delivery_towns,
    name, price, ...) need no prefetch.
    """
    return qs.prefetch_related(
        "images",
        "property_items",
    )


# ============================================================
# PUBLIC FEED BUILDER
# ============================================================

def build_feed_page(base_q, kind, limit, before, youpata_only=False):
    """
    Newest-first feed — no personalisation.

    `youpata_only=True` restricts to rows where
    `is_youpata_managed=True`. Used by the Youpata tab.
    """
    limit = _parse_limit(limit)
    before_dt = _parse_before(before)

    posts_qs = (
        Posts.objects
        .filter(base_q)
        .select_related("business", "business__owner")
    )
    products_qs = _prefetch_products(
        Products.objects
        .filter(base_q)
        .select_related("business", "business__owner")
    )

    if youpata_only:
        posts_qs = posts_qs.filter(is_youpata_managed=True)
        products_qs = products_qs.filter(is_youpata_managed=True)

    if before_dt:
        posts_qs = posts_qs.filter(created_at__lt=before_dt)
        products_qs = products_qs.filter(created_at__lt=before_dt)

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


def build_personalised_feed_page(
    user,
    base_q,
    kind,
    limit,
    before,
    youpata_only=False,
):
    """
    Personalised variant of build_feed_page.
    """
    limit = _parse_limit(limit)
    before_dt = _parse_before(before)

    signals = _collect_user_signals(user)

    pool_size = max(limit * 5, 60)

    posts_qs = (
        Posts.objects
        .filter(base_q)
        .select_related("business", "business__owner")
    )
    products_qs = _prefetch_products(
        Products.objects
        .filter(base_q)
        .select_related("business", "business__owner")
    )

    if youpata_only:
        posts_qs = posts_qs.filter(is_youpata_managed=True)
        products_qs = products_qs.filter(is_youpata_managed=True)

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