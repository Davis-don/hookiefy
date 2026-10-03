from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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

    qs = Posts.objects.filter(business=business).order_by("-created_at")
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

    The image is uploaded to Cloudinary and its URL + public_id
    are stored on the post.
    """

    business = _own_business_or_404(request.user, business_id)
    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
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

    return Response(
        {
            "message": "Post created successfully.",
            "post": PostSerializer(post).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE POST
# GET /posts/<post_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_post(request, post_id):
    post = _own_post_or_404(request.user, post_id)
    if post is None:
        return Response(
            {"message": "Post not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(PostSerializer(post).data, status=status.HTTP_200_OK)


# ============================================================
# UPDATE POST
# PATCH /posts/<post_id>/update/
# Multipart: any of title, body, image (file)
#
# - If `image` is provided, the old Cloudinary asset is
#   deleted first, then the new one is uploaded and stored.
# - If no image is provided, the existing one is kept.
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

    # ── Validate text fields ─────────────────────────────
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

    # ── If a new image file was uploaded, swap it in ─────
    image_file = request.FILES.get("image")
    if image_file:
        # Delete the old image first (if any)
        if post.image_public_id:
            try:
                delete_image_from_cloudinary(post.image_public_id)
            except Exception as e:
                print(f"⚠️ Could not delete old post image: {e}")

        # Upload the new one
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

    # ── Apply the remaining fields ───────────────────────
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
# Deletes the Cloudinary image first, then the DB row.
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

    # Delete the Cloudinary asset first
    if post.image_public_id:
        try:
            delete_image_from_cloudinary(post.image_public_id)
        except Exception as e:
            print(f"⚠️ Could not delete Cloudinary image: {e}")
            # We don't return an error — the DB row is still removed
            # so the user isn't stuck with a broken post.

    post.delete()

    return Response(
        {"message": "Post deleted successfully."},
        status=status.HTTP_200_OK,
    )