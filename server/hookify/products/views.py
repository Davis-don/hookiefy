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


def _extract_properties_from_request(request):
    """
    Pull properties from the request.

    Supports two shapes:
      1. JSON / form: `properties` as a list of {name, value} dicts.
      2. Multipart:    `property_name[]` + `property_value[]` arrays.

    Returns a list of {"name": ..., "value": ...} dicts.
    """
    properties = []

    # 1. Structured list (JSON body or nested form data)
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

    # 2. Parallel arrays (multipart form data)
    names = request.data.getlist("property_name") if hasattr(request.data, "getlist") else []
    values = request.data.getlist("property_value") if hasattr(request.data, "getlist") else []

    for name, value in zip(names, values):
        name = (name or "").strip()
        value = (value or "").strip()
        if name and value:
            properties.append({"name": name, "value": value})

    return properties


def _extract_images_from_request(request):
    """
    Pull all uploaded image files from the request.
    Returns a list of UploadedFile objects.
    """
    files = []

    # Multiple files under "images" (preferred)
    if hasattr(request.FILES, "getlist"):
        files = request.FILES.getlist("images")
        if not files:
            # Backwards-compatible single "image" key
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

    If `replace` is True, existing images are deleted (from Cloudinary
    and the DB) first. Otherwise the new images are appended.
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

        # First image becomes primary if none exists yet
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
    """
    List every product belonging to a business owned by the
    authenticated user. Newest first.
    """

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
# Multipart fields:
#   - name             (required)
#   - description      (optional)
#   - price            (optional)
#   - property_name[]  (optional, parallel array)
#   - property_value[] (optional, parallel array)
#   - images           (one or more files, REQUIRED)
#
# Also supports JSON body with `properties: [{name, value}, ...]`.
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

    # ── Validate text fields ─────────────────────────────
    serializer = ProductCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── At least one image is required ───────────────────
    image_files = _extract_images_from_request(request)
    if not image_files:
        return Response(
            {"message": "At least one image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Create the product ───────────────────────────────
    product = Products.objects.create(
        business=business,
        name=serializer.validated_data["name"],
        description=serializer.validated_data.get("description", ""),
        price=serializer.validated_data.get("price"),
    )

    # ── Properties ───────────────────────────────────────
    properties_data = _extract_properties_from_request(request)
    if properties_data:
        _save_properties(product, properties_data)

    # ── Images (upload to Cloudinary) ────────────────────
    try:
        _save_images(product, image_files, replace=False)
    except RuntimeError as e:
        # Roll back the product if the upload fails
        product.delete()
        return Response(
            {"message": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Refresh to include the new relations
    product.refresh_from_db()

    return Response(
        {
            "message": "Product created successfully.",
            "product": ProductSerializer(product).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE PRODUCT  — PUBLIC
# GET /products/<product_id>/
#
# Returns the full nested shape: business, owner, images,
# properties, and engagement counters.
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
# - Text fields: name, description, price
# - Properties:  pass `properties` (list) or
#                `property_name[]` + `property_value[]`
#                → replaces ALL existing properties
# - Images:      pass `images` (one or more files) with
#                `replace_images=true` to replace all existing
#                images, otherwise new images are appended.
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

    # ── Validate text fields ─────────────────────────────
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
    # Properties are handled separately below
    validated.pop("properties", None)

    # ── Apply text fields ────────────────────────────────
    for field, value in validated.items():
        setattr(product, field, value)
    product.save()

    # ── Properties (replace all if provided) ─────────────
    properties_data = _extract_properties_from_request(request)
    if properties_data:
        _save_properties(product, properties_data)

    # ── Images ───────────────────────────────────────────
    image_files = _extract_images_from_request(request)
    if image_files:
        replace = str(request.data.get("replace_images", "")).lower() in (
            "1", "true", "yes",
        )
        try:
            _save_images(product, image_files, replace=replace)
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
# Deletes all Cloudinary images first, then the DB row.
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

    # Delete every Cloudinary asset first
    for img in product.images.all():
        if img.image_public_id:
            try:
                delete_image_from_cloudinary(img.image_public_id)
            except Exception as e:
                print(f"⚠️ Could not delete Cloudinary image: {e}")
                # We continue — the DB row is still removed so the
                # user isn't stuck with a broken product.

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

    # If we removed the primary image, promote another one
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

    # Unset any existing primary for this product
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