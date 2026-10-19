# stories/views.py

from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from subscription.guards import requires_active_subscription

from .models import Story
from .serializers import (
    StorySerializer,
    StoryCreateSerializer,
    StoryUpdateSerializer,
)


# ============================================================
# HELPERS
# ============================================================

PAGE_SIZE = 10


def _own_story_or_404(user, story_id):
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
    try:
        return user.effective_plan
    except Exception:
        return None


def _month_start(now=None):
    now = now or timezone.now()
    local = timezone.localtime(now)
    return local.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )


def _stories_this_month(user):
    return Story.objects.filter(
        user=user,
        created_at__gte=_month_start(),
    ).count()


def _check_story_limit(user):
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
    limit = plan.stories_per_month

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


# ────────────────────────────────────────────────────────────
# Pagination helper
# ────────────────────────────────────────────────────────────

def _paginate_queryset(qs, request, page_size=PAGE_SIZE):
    """
    Return (page_qs, meta_dict).

    Reads `?page=` from query params (1-based, default 1).
    Meta always includes total count, page, page_size, pages,
    next, previous — so the response shape stays stable.
    """
    total = qs.count()

    try:
        page = int(request.query_params.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    if page < 1:
        page = 1

    pages = (total + page_size - 1) // page_size if page_size else 0

    if pages and page > pages:
        page = pages  # clamp so out-of-range still returns last page

    start = (page - 1) * page_size
    end = start + page_size

    page_qs = qs[start:end]

    meta = {
        "count": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
        "next": page + 1 if page < pages else None,
        "previous": page - 1 if page > 1 else None,
    }

    return page_qs, meta


# ────────────────────────────────────────────────────────────
# Subscription expiry check (same as posts/views.py)
# ────────────────────────────────────────────────────────────

def _check_subscription_current(user):
    """
    Return (ok, error_dict).

    Returns (True, None) when the user has a currently valid
    subscription (active/trialing and not expired by date).
    Returns (False, {...}) with a ready-to-send error payload
    when the user has no subscription or it has expired.
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
                    "Subscribe to a plan to publish stories."
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
                    f"Renew your plan to publish new stories."
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
                f"Please activate a plan to publish stories."
            ),
            "code": "subscription_inactive",
            "status": latest.status,
        },
    )


# ============================================================
# LIST MINE — GET /stories/mine/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_my_stories(request):
    qs = (
        Story.objects
        .filter(user=request.user)
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    page_qs, meta = _paginate_queryset(qs, request)

    serializer = StorySerializer(page_qs, many=True)

    return Response(
        {
            **meta,
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

    page_qs, meta = _paginate_queryset(qs, request)

    serializer = StorySerializer(page_qs, many=True)

    return Response(
        {
            **meta,
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE — POST /stories/create/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
def create_story(request):
    # ── 0. Subscription must be current (not expired) ───────
    sub_ok, sub_error = _check_subscription_current(request.user)
    if not sub_ok:
        return Response(
            sub_error,
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 1. Monthly plan limit ───────────────────────────────
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

    # ── 2. Serializer validation ────────────────────────────
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
                "limit": limit,
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
@requires_active_subscription
def update_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
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
# Deliberately NOT gated by subscription expiry, so expired
# users can still clean up their existing stories.

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@requires_active_subscription
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

    page_qs, meta = _paginate_queryset(qs, request)

    serializer = StorySerializer(page_qs, many=True)

    return Response(
        {
            **meta,
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# USAGE — GET /stories/usage/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def story_usage(request):
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