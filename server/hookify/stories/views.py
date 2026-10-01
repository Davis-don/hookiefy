# stories/views.py
import logging
from datetime import timedelta

from django.db import transaction
from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone

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
# STORY-LIMIT HELPERS
# ============================================================

def _current_month_bounds():
    """
    Return (start_of_month, start_of_next_month) in UTC.
    Used to count stories created during the current
    calendar month.
    """
    now = timezone.now()
    start = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    # First day of next month
    if start.month == 12:
        next_start = start.replace(year=start.year + 1, month=1)
    else:
        next_start = start.replace(month=start.month + 1)
    return start, next_start


def _stories_used_this_month(user):
    start, next_start = _current_month_bounds()
    return Story.objects.filter(
        user=user,
        created_at__gte=start,
        created_at__lt=next_start,
    ).count()


def _find_upgrade_plan(current_plan):
    """
    Return the next plan the user should upgrade to, based on
    display_order. If we can't determine it, return None.
    """
    from plans.models import Plan

    qs = Plan.objects.filter(is_active=True)

    if current_plan is not None:
        qs = qs.filter(display_order__gt=current_plan.display_order)

    return qs.order_by("display_order", "price").first()


def _check_story_limit(user):
    """
    Returns None if the user can create another story.

    Otherwise returns a Response object with a helpful
    message explaining the limit and how to upgrade.
    """

    # Superadmins bypass all limits.
    if _is_superadmin(user):
        return None

    subscription = getattr(user, "subscription", None)

    # No subscription row → treat as the most restrictive plan.
    if not subscription:
        return Response(
            {
                "message": (
                    "You don't have a subscription yet. "
                    "Please choose a plan to start posting "
                    "stories."
                ),
                "error_code": "NO_SUBSCRIPTION",
                "limit": 0,
                "used": 0,
                "remaining": 0,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = subscription.plan

    if not plan:
        return Response(
            {
                "message": (
                    "Your subscription has no plan assigned. "
                    "Please contact support."
                ),
                "error_code": "NO_PLAN",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # Free plan handling: free users can still post stories,
    # but the limit still comes from the plan.
    limit = plan.stories_per_month

    # None means unlimited.
    if limit is None:
        return None

    used = _stories_used_this_month(user)

    if used < limit:
        return None

    # Limit reached — find the next plan for a helpful message.
    upgrade_plan = _find_upgrade_plan(plan)

    if upgrade_plan:
        upgrade_hint = (
            f" Upgrade to {upgrade_plan.name} "
            f"(KES {upgrade_plan.price}/month) to post more."
        )
        upgrade_plan_payload = {
            "id": upgrade_plan.id,
            "name": upgrade_plan.name,
            "slug": upgrade_plan.slug,
            "price": str(upgrade_plan.price),
            "stories_per_month": upgrade_plan.stories_per_month,
        }
    else:
        upgrade_hint = (
            " You're already on the highest plan. "
            "Contact support if you need more."
        )
        upgrade_plan_payload = None

    return Response(
        {
            "message": (
                f"You've reached the monthly story limit "
                f"for the {plan.name} plan "
                f"({used}/{limit})."
                f"{upgrade_hint}"
            ),
            "error_code": "STORY_LIMIT_REACHED",
            "plan": {
                "id": plan.id,
                "name": plan.name,
                "slug": plan.slug,
                "stories_per_month": limit,
            },
            "used": used,
            "limit": limit,
            "remaining": 0,
            "upgrade_plan": upgrade_plan_payload,
        },
        status=status.HTTP_403_FORBIDDEN,
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

    # ── PLAN LIMIT CHECK ─────────────────────────────────
    limit_response = _check_story_limit(request.user)
    if limit_response is not None:
        return limit_response

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
        logger.exception(
            "Cloudinary upload failed for user_id=%s",
            request.user.id,
        )
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

        logger.exception(
            "Failed to save story user_id=%s",
            request.user.id,
        )
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
        return _forbidden(
            "You do not have permission to modify this story."
        )

    # ── DELETE ───────────────────────────────────────────
    if request.method == "DELETE":
        old_public_id = story.image_public_id

        if old_public_id:
            try:
                delete_image_from_cloudinary(old_public_id)
            except Exception as e:
                logger.exception(
                    "Cloudinary delete failed for story_id=%s",
                    story.id,
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
            logger.exception(
                "Failed to delete story_id=%s",
                story.id,
            )
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
                {
                    "message": "Failed to upload new story image.",
                    "error": str(e),
                },
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