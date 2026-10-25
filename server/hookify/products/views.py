# products/views.py

import os
import re

from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from businesses.models import Businesses
from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
    ImageValidationError,
)

from subscription.guards import requires_active_subscription

from .models import Products, ProductImage, ProductProperty
from .serializers import (
    ProductSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
)


# ============================================================
# TEXT RULES  — keep in sync with serializers.py
# ============================================================

PRODUCT_NAME_MIN_LENGTH        = 3
PRODUCT_NAME_MAX_LENGTH        = 80
PRODUCT_DESCRIPTION_MIN_LENGTH = 10
PRODUCT_DESCRIPTION_MAX_LENGTH = 400

# Stock ceiling — keep in sync with serializers.py
PRODUCT_QUANTITY_MAX = 1_000_000

URL_PATTERNS = (
    re.compile(r"https?://", re.IGNORECASE),
    re.compile(r"\bwww\.", re.IGNORECASE),
    re.compile(
        r"\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
        r"\.(?:com|net|org|io|co|ke|app|dev|me|info|biz|xyz|shop|store|site|online|link|click|tv|ly|to|gl)\b",
        re.IGNORECASE,
    ),
)


# ============================================================
# IMAGE RULES — keep in sync with posts/views.py
# ============================================================

MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024   # 8 MB

ALLOWED_PRODUCT_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}

ALLOWED_PRODUCT_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

ALLOWED_PRODUCT_IMAGE_LABEL = "PNG, JPEG or WEBP"


def _has_url(value: str) -> bool:
    if not value:
        return False
    return any(p.search(value) for p in URL_PATTERNS)


def _check_text_field(value, field_label, min_len, max_len):
    """
    Mirrors the serializer check so the view returns a
    consistent error shape before touching the DB.
    Returns (trimmed_value, error_or_None).
    """
    value = (value or "").strip()

    if not value:
        return (None, f"{field_label} is required.")
    if len(value) < min_len:
        return (
            None,
            f"{field_label} must be at least {min_len} characters.",
        )
    if len(value) > max_len:
        return (None, f"{field_label} cannot exceed {max_len} characters.")
    if _has_url(value):
        return (None, f"{field_label} cannot contain links or URLs.")

    return (value, None)


def _check_quantity(value):
    """
    Mirrors the serializer check.
    Returns (value_or_None, error_or_None).
    """
    if value is None:
        return (None, "Quantity cannot be null.")
    if value < 0:
        return (None, "Quantity cannot be negative.")
    if value > PRODUCT_QUANTITY_MAX:
        return (
            None,
            f"Quantity cannot exceed {PRODUCT_QUANTITY_MAX}.",
        )
    return (value, None)


def _validate_product_image(image_file):
    """
    Return (ok, error_message).
    """
    if image_file is None:
        return (False, "An image is required.")

    content_type = (image_file.content_type or "").lower()
    if content_type not in ALLOWED_PRODUCT_IMAGE_TYPES:
        return (
            False,
            f"Unsupported file type. Please use {ALLOWED_PRODUCT_IMAGE_LABEL}.",
        )

    filename = (getattr(image_file, "name", "") or "").lower()
    extension = os.path.splitext(filename)[1]
    if extension not in ALLOWED_PRODUCT_IMAGE_EXTENSIONS:
        return (
            False,
            f"Unsupported file extension. Please use {ALLOWED_PRODUCT_IMAGE_LABEL}.",
        )

    size = getattr(image_file, "size", 0) or 0
    if size <= 0:
        return (False, "The image appears to be empty.")

    if size > MAX_PRODUCT_IMAGE_BYTES:
        mb_limit = MAX_PRODUCT_IMAGE_BYTES // (1024 * 1024)
        return (
            False,
            f"Image is too large. Maximum size is {mb_limit} MB.",
        )

    return (True, "")


def _validate_product_images(image_files):
    """
    Validate every image in the batch.
    """
    for index, image_file in enumerate(image_files):
        ok, err = _validate_product_image(image_file)
        if not ok:
            name = getattr(image_file, "name", None)
            if name:
                return (False, f'"{name}": {err}')
            return (False, f"Image {index + 1}: {err}")
    return (True, "")


# ============================================================
# HELPERS
# ============================================================

def _own_business_or_404(user, business_id):
    return (
        Businesses.objects
        .filter(id=business_id, owner=user)
        .first()
    )


def _own_product_or_404(user, product_id):
    return (
        Products.objects
        .filter(id=product_id, business__owner=user)
        .select_related("business")
        .prefetch_related("images", "property_items")
        .first()
    )


def _get_effective_plan(user):
    try:
        return user.effective_plan
    except Exception:
        return None


def _check_product_limit(user, business):
    plan = _get_effective_plan(user)

    if plan is None:
        return (
            False,
            0,
            None,
            (
                "Your account has no active subscription plan. "
                "Please contact support to start publishing products."
            ),
        )

    used = Products.objects.filter(business=business).count()
    limit = plan.products_limit

    if limit is None:
        return (True, used, None, "")

    if used >= limit:
        if limit == 1:
            message = (
                "You've reached the limit of your current plan — "
                "1 product per business. Upgrade to add more."
            )
        else:
            message = (
                f"You've reached the limit of your current plan — "
                f"{limit} products per business. Upgrade to add more."
            )
        return (False, used, limit, message)

    return (True, used, limit, "")


def _check_image_count_limit(user, business, incoming_count, existing_count=0):
    plan = _get_effective_plan(user)

    if plan is None:
        return (
            False,
            existing_count + incoming_count,
            None,
            (
                "Your account has no active subscription plan. "
                "Please contact support."
            ),
        )

    limit = plan.images_per_product
    total_after = existing_count + incoming_count

    if limit is None:
        return (True, total_after, None, "")

    if total_after > limit:
        if limit == 1:
            message = (
                "You've reached the limit of your current plan — "
                "1 image per product. Upgrade to add more images."
            )
        else:
            message = (
                f"You've reached the limit of your current plan — "
                f"{limit} images per product. "
                f"This request would give the product "
                f"{total_after} images. Upgrade to add more."
            )
        return (False, total_after, limit, message)

    return (True, total_after, limit, "")


# ────────────────────────────────────────────────────────────
# Subscription expiry check (same as posts/stories)
# ────────────────────────────────────────────────────────────

def _check_subscription_current(user):
    """
    Return (ok, error_dict).

    Returns (True, None) when the user has a currently valid
    subscription. Returns (False, {...}) with a ready-to-send
    error payload otherwise.
    """
    from subscription.models import Subscription

    current = (
        Subscription.objects
        .filter(user=user)
        .active()
        .first()
    )

    if current is not None and current.is_current:
        return (True, None)

    latest = (
        Subscription.objects
        .filter(user=user)
        .order_by("-created_at")
        .first()
    )

    if latest is None:
        return (
            False,
            {
                "message": (
                    "Your account has no subscription. "
                    "Subscribe to a plan to publish products."
                ),
                "code": "subscription_required",
            },
        )

    if latest.is_expired:
        return (
            False,
            {
                "message": (
                    f"Your subscription expired on "
                    f"{latest.end_date:%d %b %Y}. "
                    f"Renew your plan to publish new products."
                ),
                "code": "subscription_expired",
                "status": latest.status,
                "end_date": latest.end_date.isoformat()
                if latest.end_date else None,
                "days_since_expiry": (
                    (timezone.now() - latest.end_date).days
                    if latest.end_date else None
                ),
            },
        )

    return (
        False,
        {
            "message": (
                f"Your subscription is not currently active "
                f"(status: {latest.get_status_display()}). "
                f"Please activate a plan to publish products."
            ),
            "code": "subscription_inactive",
            "status": latest.status,
        },
    )


# ────────────────────────────────────────────────────────────
# Youpata-managed product flag
# ────────────────────────────────────────────────────────────

def _caller_creates_youpata_managed_products(user):
    """
    True if products created by this user should be flagged
    is_youpata_managed=True.

    Rules (mirror the account-creation endpoint):
        • superadmin caller              → True
        • is_youpata_managed=True caller → True
        • everyone else                  → False

    The client can never set the flag directly — it is always
    derived from who is making the request.
    """
    if getattr(user, "is_superadmin", False):
        return True
    return bool(getattr(user, "is_youpata_managed", False))


def _extract_properties_from_request(request):
    properties = []

    raw = request.data.get("properties")
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict) and item.get("name") and item.get("value"):
                properties.append({
                    "name": str(item["name"]).strip(),
                    "value": str(item["value"]).strip(),
                })
        if properties:
            return properties

    names = request.data.getlist("property_name") if hasattr(request.data, "getlist") else []
    values = request.data.getlist("property_value") if hasattr(request.data, "getlist") else []

    for name, value in zip(names, values):
        name = (name or "").strip()
        value = (value or "").strip()
        if name and value:
            properties.append({"name": name, "value": value})

    return properties


def _extract_images_from_request(request):
    files = []

    if hasattr(request.FILES, "getlist"):
        files = request.FILES.getlist("images")
        if not files:
            single = request.FILES.get("image")
            if single:
                files = [single]

    return [f for f in files if f]


def _save_properties(product, properties_data):
    product.property_items.all().delete()
    for index, prop in enumerate(properties_data):
        ProductProperty.objects.create(
            product=product,
            name=prop["name"],
            value=prop["value"],
            sort_order=index,
        )


def _save_images(product, image_files, replace=False):
    if replace:
        for img in product.images.all():
            if img.image_public_id:
                try:
                    delete_image_from_cloudinary(img.image_public_id)
                except Exception as e:
                    print(f"⚠️ Could not delete old product image: {e}")
        product.images.all().delete()

    existing_count = product.images.count()
    has_primary = product.images.filter(is_primary=True).exists()

    created = []
    for index, image_file in enumerate(image_files):
        try:
            upload_result = upload_image_to_cloudinary(
                image_file,
                folder="product_images",
            )
        except ImageValidationError:
            raise
        except Exception as e:
            raise RuntimeError(f"Image upload failed: {str(e)}")

        is_primary = (not has_primary) and (index == 0)

        created.append(
            ProductImage.objects.create(
                product=product,
                image_url=upload_result["url"],
                image_public_id=upload_result["public_id"],
                is_primary=is_primary,
                sort_order=existing_count + index,
            )
        )

    return created


# ============================================================
# LIST PRODUCTS OF A BUSINESS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_products(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    qs = (
        Products.objects
        .filter(business=business)
        .select_related("business", "business__owner")
        .prefetch_related("images", "property_items")
        .order_by("-created_at")
    )
    serializer = ProductSerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE PRODUCT
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def create_product(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── 0. Subscription must be current (not expired) ───────
    sub_ok, sub_error = _check_subscription_current(request.user)
    if not sub_ok:
        return Response(
            sub_error,
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 1. Plan limit ───────────────────────────────────────
    allowed, used, limit, message = _check_product_limit(
        request.user, business
    )

    if not allowed:
        return Response(
            {
                "message": message,
                "code": "product_limit_reached",
                "used": used,
                "limit": limit,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 2. Serializer validation ────────────────────────────
    serializer = ProductCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 3. Name ─────────────────────────────────────────────
    name = (serializer.validated_data.get("name") or "").strip()
    name_err = None
    if not name:
        name_err = "Product name is required."
    elif _has_url(name):
        name_err = "Product name cannot contain links or URLs."
    if name_err:
        return Response(
            {"name": [name_err]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Description ──────────────────────────────────────
    description, desc_err = _check_text_field(
        serializer.validated_data.get("description"),
        "Description",
        PRODUCT_DESCRIPTION_MIN_LENGTH,
        PRODUCT_DESCRIPTION_MAX_LENGTH,
    )
    if desc_err:
        return Response(
            {"description": [desc_err]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Quantity ─────────────────────────────────────────
    #
    # The serializer validates quantity when it's present.
    # When it's absent, we fall back to the model default (1).
    # The check here is a belt-and-braces guard so the view
    # never writes an invalid value even if the serializer's
    # validate_quantity is later relaxed.
    raw_qty = serializer.validated_data.get("quantity", None)
    if raw_qty is not None:
        qty, qty_err = _check_quantity(raw_qty)
        if qty_err:
            return Response(
                {"quantity": [qty_err]},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        qty = 1  # model default

    # ── 6. Images ───────────────────────────────────────────
    image_files = _extract_images_from_request(request)
    if not image_files:
        return Response(
            {"message": "At least one image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ok, img_err = _validate_product_images(image_files)
    if not ok:
        return Response(
            {"message": img_err},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed, total_after, img_limit, message = _check_image_count_limit(
        request.user,
        business,
        incoming_count=len(image_files),
        existing_count=0,
    )

    if not allowed:
        return Response(
            {
                "message": message,
                "code": "images_per_product_limit_reached",
                "incoming": len(image_files),
                "limit": img_limit,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 7. Decide the Youpata-managed flag ──────────────────
    #
    # Derived from the caller, never from the request body:
    #
    #   • superadmin caller              → True
    #   • is_youpata_managed=True caller → True
    #   • everyone else                  → False
    #
    youpata_managed = _caller_creates_youpata_managed_products(
        request.user
    )

    # ── 8. Persist ──────────────────────────────────────────
    product = Products.objects.create(
        business=business,
        name=name,
        description=description,
        price=serializer.validated_data.get("price"),
        quantity=qty,                       # ← added
        is_youpata_managed=youpata_managed,
    )

    properties_data = _extract_properties_from_request(request)
    if properties_data:
        _save_properties(product, properties_data)

    try:
        _save_images(product, image_files, replace=False)
    except ImageValidationError as e:
        product.delete()
        return Response(
            {"message": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except RuntimeError as e:
        product.delete()
        return Response(
            {"message": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    product.refresh_from_db()

    return Response(
        {
            "message": "Product created successfully.",
            "product": ProductSerializer(product).data,
            "usage": {
                "products": {
                    "used": used + 1,
                    "limit": limit,
                },
                "images": {
                    "used": len(image_files),
                    "limit": img_limit,
                },
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE PRODUCT — PUBLIC
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def retrieve_product(request, product_id):
    product = get_object_or_404(
        Products.objects
        .select_related("business", "business__owner")
        .prefetch_related("images", "property_items"),
        pk=product_id,
    )

    return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)


# ============================================================
# UPDATE PRODUCT
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def update_product(request, product_id):
    product = _own_product_or_404(request.user, product_id)
    if product is None:
        return Response(
            {"message": "Product not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── Subscription must be current (not expired) ──────────
    sub_ok, sub_error = _check_subscription_current(request.user)
    if not sub_ok:
        return Response(
            sub_error,
            status=status.HTTP_403_FORBIDDEN,
        )

    partial = request.method == "PATCH"

    serializer = ProductUpdateSerializer(
        product,
        data=request.data,
        partial=partial,
    )
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    validated = dict(serializer.validated_data)
    validated.pop("properties", None)

    if "name" in validated and validated["name"] is not None:
        name, name_err = _check_text_field(
            validated["name"],
            "Product name",
            PRODUCT_NAME_MIN_LENGTH,
            PRODUCT_NAME_MAX_LENGTH,
        )
        if name_err:
            return Response(
                {"name": [name_err]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        validated["name"] = name

    if "description" in validated and validated["description"] is not None:
        description, desc_err = _check_text_field(
            validated["description"],
            "Description",
            PRODUCT_DESCRIPTION_MIN_LENGTH,
            PRODUCT_DESCRIPTION_MAX_LENGTH,
        )
        if desc_err:
            return Response(
                {"description": [desc_err]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        validated["description"] = description

    # ── Quantity — belt-and-braces re-check ─────────────────
    #
    # The serializer already validates quantity when present.
    # This second check mirrors the view's other text-field
    # re-checks, so the view's contract is self-contained.
    if "quantity" in validated and validated["quantity"] is not None:
        qty, qty_err = _check_quantity(validated["quantity"])
        if qty_err:
            return Response(
                {"quantity": [qty_err]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        validated["quantity"] = qty

    image_files = _extract_images_from_request(request)
    replace_images = str(
        request.data.get("replace_images", "")
    ).lower() in ("1", "true", "yes")

    if image_files:
        ok, img_err = _validate_product_images(image_files)
        if not ok:
            return Response(
                {"message": img_err},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_count = 0 if replace_images else product.images.count()

        allowed, total_after, img_limit, message = _check_image_count_limit(
            request.user,
            product.business,
            incoming_count=len(image_files),
            existing_count=existing_count,
        )

        if not allowed:
            return Response(
                {
                    "message": message,
                    "code": "images_per_product_limit_reached",
                    "incoming": len(image_files),
                    "existing": existing_count,
                    "would_be_total": total_after,
                    "limit": img_limit,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    for field, value in validated.items():
        setattr(product, field, value)
    product.save()

    properties_data = _extract_properties_from_request(request)
    if properties_data:
        _save_properties(product, properties_data)

    if image_files:
        try:
            _save_images(product, image_files, replace=replace_images)
        except ImageValidationError as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except RuntimeError as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    product.refresh_from_db()

    return Response(
        {
            "message": "Product updated successfully.",
            "product": ProductSerializer(product).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE PRODUCT
# ============================================================
# Deliberately NOT gated by subscription expiry, so expired
# users can still clean up their existing products.

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def delete_product(request, product_id):
    product = _own_product_or_404(request.user, product_id)
    if product is None:
        return Response(
            {"message": "Product not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    for img in product.images.all():
        if img.image_public_id:
            try:
                delete_image_from_cloudinary(img.image_public_id)
            except Exception as e:
                print(f"⚠️ Could not delete Cloudinary image: {e}")

    product.delete()

    return Response(
        {"message": "Product deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE A SINGLE PRODUCT IMAGE
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def delete_product_image(request, image_id):
    image = (
        ProductImage.objects
        .filter(id=image_id, product__business__owner=request.user)
        .select_related("product")
        .first()
    )
    if image is None:
        return Response(
            {"message": "Image not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    was_primary = image.is_primary
    product = image.product

    if image.image_public_id:
        try:
            delete_image_from_cloudinary(image.image_public_id)
        except Exception as e:
            print(f"⚠️ Could not delete Cloudinary image: {e}")

    image.delete()

    if was_primary:
        next_image = product.images.order_by("sort_order", "created_at").first()
        if next_image:
            next_image.is_primary = True
            next_image.save(update_fields=["is_primary"])

    return Response(
        {"message": "Image deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# SET PRIMARY IMAGE
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def set_primary_image(request, image_id):
    image = (
        ProductImage.objects
        .filter(id=image_id, product__business__owner=request.user)
        .select_related("product")
        .first()
    )
    if image is None:
        return Response(
            {"message": "Image not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    ProductImage.objects.filter(
        product=image.product, is_primary=True
    ).exclude(pk=image.pk).update(is_primary=False)

    image.is_primary = True
    image.save(update_fields=["is_primary"])

    return Response(
        {
            "message": "Primary image updated.",
            "product": ProductSerializer(image.product).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# USAGE — GET /products/business/<business_id>/usage/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def product_usage(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    plan = _get_effective_plan(request.user)
    qs = Products.objects.filter(business=business)
    used = qs.count()

    # ── Stock aggregates ────────────────────────────────────
    #
    # Small set of counts the seller's usage page can render
    # to answer "how much of my catalogue is actually sellable
    # right now?". A product counts as "in stock" only when it
    # has quantity > 0 AND a price (an unpriced product can't
    # be purchased regardless of stock).
    in_stock_count = qs.filter(
        quantity__gt=0, price__isnull=False
    ).count()
    out_of_stock_count = qs.filter(quantity=0).count()

    if plan is None:
        return Response(
            {
                "plan": None,
                "business_id": business.id,
                "used": used,
                "limit": 0,
                "remaining": 0,
                "is_unlimited": False,
                "has_plan": False,
                "images_per_product_limit": 0,
                "stock": {
                    "in_stock": in_stock_count,
                    "out_of_stock": out_of_stock_count,
                },
            },
            status=status.HTTP_200_OK,
        )

    limit = plan.products_limit
    is_unlimited = limit is None
    remaining = None if is_unlimited else max(0, limit - used)

    return Response(
        {
            "plan": plan.plan_name,
            "business_id": business.id,
            "used": used,
            "limit": limit,
            "remaining": remaining,
            "is_unlimited": is_unlimited,
            "has_plan": True,
            "images_per_product_limit": plan.images_per_product,
            "stock": {
                "in_stock": in_stock_count,
                "out_of_stock": out_of_stock_count,
            },
        },
        status=status.HTTP_200_OK,
    )