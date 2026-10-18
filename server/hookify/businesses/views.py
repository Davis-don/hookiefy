# businesses/views.py
# ============================================================

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from account.controllers.cloudinary_utils import (
    delete_image_from_cloudinary,
)

from subscription.guards import requires_active_subscription

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
    try:
        return user.effective_plan
    except Exception:
        return None


def _check_business_limit(user):
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
    limit = plan.businesses_limit

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


def _profile_completeness(user):
    """
    Return (is_complete, missing_fields, complete_fields).

    Required for publishing a business:
        - first_name
        - last_name
        - email
        - gender
        - phone_number

    Profile image is NOT required.
    """
    checks = {
        "first_name":   bool((user.first_name or "").strip()),
        "last_name":    bool((user.last_name or "").strip()),
        "email":        bool((user.email or "").strip()),
        "gender":       bool(user.gender),
        "phone_number": bool((user.phone_number or "").strip()),
    }

    missing = [field for field, ok in checks.items() if not ok]
    complete = [field for field, ok in checks.items() if ok]

    return (len(missing) == 0, missing, complete)


# ────────────────────────────────────────────────────────────
# NEW: subscription expiry check (same as posts/stories/products)
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
                    "Subscribe to a plan to manage businesses."
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
                    f"Renew your plan to manage businesses."
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
                f"Please activate a plan to manage businesses."
            ),
            "code": "subscription_inactive",
            "status": latest.status,
        },
    )


def _delete_business_images(business):
    deleted = 0
    failed = 0

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
@requires_active_subscription
def create_business(request):
    # ── 0. Subscription must be current (not expired) ───────
    sub_ok, sub_error = _check_subscription_current(request.user)
    if not sub_ok:
        return Response(
            sub_error,
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 1. Profile must be complete ────────────────────────
    is_complete, missing, _ = _profile_completeness(request.user)

    if not is_complete:
        return Response(
            {
                "message": (
                    "Please complete your profile before creating a "
                    "business. Missing: " + ", ".join(missing) + "."
                ),
                "code": "profile_incomplete",
                "missing_fields": missing,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 2. Plan limit ──────────────────────────────────────
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

    # ── 3. Sanitise the payload ────────────────────────────
    #
    # `status` is server-controlled on create. Any value the
    # client sends is ignored, and the row is always created
    # as "active". Only a superadmin can change it later via
    # PATCH /businesses/<id>/status/.
    data = request.data.copy()
    data.pop("status", None)
    data.pop("owner", None)
    data.pop("id", None)

    # ── 4. Validate + save ─────────────────────────────────
    serializer = BusinessCreateSerializer(
        data=data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    business = serializer.save(status="active")
    used = current + 1

    return Response(
        {
            "message": "Business created successfully.",
            "business": BusinessSerializer(business).data,
            "usage": {
                "used": used,
                "limit": limit,
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
@requires_active_subscription
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

    # ── Subscription must be current (not expired) ──────────
    sub_ok, sub_error = _check_subscription_current(request.user)
    if not sub_ok:
        return Response(
            sub_error,
            status=status.HTTP_403_FORBIDDEN,
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
@requires_active_subscription
def update_business_status(request, business_id):
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
# Deliberately NOT gated by subscription expiry, so expired
# users can still clean up their existing businesses.

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
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
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def business_usage(request):
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