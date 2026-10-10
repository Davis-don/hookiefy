# products/views.py

from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from businesses.models import Businesses
from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
)

from .models import Products, ProductImage, ProductProperty
from .serializers import (
    ProductSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
)


# ============================================================
# HELPERS
# ============================================================

def _own_business_or_404(user, business_id):
    """Return the business if the user owns it, else None."""
    return (
        Businesses.objects
        .filter(id=business_id, owner=user)
        .first()
    )


def _own_product_or_404(user, product_id):
    """Return the product if the user owns its business, else None."""
    return (
        Products.objects
        .filter(id=product_id, business__owner=user)
        .select_related("business")
        .prefetch_related("images", "property_items")
        .first()
    )


def _get_effective_plan(user):
    """
    Resolve the user's plan.

    Priority:
        1. Plan from the active subscription.
        2. The system's default plan.
        3. None.
    """
    try:
        return user.effective_plan
    except Exception:
        return None


def _check_product_limit(user, business):
    """
    Return (allowed, used, limit, message).
    """

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
    limit = plan.products_limit  # None = unlimited

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
    """
    Return (allowed, total_after, limit, message).

    `incoming_count` is how many images the request wants to add.
    `existing_count` is how many already exist on the product
    (zero for create, non-zero for update).

    If `plan.images_per_product` is None → unlimited.
    """

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

    limit = plan.images_per_product  # None = unlimited
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


def _extract_properties_from_request(request):
    """
    Pull properties from the request.

    Supports two shapes:
      1. JSON / form: `properties` as a list of {name, value} dicts.
      2. Multipart:    `property_name[]` + `property_value[]` arrays.
    """
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
    """Pull all uploaded image files from the request."""
    files = []

    if hasattr(request.FILES, "getlist"):
        files = request.FILES.getlist("images")
        if not files:
            single = request.FILES.get("image")
            if single:
                files = [single]

    return [f for f in files if f]


def _save_properties(product, properties_data):
    """Replace all properties on a product with the given list."""
    product.property_items.all().delete()
    for index, prop in enumerate(properties_data):
        ProductProperty.objects.create(
            product=product,
            name=prop["name"],
            value=prop["value"],
            sort_order=index,
        )


def _save_images(product, image_files, replace=False):
    """
    Upload image files to Cloudinary and attach them to the product.
    If `replace` is True, existing images are deleted first.
    """
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
# GET /products/business/<business_id>/
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
# POST /products/business/<business_id>/create/
#
# Enforces:
#   - plan.products_limit (total products per business)
#   - plan.images_per_product (images on this product)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_product(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── Products limit ───────────────────────────────────
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

    # ── Validate text fields ─────────────────────────────
    serializer = ProductCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── At least one image required ──────────────────────
    image_files = _extract_images_from_request(request)
    if not image_files:
        return Response(
            {"message": "At least one image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Images-per-product limit ─────────────────────────
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

    # ── Create the product ───────────────────────────────
    product = Products.objects.create(
        business=business,
        name=serializer.validated_data["name"],
        description=serializer.validated_data.get("description", ""),
        price=serializer.validated_data.get("price"),
    )

    properties_data = _extract_properties_from_request(request)
    if properties_data:
        _save_properties(product, properties_data)

    try:
        _save_images(product, image_files, replace=False)
    except RuntimeError as e:
        product.delete()
        return Response(
            {"message": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    product.refresh_from_db()

    return Response(
        {
            "message": "Product created successfully.",
            "product": ProductSerializer(product).data,
            "usage": {
                "products": {
                    "used": used + 1,
                    "limit": limit,  # None = unlimited
                },
                "images": {
                    "used": len(image_files),
                    "limit": img_limit,  # None = unlimited
                },
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE PRODUCT — PUBLIC
# GET /products/<product_id>/
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
# PATCH /products/<product_id>/update/
#
# Enforces images-per-product limit when adding images.
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_product(request, product_id):
    product = _own_product_or_404(request.user, product_id)
    if product is None:
        return Response(
            {"message": "Product not found."},
            status=status.HTTP_404_NOT_FOUND,
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

    # ── Images-per-product check ─────────────────────────
    image_files = _extract_images_from_request(request)
    replace_images = str(
        request.data.get("replace_images", "")
    ).lower() in ("1", "true", "yes")

    if image_files:
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

    # ── Apply text fields ────────────────────────────────
    for field, value in validated.items():
        setattr(product, field, value)
    product.save()

    # ── Properties ───────────────────────────────────────
    properties_data = _extract_properties_from_request(request)
    if properties_data:
        _save_properties(product, properties_data)

    # ── Images ───────────────────────────────────────────
    if image_files:
        try:
            _save_images(product, image_files, replace=replace_images)
        except RuntimeError as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
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
# DELETE /products/<product_id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
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
# DELETE /products/images/<image_id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
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
# POST /products/images/<image_id>/primary/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
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
#
# How many products this business has, and what the plan allows.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def product_usage(request, business_id):
    """
    Response:
        {
            "plan": "Starter",
            "business_id": 4,
            "used": 12,
            "limit": 50,            # null = unlimited
            "remaining": 38,        # null = unlimited
            "is_unlimited": false,
            "images_per_product_limit": 6   # null = unlimited
        }
    """

    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    plan = _get_effective_plan(request.user)
    used = Products.objects.filter(business=business).count()

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
        },
        status=status.HTTP_200_OK,
    )