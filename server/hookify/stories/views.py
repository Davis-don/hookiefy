# stories/views.py

from datetime import datetime, timezone as dt_timezone

from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Story
from .serializers import (
    StorySerializer,
    StoryCreateSerializer,
    StoryUpdateSerializer,
)


# ============================================================
# HELPERS
# ============================================================

def _own_story_or_404(user, story_id):
    """Return the story if the user is its author, else None."""
    return (
        Story.objects
        .filter(id=story_id, user=user)
        .select_related("user")
        .first()
    )


def _is_superadmin(user):
    return (
        getattr(user, "is_superuser", False)
        or getattr(user, "role", "") == "superadmin"
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


def _month_start(now=None):
    """
    Return the datetime of the first instant of the current month
    in the project's timezone.
    """
    now = now or timezone.now()
    local = timezone.localtime(now)
    return local.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )


def _stories_this_month(user):
    """Count how many stories the user has created this month."""
    return Story.objects.filter(
        user=user,
        created_at__gte=_month_start(),
    ).count()


def _check_story_limit(user):
    """
    Return (allowed, used, limit, message).

    - `used` = stories created this month.
    - `limit` = plan.stories_per_month (None = unlimited).
    - `message` = a friendly explanation when not allowed.
    """

    plan = _get_effective_plan(user)

    if plan is None:
        return (
            False,
            0,
            None,
            (
                "Your account has no active subscription plan. "
                "Please contact support to start publishing stories."
            ),
        )

    used = _stories_this_month(user)
    limit = plan.stories_per_month  # None = unlimited

    if limit is None:
        return (True, used, None, "")

    if used >= limit:
        if limit == 1:
            message = (
                "You've reached the limit of your current plan — "
                "1 story per month. Upgrade to publish more."
            )
        else:
            message = (
                f"You've reached the limit of your current plan — "
                f"{limit} stories per month. Upgrade to publish more."
            )
        return (False, used, limit, message)

    return (True, used, limit, "")


# ============================================================
# LIST MINE — GET /stories/mine/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_my_stories(request):
    """
    List every story authored by the authenticated user.
    Newest first.

    Optional query params:
        ?category=journey|motivation|success|experience|lessons|inspiration
    """

    qs = (
        Story.objects
        .filter(user=request.user)
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    serializer = StorySerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LIST ALL — GET /stories/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_all_stories(request):
    """
    Public feed — every story on the platform, newest first.

    Optional query params:
        ?category=journey|motivation|success|experience|lessons|inspiration
        ?user=<user_id>
    """

    qs = (
        Story.objects
        .select_related("user")
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    user_id = request.query_params.get("user")
    if user_id:
        qs = qs.filter(user_id=user_id)

    serializer = StorySerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE — POST /stories/create/
#
# Enforces plan.stories_per_month for the current calendar month.
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_story(request):
    """
    Create a story. The authenticated user becomes the author.

    Before creating:
        - the user's plan is resolved
        - the number of stories they created since the start of
          the current month is compared to plan.stories_per_month

    If the limit is reached, the request is refused with 403.
    """

    # ── Plan limit check ─────────────────────────────────
    allowed, used, limit, message = _check_story_limit(request.user)

    if not allowed:
        return Response(
            {
                "message": message,
                "code": "story_limit_reached",
                "used": used,
                "limit": limit,
                "period": "month",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── Validate + create ────────────────────────────────
    serializer = StoryCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    story = Story.objects.create(
        user=request.user,
        **serializer.validated_data,
    )

    return Response(
        {
            "message": "Story created successfully.",
            "story": StorySerializer(story).data,
            "usage": {
                "used": used + 1,
                "limit": limit,  # None = unlimited
                "period": "month",
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE — GET /stories/<story_id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        StorySerializer(story).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE — PATCH/PUT /stories/<story_id>/update/
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"

    serializer = StoryUpdateSerializer(
        story,
        data=request.data,
        partial=partial,
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    story = serializer.save()

    return Response(
        {
            "message": "Story updated successfully.",
            "story": StorySerializer(story).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE — DELETE /stories/<story_id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    story.delete()

    return Response(
        {"message": "Story deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# ADMIN LIST — GET /stories/admin/all/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_list_stories(request):
    """
    Superadmin view — every story from every user.
    """

    if not _is_superadmin(request.user):
        return Response(
            {"message": "You don't have permission to view this."},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = (
        Story.objects
        .select_related("user")
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    user_id = request.query_params.get("user")
    if user_id:
        qs = qs.filter(user_id=user_id)

    serializer = StorySerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# USAGE — GET /stories/usage/
#
# The user's current-month story usage against their plan.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def story_usage(request):
    """
    Response:
        {
            "plan": "Starter",
            "used": 3,
            "limit": 20,          # null = unlimited
            "remaining": 17,      # null = unlimited
            "is_unlimited": false,
            "period": "month",
            "period_start": "2026-10-01T00:00:00+03:00"
        }
    """

    plan = _get_effective_plan(request.user)
    used = _stories_this_month(request.user)
    month_start = _month_start()

    if plan is None:
        return Response(
            {
                "plan": None,
                "used": used,
                "limit": 0,
                "remaining": 0,
                "is_unlimited": False,
                "has_plan": False,
                "period": "month",
                "period_start": month_start.isoformat(),
            },
            status=status.HTTP_200_OK,
        )

    limit = plan.stories_per_month
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
            "period": "month",
            "period_start": month_start.isoformat(),
        },
        status=status.HTTP_200_OK,
    )