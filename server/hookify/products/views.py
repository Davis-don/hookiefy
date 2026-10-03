from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from businesses.models import Businesses
from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
)

from .models import Products
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
        .first()
    )


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

    qs = Products.objects.filter(business=business).order_by("-created_at")
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
# Multipart: name, description, price, property1..5, image (REQUIRED)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_product(request, business_id):
    """
    Create a product on a business.

    The client sends:
        - name         (form field, required)
        - description  (form field, optional)
        - price        (form field, optional)
        - property1..5 (form fields, optional)
        - image        (file, REQUIRED)

    The image is uploaded to Cloudinary and its URL + public_id
    are stored on the product.
    """

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

    # ── Image is required ────────────────────────────────
    image_file = request.FILES.get("image")
    if not image_file:
        return Response(
            {"message": "An image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Upload to Cloudinary ─────────────────────────────
    try:
        upload_result = upload_image_to_cloudinary(
            image_file,
            folder="product_images",
        )
    except Exception as e:
        return Response(
            {"message": f"Image upload failed: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Create the product ───────────────────────────────
    product = Products.objects.create(
        business=business,
        name=serializer.validated_data["name"],
        description=serializer.validated_data.get("description", ""),
        price=serializer.validated_data.get("price"),
        property1=serializer.validated_data.get("property1"),
        property2=serializer.validated_data.get("property2"),
        property3=serializer.validated_data.get("property3"),
        property4=serializer.validated_data.get("property4"),
        property5=serializer.validated_data.get("property5"),
        image_url=upload_result["url"],
        image_public_id=upload_result["public_id"],
    )

    return Response(
        {
            "message": "Product created successfully.",
            "product": ProductSerializer(product).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE PRODUCT
# GET /products/<product_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_product(request, product_id):
    product = _own_product_or_404(request.user, product_id)
    if product is None:
        return Response(
            {"message": "Product not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)


# ============================================================
# UPDATE PRODUCT
# PATCH /products/<product_id>/update/
# Multipart: any of name, description, price, property1..5, image (file)
#
# - If `image` is provided, the old Cloudinary asset is
#   deleted first, then the new one is uploaded and stored.
# - If no image is provided, the existing one is kept.
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

    # ── If a new image file was uploaded, swap it in ─────
    image_file = request.FILES.get("image")
    if image_file:
        # Delete the old image first (if any)
        if product.image_public_id:
            try:
                delete_image_from_cloudinary(product.image_public_id)
            except Exception as e:
                print(f"⚠️ Could not delete old product image: {e}")

        # Upload the new one
        try:
            upload_result = upload_image_to_cloudinary(
                image_file,
                folder="product_images",
            )
            validated["image_url"] = upload_result["url"]
            validated["image_public_id"] = upload_result["public_id"]
        except Exception as e:
            return Response(
                {"message": f"Image upload failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # ── Apply the remaining fields ───────────────────────
    for field, value in validated.items():
        setattr(product, field, value)

    product.save()

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
# Deletes the Cloudinary image first, then the DB row.
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

    # Delete the Cloudinary asset first
    if product.image_public_id:
        try:
            delete_image_from_cloudinary(product.image_public_id)
        except Exception as e:
            print(f"⚠️ Could not delete Cloudinary image: {e}")
            # We don't return an error — the DB row is still removed
            # so the user isn't stuck with a broken product.

    product.delete()

    return Response(
        {"message": "Product deleted successfully."},
        status=status.HTTP_200_OK,
    )