# stories/views.py
import logging

from django.db import transaction
from django.db import models
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
    parser_classes,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.parsers import (
    JSONParser,
    MultiPartParser,
    FormParser,
)
from rest_framework.response import Response

from .authentication import OptionalJWTAuthentication
from .models import Story
from .serializers import (
    StoryCreateSerializer,
    StoryReadSerializer,
    StoryUpdateSerializer,
)
from .services import get_story_feed

# ── Cloudinary helpers ──────────────────────────────────────
from account.controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
)
# ────────────────────────────────────────────────────────────


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    if not user or not user.is_authenticated:
        return False
    return getattr(user, "role", None) == "superadmin"


def _can_manage(user, story):
    """Superadmins manage everything; owners manage their own."""
    if not user or not user.is_authenticated:
        return False
    if _is_superadmin(user):
        return True
    return story.user_id == user.id


def _forbidden(message):
    return Response(
        {"message": message},
        status=status.HTTP_403_FORBIDDEN,
    )


def _unauthorized(message="Authentication required."):
    return Response(
        {"message": message},
        status=status.HTTP_401_UNAUTHORIZED,
    )


# ============================================================
# STORIES — LIST + CREATE
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def stories_list_create(request):
    """
    GET  /stories/
        Public list of stories.
        ?mine=true          → only the current user's stories
        ?category=ideas     → filter by category
        ?search=<q>         → title / content contains
        ?ordering=-created_at | created_at | title | -title

    POST /stories/
        Create a story. Multipart with `image` file required.

    Form fields:
        title      (required, ≤200 chars)
        content    (required)
        category   (required, one of: ideas | success | fun)
        image      (required file)
    """

    # ── LIST ─────────────────────────────────────────────
    if request.method == "GET":
        qs = Story.objects.select_related("user")

        mine = request.query_params.get("mine") == "true"

        if mine:
            if not request.user.is_authenticated:
                return _unauthorized()
            qs = qs.filter(user=request.user)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search)
                | models.Q(content__icontains=search)
            )

        ordering = request.query_params.get("ordering", "-created_at")
        allowed = {
            "created_at", "-created_at",
            "title", "-title",
        }
        if ordering not in allowed:
            ordering = "-created_at"

        qs = qs.order_by(ordering)

        serializer = StoryReadSerializer(qs, many=True)
        return Response(
            {"count": qs.count(), "stories": serializer.data},
            status=status.HTTP_200_OK,
        )

    # ── CREATE ───────────────────────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()

    # image is required — check before we validate the rest
    image = request.FILES.get("image")
    if not image:
        return Response(
            {
                "message": "Validation failed.",
                "errors": {"image": ["Story image is required."]},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = StoryCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Upload to Cloudinary FIRST ───────────────────────
    try:
        upload_result = upload_image_to_cloudinary(
            image_file=image,
            folder="story_images",
        )
    except Exception as e:
        logger.exception("Cloudinary upload failed for user_id=%s", request.user.id)
        return Response(
            {"message": "Failed to upload story image.", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    image_url = upload_result.get("url")
    image_public_id = upload_result.get("public_id")

    if not image_url or not image_public_id:
        return Response(
            {"message": "Cloudinary returned incomplete data."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # ── Save to DB ───────────────────────────────────────
    try:
        with transaction.atomic():
            story = serializer.save(
                user=request.user,
                image_url=image_url,
                image_public_id=image_public_id,
            )
    except Exception as e:
        # rollback the Cloudinary asset since DB write failed
        try:
            delete_image_from_cloudinary(image_public_id)
        except Exception:
            logger.exception(
                "Rollback Cloudinary delete failed for public_id=%s",
                image_public_id,
            )

        logger.exception("Failed to save story user_id=%s", request.user.id)
        return Response(
            {"message": "Failed to create story.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Story created successfully.",
            "story": StoryReadSerializer(story).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# STORY — DETAIL (READ / UPDATE / DELETE)
# ============================================================

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def story_detail(request, pk):
    """
    GET    /stories/<pk>/    → public read
    PUT    /stories/<pk>/    → full update (owner / superadmin)
    PATCH  /stories/<pk>/    → partial update (owner / superadmin)
    DELETE /stories/<pk>/    → delete (owner / superadmin)

    Parser support:
        - JSON       (for updating title/content/category only)
        - Multipart  (for updating with a new image file)

    On DELETE:
        1. Delete Cloudinary asset first.
        2. Delete the Story row.

    On PUT/PATCH with a new image:
        1. Validate + upload new image to Cloudinary.
        2. Save story with new image_url / image_public_id.
        3. Delete the old Cloudinary asset.
    """

    story = get_object_or_404(
        Story.objects.select_related("user"),
        pk=pk,
    )

    # ── READ ─────────────────────────────────────────────
    if request.method == "GET":
        return Response(
            {"story": StoryReadSerializer(story).data},
            status=status.HTTP_200_OK,
        )

    # ── AUTH GUARD ───────────────────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()
    if not _can_manage(request.user, story):
        return _forbidden("You do not have permission to modify this story.")

    # ── DELETE ───────────────────────────────────────────
    if request.method == "DELETE":
        old_public_id = story.image_public_id

        if old_public_id:
            try:
                delete_image_from_cloudinary(old_public_id)
            except Exception as e:
                logger.exception(
                    "Cloudinary delete failed for story_id=%s", story.id
                )
                return Response(
                    {
                        "message": (
                            "Failed to delete the story image from "
                            "Cloudinary. Story was NOT deleted."
                        ),
                        "error": str(e),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        try:
            with transaction.atomic():
                story.delete()
        except Exception as e:
            logger.exception("Failed to delete story_id=%s", story.id)
            return Response(
                {"message": "Failed to delete story.", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "Story deleted successfully."},
            status=status.HTTP_200_OK,
        )

    # ── UPDATE ───────────────────────────────────────────
    partial = request.method == "PATCH"

    serializer = StoryUpdateSerializer(
        instance=story,
        data=request.data,
        partial=partial,
    )

    if not serializer.is_valid():
        return Response(
            {"message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_image = request.FILES.get("image")
    old_public_id = story.image_public_id

    # If a new image was uploaded, handle it first
    new_public_id = None
    new_image_url = None

    if new_image:
        try:
            upload_result = upload_image_to_cloudinary(
                image_file=new_image,
                folder="story_images",
            )
        except Exception as e:
            logger.exception(
                "Cloudinary upload failed during update of story_id=%s",
                story.id,
            )
            return Response(
                {"message": "Failed to upload new story image.", "error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        new_public_id = upload_result.get("public_id")
        new_image_url = upload_result.get("url")

        if not new_public_id or not new_image_url:
            return Response(
                {"message": "Cloudinary returned incomplete data."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    try:
        with transaction.atomic():
            updated = serializer.save()

            if new_public_id and new_image_url:
                updated.image_url = new_image_url
                updated.image_public_id = new_public_id
                updated.save(
                    update_fields=[
                        "image_url",
                        "image_public_id",
                        "updated_at",
                    ]
                )
    except Exception as e:
        # rollback the new Cloudinary asset if DB write failed
        if new_public_id:
            try:
                delete_image_from_cloudinary(new_public_id)
            except Exception:
                logger.exception(
                    "Rollback Cloudinary delete failed for public_id=%s",
                    new_public_id,
                )

        logger.exception("Failed to update story_id=%s", story.id)
        return Response(
            {"message": "Failed to update story.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Delete the old image AFTER successful DB update
    if new_public_id and old_public_id and old_public_id != new_public_id:
        try:
            delete_image_from_cloudinary(old_public_id)
        except Exception:
            logger.exception(
                "Failed to delete old Cloudinary image for story_id=%s",
                story.id,
            )

    return Response(
        {
            "message": "Story updated successfully.",
            "story": StoryReadSerializer(updated).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# STORY FEED (paginated, category-filtered)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def story_feed(request):
    """
    GET /stories/feed/
        ?page=1
        ?page_size=20
        ?category=ideas | success | fun
    """
    page = request.query_params.get("page", 1)
    page_size = request.query_params.get("page_size", 20)
    category = request.query_params.get("category")

    feed = get_story_feed(
        user=request.user,
        page=page,
        page_size=page_size,
        category=category,
    )

    return Response(feed, status=status.HTTP_200_OK)