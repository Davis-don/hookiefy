# posts/views.py

from django.shortcuts import get_object_or_404

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

from .models import Posts
from .serializers import (
    PostSerializer,
    PostCreateSerializer,
    PostUpdateSerializer,
)


# ============================================================
# TEXT RULES
# ============================================================

MAX_POST_TITLE_LENGTH = 200
MAX_POST_BODY_LENGTH  = 1000


# ============================================================
# IMAGE RULES
# ============================================================

MAX_POST_IMAGE_BYTES = 8 * 1024 * 1024   # 8 MB

ALLOWED_POST_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


def _validate_post_text(title, body):
    """
    Return (ok, errors_dict). errors_dict is DRF-shaped:
        { "title": ["..."], "body": ["..."] }
    Empty dict when both are fine.
    """
    errors = {}

    title = (title or "").strip()
    body = (body or "").strip()

    if not title:
        errors["title"] = ["Title is required."]
    elif len(title) > MAX_POST_TITLE_LENGTH:
        errors["title"] = [
            f"Title cannot exceed {MAX_POST_TITLE_LENGTH} characters."
        ]

    if body and len(body) > MAX_POST_BODY_LENGTH:
        errors["body"] = [
            f"Message cannot exceed {MAX_POST_BODY_LENGTH} characters."
        ]

    return (len(errors) == 0, errors)


def _validate_post_image(image_file):
    """
    Return (ok, error_message).

    Enforces:
        - an image is provided
        - a supported content type (PNG, JPEG, JPG, WEBP)
        - a maximum size (MAX_POST_IMAGE_BYTES)

    Never raises — always returns a message the caller can send
    straight back to the client.
    """
    if image_file is None:
        return (False, "An image is required.")

    content_type = (image_file.content_type or "").lower()
    if content_type not in ALLOWED_POST_IMAGE_TYPES:
        return (
            False,
            "Unsupported file type. Please use PNG, JPEG or WEBP.",
        )

    size = getattr(image_file, "size", 0) or 0
    if size <= 0:
        return (False, "The image appears to be empty.")

    if size > MAX_POST_IMAGE_BYTES:
        mb_limit = MAX_POST_IMAGE_BYTES // (1024 * 1024)
        return (
            False,
            f"Image is too large. Maximum size is {mb_limit} MB.",
        )

    return (True, "")


def _reject_multiple_images(request):
    """
    Return an error string if the request carries more than one
    image under any of the common keys. Return "" if the request
    is clean.
    """
    files = request.FILES

    image_keys = ("image", "images", "image[]", "file", "files")

    total = 0
    for key in image_keys:
        total += len(files.getlist(key))

    if total > 1:
        return (
            "Only one image is allowed per post. "
            "Please upload a single image."
        )

    return ""


# ============================================================
# HELPERS
# ============================================================

def _own_business_or_404(user, business_id):
    return (
        Businesses.objects
        .filter(id=business_id, owner=user)
        .first()
    )


def _own_post_or_404(user, post_id):
    return (
        Posts.objects
        .filter(id=post_id, business__owner=user)
        .select_related("business")
        .first()
    )


def _get_effective_plan(user):
    try:
        return user.effective_plan
    except Exception:
        return None


def _check_post_limit(user, business):
    plan = _get_effective_plan(user)

    if plan is None:
        return (
            False,
            0,
            None,
            (
                "Your account has no active subscription plan. "
                "Please contact support to start publishing posts."
            ),
        )

    used = Posts.objects.filter(business=business).count()
    limit = plan.posts_limit

    if limit is None:
        return (True, used, None, "")

    if used >= limit:
        if limit == 1:
            message = (
                "You've reached the limit of your current plan — "
                "1 post per business. Upgrade to publish more."
            )
        else:
            message = (
                f"You've reached the limit of your current plan — "
                f"{limit} posts per business. Upgrade to publish more."
            )
        return (False, used, limit, message)

    return (True, used, limit, "")


# ────────────────────────────────────────────────────────────
# NEW: subscription expiry check
# ────────────────────────────────────────────────────────────

def _check_subscription_current(user):
    """
    Return (ok, error_dict).

    Returns (True, None) when the user has a currently valid
    subscription (active/trialing and not expired by date).
    Returns (False, {...}) with a ready-to-send error payload
    when the user has no subscription or it has expired.

    The Subscription model's `is_current` property already
    encapsulates:
        - status ∈ {active, trialing}
        - end_date is null OR end_date > now
        - start_date < end_date (not an inverted window)
    """
    from subscription.models import Subscription

    # Active or trialing rows that haven't expired yet
    current = (
        Subscription.objects
        .filter(user=user)
        .active()
        .first()
    )

    if current is not None and current.is_current:
        return (True, None)

    # Is there any subscription at all? If yes but expired,
    # give a specific message. If none, different message.
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
                    "Subscribe to a plan to publish posts."
                ),
                "code": "subscription_required",
            },
        )

    # There's a subscription, but it's not currently valid.
    if latest.is_expired:
        return (
            False,
            {
                "message": (
                    f"Your subscription expired on "
                    f"{latest.end_date:%d %b %Y}. "
                    f"Renew your plan to publish new posts."
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

    # Fallback for cancelled / pending / other statuses
    return (
        False,
        {
            "message": (
                f"Your subscription is not currently active "
                f"(status: {latest.get_status_display()}). "
                f"Please activate a plan to publish posts."
            ),
            "code": "subscription_inactive",
            "status": latest.status,
        },
    )


# ============================================================
# LIST POSTS OF A BUSINESS
# GET /posts/business/<business_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_posts(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    qs = (
        Posts.objects
        .filter(business=business)
        .select_related("business", "business__owner")
        .order_by("-created_at")
    )
    serializer = PostSerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE POST
# POST /posts/business/<business_id>/create/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def create_post(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── 0. Subscription must be current (not expired) ───────
    #     Runs BEFORE plan-limit so an expired user gets the
    #     clearer "renew" message instead of "plan limit".
    sub_ok, sub_error = _check_subscription_current(request.user)
    if not sub_ok:
        return Response(
            sub_error,
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 1. Plan limit ───────────────────────────────────────
    allowed, used, limit, message = _check_post_limit(
        request.user, business
    )

    if not allowed:
        return Response(
            {
                "message": message,
                "code": "post_limit_reached",
                "used": used,
                "limit": limit,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 2. Text limits ──────────────────────────────────────
    text_ok, text_errors = _validate_post_text(
        request.data.get("title"),
        request.data.get("body"),
    )
    if not text_ok:
        return Response(text_errors, status=status.HTTP_400_BAD_REQUEST)

    # ── 3. Validate body fields (serializer shape) ──────────
    serializer = PostCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Exactly one image ────────────────────────────────
    multi_error = _reject_multiple_images(request)
    if multi_error:
        return Response(
            {"message": multi_error},
            status=status.HTTP_400_BAD_REQUEST,
        )

    image_file = request.FILES.get("image")
    ok, img_error = _validate_post_image(image_file)
    if not ok:
        return Response(
            {"message": img_error},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Upload ───────────────────────────────────────────
    try:
        upload_result = upload_image_to_cloudinary(
            image_file,
            folder="post_images",
        )
    except ImageValidationError as e:
        return Response(
            {"message": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {"message": f"Image upload failed: {str(e)}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    post = Posts.objects.create(
        business=business,
        title=serializer.validated_data["title"].strip(),
        body=(serializer.validated_data.get("body") or "").strip(),
        image_url=upload_result["url"],
        image_public_id=upload_result["public_id"],
    )

    used_after = used + 1

    return Response(
        {
            "message": "Post created successfully.",
            "post": PostSerializer(post).data,
            "usage": {
                "used": used_after,
                "limit": limit,
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE POST — PUBLIC
# GET /posts/<post_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def retrieve_post(request, post_id):
    post = get_object_or_404(
        Posts.objects.select_related("business", "business__owner"),
        pk=post_id,
    )

    return Response(PostSerializer(post).data, status=status.HTTP_200_OK)


# ============================================================
# UPDATE POST
# PATCH /posts/<post_id>/update/
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def update_post(request, post_id):
    post = _own_post_or_404(request.user, post_id)
    if post is None:
        return Response(
            {"message": "Post not found."},
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

    title_to_check = (
        request.data.get("title")
        if "title" in request.data
        else post.title
    )
    body_to_check = (
        request.data.get("body")
        if "body" in request.data
        else post.body
    )

    if "title" in request.data or "body" in request.data:
        text_ok, text_errors = _validate_post_text(
            title_to_check,
            body_to_check,
        )
        if not text_ok:
            if partial:
                text_errors.pop("title", None) if "title" not in request.data else None
            if text_errors:
                return Response(
                    text_errors,
                    status=status.HTTP_400_BAD_REQUEST,
                )

    serializer = PostUpdateSerializer(
        post,
        data=request.data,
        partial=partial,
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    validated = dict(serializer.validated_data)

    if "title" in validated and validated["title"] is not None:
        validated["title"] = validated["title"].strip()
    if "body" in validated and validated["body"] is not None:
        validated["body"] = validated["body"].strip()

    multi_error = _reject_multiple_images(request)
    if multi_error:
        return Response(
            {"message": multi_error},
            status=status.HTTP_400_BAD_REQUEST,
        )

    image_file = request.FILES.get("image")
    if image_file is not None:
        ok, img_error = _validate_post_image(image_file)
        if not ok:
            return Response(
                {"message": img_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if post.image_public_id:
            try:
                delete_image_from_cloudinary(post.image_public_id)
            except Exception as e:
                print(f"⚠️ Could not delete old post image: {e}")

        try:
            upload_result = upload_image_to_cloudinary(
                image_file,
                folder="post_images",
            )
            validated["image_url"] = upload_result["url"]
            validated["image_public_id"] = upload_result["public_id"]
        except ImageValidationError as e:
            return Response(
                {"message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"message": f"Image upload failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    for field, value in validated.items():
        setattr(post, field, value)

    post.save()

    return Response(
        {
            "message": "Post updated successfully.",
            "post": PostSerializer(post).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE POST
# DELETE /posts/<post_id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def delete_post(request, post_id):
    post = _own_post_or_404(request.user, post_id)
    if post is None:
        return Response(
            {"message": "Post not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if post.image_public_id:
        try:
            delete_image_from_cloudinary(post.image_public_id)
        except Exception as e:
            print(f"⚠️ Could not delete Cloudinary image: {e}")

    post.delete()

    return Response(
        {"message": "Post deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# USAGE — GET /posts/business/<business_id>/usage/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_usage(request, business_id):
    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    plan = _get_effective_plan(request.user)
    used = Posts.objects.filter(business=business).count()

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
            },
            status=status.HTTP_200_OK,
        )

    limit = plan.posts_limit
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
        },
        status=status.HTTP_200_OK,
    )