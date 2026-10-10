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
)

from .models import Posts
from .serializers import (
    PostSerializer,
    PostCreateSerializer,
    PostUpdateSerializer,
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


def _own_post_or_404(user, post_id):
    """Return the post if the user owns its business, else None."""
    return (
        Posts.objects
        .filter(id=post_id, business__owner=user)
        .select_related("business")
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


def _check_post_limit(user, business):
    """
    Return (allowed, used, limit, message).

    - `allowed` is True when the user may create another post.
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
                "Please contact support to start publishing posts."
            ),
        )

    used = Posts.objects.filter(business=business).count()
    limit = plan.posts_limit  # None = unlimited

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


# ============================================================
# LIST POSTS OF A BUSINESS
# GET /posts/business/<business_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_posts(request, business_id):
    """
    List every post belonging to a business owned by the
    authenticated user. Newest first.
    """

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
# Multipart: title, body, image (file, REQUIRED)
#
# Enforces the plan's `posts_limit` before accepting the post.
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_post(request, business_id):
    """
    Create a post on a business.

    The client sends:
        - title  (form field)
        - body   (form field)
        - image  (file, REQUIRED)

    Before creating:
        - the owner's plan is resolved
        - the count of existing posts on this business is compared
          against the plan's `posts_limit`

    If the limit is reached, the request is refused with 403.
    """

    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── Plan limit check ─────────────────────────────────
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

    # ── Validate text fields ─────────────────────────────
    serializer = PostCreateSerializer(data=request.data)
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
            folder="post_images",
        )
    except Exception as e:
        return Response(
            {"message": f"Image upload failed: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Create the post ──────────────────────────────────
    post = Posts.objects.create(
        business=business,
        title=serializer.validated_data["title"],
        body=serializer.validated_data.get("body", ""),
        image_url=upload_result["url"],
        image_public_id=upload_result["public_id"],
    )

    # Usage numbers for the frontend
    used_after = used + 1

    return Response(
        {
            "message": "Post created successfully.",
            "post": PostSerializer(post).data,
            "usage": {
                "used": used_after,
                "limit": limit,  # None = unlimited
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
    """
    Public retrieve — returns a single post by id,
    regardless of who owns it.
    """

    post = get_object_or_404(
        Posts.objects.select_related("business", "business__owner"),
        pk=post_id,
    )

    return Response(PostSerializer(post).data, status=status.HTTP_200_OK)


# ============================================================
# UPDATE POST
# PATCH /posts/<post_id>/update/
# Multipart: any of title, body, image (file)
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_post(request, post_id):
    post = _own_post_or_404(request.user, post_id)
    if post is None:
        return Response(
            {"message": "Post not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"

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

    # Swap the image if a new one was provided
    image_file = request.FILES.get("image")
    if image_file:
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
        except Exception as e:
            return Response(
                {"message": f"Image upload failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
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
#
# How many posts this business has vs. the plan's limit.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def post_usage(request, business_id):
    """
    Returns the business's post usage against the owner's plan.

    Response:
        {
            "plan": "Starter",
            "business_id": 4,
            "used": 3,
            "limit": 10,          # null = unlimited
            "remaining": 7,       # null = unlimited
            "is_unlimited": false
        }
    """

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