# businesses/views.py
# ============================================================

from django.contrib.auth import get_user_model

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


def _get_effective_plan(user):
    """
    Resolve the user's current plan.

    Priority:
        1. Plan from their active subscription.
        2. The system's default plan.
        3. None.

    Uses `user.effective_plan` from account models so the logic
    lives in one place.
    """
    try:
        return user.effective_plan
    except Exception:
        return None


def _check_business_limit(user):
    """
    Return (allowed, current_count, limit, message).

    - `allowed` is True when the user may create another business.
    - `limit` is None when unlimited.
    - `message` is a friendly explanation when not allowed.
    """

    plan = _get_effective_plan(user)

    if plan is None:
        return (
            False,
            0,
            None,
            (
                "Your account has no active subscription plan. "
                "Please contact support or choose a plan to start "
                "publishing businesses."
            ),
        )

    current = Businesses.objects.filter(owner=user).count()
    limit = plan.businesses_limit  # None = unlimited

    if limit is None:
        return (True, current, None, "")

    if current >= limit:
        if limit == 1:
            message = (
                "You've reached the limit of your current plan — "
                "1 business. Upgrade to add more."
            )
        else:
            message = (
                f"You've reached the limit of your current plan — "
                f"{limit} businesses. Upgrade to add more."
            )
        return (False, current, limit, message)

    return (True, current, limit, "")


def _delete_business_images(business):
    """
    Delete every Cloudinary asset associated with a business:
      - Every post's `image_public_id`
      - Every product's every ProductImage `image_public_id`

    Must be called BEFORE `business.delete()`.
    Returns {"deleted": int, "failed": int}.
    """

    deleted = 0
    failed = 0

    # ── Posts ─────────────────────────────────────────────
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

    # ── Products ──────────────────────────────────────────
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
#
# Enforces the user's plan businesses_limit.
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_business(request):
    """
    Create a business owned by the authenticated user.

    Before creating, the user's plan is resolved (from their
    active subscription, or the default plan) and the number
    of existing businesses is compared against the plan's
    `businesses_limit`.

    - If the plan limit is NULL → unlimited, always allowed.
    - If the user already has >= limit businesses → 403 with
      a friendly upgrade message.
    - If no plan can be resolved → 403 with a support message.
    """

    allowed, current, limit, message = _check_business_limit(request.user)

    if not allowed:
        return Response(
            {
                "message": message,
                "code": "business_limit_reached",
                "current_count": current,
                "limit": limit,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

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

    # Optional: also return how many the user has used so the
    # frontend can show "2 of 3 businesses used".
    used = current + 1

    return Response(
        {
            "message": "Business created successfully.",
            "business": BusinessSerializer(business).data,
            "usage": {
                "used": used,
                "limit": limit,  # None = unlimited
            },
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
        .select_related("owner")
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
    """

    qs = (
        Businesses.objects
        .all()
        .select_related("owner")
        .order_by("-created_at")
    )

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
        .select_related("owner")
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
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_business_details(request, business_id):
    """
    Full details of a single business:
        - Business fields
        - Owner contact: name, email, phone
        - All posts, all products
        - Counts
    """

    business = (
        Businesses.objects
        .filter(id=business_id)
        .select_related("owner")
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


# ============================================================
# USAGE — GET /businesses/usage/
# Tells the frontend where the user stands against their plan.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def business_usage(request):
    """
    Returns the user's business usage against their plan.

    Response:
        {
            "plan": "Starter",
            "used": 2,
            "limit": 3,          # null = unlimited
            "remaining": 1,      # null = unlimited
            "is_unlimited": false
        }
    """

    plan = _get_effective_plan(request.user)
    used = Businesses.objects.filter(owner=request.user).count()

    if plan is None:
        return Response(
            {
                "plan": None,
                "used": used,
                "limit": 0,
                "remaining": 0,
                "is_unlimited": False,
                "has_plan": False,
            },
            status=status.HTTP_200_OK,
        )

    limit = plan.businesses_limit
    is_unlimited = limit is None
    remaining = None if is_unlimited else max(0, limit - used)

    return Response(
        {
            "plan": plan.plan_name,
            "used": used,
            "limit": limit,
            "remaining": remaining,
            "is_unlimited": is_unlimited,
            "has_plan": True,
        },
        status=status.HTTP_200_OK,
    )