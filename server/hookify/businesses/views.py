# businesses/views.py
# ============================================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from account.controllers.cloudinary_utils import (
    delete_image_from_cloudinary,
)

from .models import Businesses
from .serializers import (
    BusinessSerializer,
    BusinessCreateSerializer,
    BusinessUpdateSerializer,
    BusinessDetailSerializer,
)


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    return (
        getattr(user, "is_superuser", False)
        or getattr(user, "role", "") == "superadmin"
    )


def _delete_business_images(business):
    """
    Delete every Cloudinary asset associated with a business:

      - Every post's `image_public_id`
      - Every product's every ProductImage `image_public_id`

    Must be called BEFORE `business.delete()`, because Django's
    CASCADE will remove the related Post / Product / ProductImage
    rows and we'd lose their Cloudinary public_ids.

    Failures are logged but never raised — the business still gets
    deleted even if Cloudinary is unreachable.

    Returns:
        {"deleted": int, "failed": int}
    """

    deleted = 0
    failed = 0

    # ── Posts (one image each) ────────────────────────────
    try:
        posts = list(business.posts.all())
    except Exception:
        posts = []

    for post in posts:
        public_id = getattr(post, "image_public_id", None)
        if not public_id:
            continue
        try:
            delete_image_from_cloudinary(public_id)
            deleted += 1
        except Exception as e:
            print(f"⚠️ Could not delete post image {public_id}: {e}")
            failed += 1

    # ── Products (many images each) ───────────────────────
    try:
        products = list(business.products.all())
    except Exception:
        products = []

    for product in products:
        try:
            images = list(product.images.all())
        except Exception:
            images = []

        for image in images:
            public_id = getattr(image, "image_public_id", None)
            if not public_id:
                continue
            try:
                delete_image_from_cloudinary(public_id)
                deleted += 1
            except Exception as e:
                print(
                    f"⚠️ Could not delete product image "
                    f"{public_id}: {e}"
                )
                failed += 1

    return {"deleted": deleted, "failed": failed}


# ============================================================
# CREATE — POST /businesses/create/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_business(request):
    serializer = BusinessCreateSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    business = serializer.save()

    return Response(
        {
            "message": "Business created successfully.",
            "business": BusinessSerializer(business).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# LIST MINE — GET /businesses/mine/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_my_businesses(request):
    """
    List every business owned by the authenticated user.

    Optional query params:
        ?status=active|paused|draft|closed|suspended
    """

    qs = (
        Businesses.objects
        .filter(owner=request.user)
        .order_by("-created_at")
    )

    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    serializer = BusinessSerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LIST ALL — GET /businesses/all/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_all_businesses(request):
    """
    Public marketplace listing. By default only ACTIVE businesses
    are returned. Pass ?status=all to see every status.

    Optional query params:
        ?category=goods|services
        ?county=Nairobi
        ?region=Kasuku
        ?status=active|paused|draft|closed|suspended|all
    """

    qs = Businesses.objects.all().order_by("-created_at")

    status_filter = request.query_params.get("status", "active")
    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)

    category = request.query_params.get("category")
    county = request.query_params.get("county")
    region = request.query_params.get("region")

    if category:
        qs = qs.filter(business_category=category)
    if county:
        qs = qs.filter(county__iexact=county)
    if region:
        qs = qs.filter(region__iexact=region)

    serializer = BusinessSerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RETRIEVE (owner only) — GET /businesses/<id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_business(request, business_id):
    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        BusinessSerializer(business).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# RETRIEVE DETAILS — GET /businesses/<id>/details/
#
# Authenticated. Returns the business plus ALL its posts and
# ALL its products (with images + properties). NO owner/account
# details are included.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_business_details(request, business_id):
    """
    Full details of a single business:

        - Business fields (name, category, type, location, status)
        - Every post (title, body, image, views, timestamps)
        - Every product (name, description, price, images,
          properties, views, timestamps)
        - Counts of posts and products

    Deliberately excludes any owner / account information.
    """

    business = (
        Businesses.objects
        .filter(id=business_id)
        .prefetch_related(
            "posts",
            "products",
            "products__images",
            "products__property_items",
        )
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = BusinessDetailSerializer(business)

    return Response(
        {"business": serializer.data},
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE — PATCH/PUT /businesses/<id>/update/
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_business(request, business_id):
    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = BusinessUpdateSerializer(
        business,
        data=request.data,
        partial=(request.method == "PATCH"),
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    business = serializer.save()

    return Response(
        {
            "message": "Business updated successfully.",
            "business": BusinessSerializer(business).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE STATUS — PATCH /businesses/<id>/status/
# Superadmins only.
# ============================================================

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_business_status(request, business_id):
    """
    Change the status of any business. Superadmins only.
    Body: { "status": "active" | "paused" | "draft" | "closed" | "suspended" }
    """

    if not _is_superadmin(request.user):
        return Response(
            {"message": "You don't have permission to change status."},
            status=status.HTTP_403_FORBIDDEN,
        )

    business = Businesses.objects.filter(id=business_id).first()

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    new_status = request.data.get("status")

    valid = {choice[0] for choice in Businesses.STATUS_CHOICES}
    if new_status not in valid:
        return Response(
            {"message": f"Status must be one of: {', '.join(sorted(valid))}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    business.status = new_status
    business.save(update_fields=["status", "updated_at"])

    return Response(
        {
            "message": "Business status updated.",
            "business": BusinessSerializer(business).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE — DELETE /businesses/<id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_business(request, business_id):
    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    cleanup = _delete_business_images(business)
    business.delete()

    return Response(
        {
            "message": "Business deleted successfully.",
            "images_deleted": cleanup["deleted"],
            "images_failed": cleanup["failed"],
        },
        status=status.HTTP_200_OK,
    )