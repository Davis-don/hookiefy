# feed_data/feed_views/story_view.py
# ============================================================
# Story helpers + one view for the user's own Stories.
#
#   GET /feed/stories/mine/
#
# The view is mounted in feed_data/urls.py.
# ============================================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers

from stories.models import Story


# ============================================================
# SERIALIZER
# ============================================================

class StoryItemSerializer(serializers.ModelSerializer):
    author_id = serializers.IntegerField(source="user.id", read_only=True)
    author_name = serializers.SerializerMethodField()
    author_image = serializers.URLField(
        source="user.profile_image_url",
        read_only=True,
        allow_null=True,
    )
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    summary = serializers.CharField(read_only=True)

    class Meta:
        model = Story
        fields = (
            "id",
            "author_id",
            "author_name",
            "author_image",
            "title",
            "content",
            "summary",
            "category",
            "category_display",
            "views",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_author_name(self, obj):
        user = obj.user
        if not user:
            return ""
        full = (
            f"{getattr(user, 'first_name', '')} "
            f"{getattr(user, 'last_name', '')}"
        ).strip()
        return full or getattr(user, "email", "")


# ============================================================
# HELPERS
# ============================================================

def _parse_limit(value, default=20, maximum=60):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


# ============================================================
# VIEW — the user's own stories
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_feed(request):
    """
    The signed-in user's own Stories, newest first.

    Query params:
        limit     — 1..60, default 20
        before    — ISO datetime cursor
        category  — journey|motivation|success|experience|lessons|inspiration
    """

    limit = _parse_limit(
        request.query_params.get("limit"), default=20, maximum=60
    )
    before = request.query_params.get("before")
    category = request.query_params.get("category")

    qs = (
        Story.objects
        .filter(user=request.user)
        .select_related("user")
    )

    if category:
        qs = qs.filter(category=category)
    if before:
        qs = qs.filter(created_at__lt=before)

    qs = qs.order_by("-created_at")

    page = list(qs[: limit + 1])
    has_more = len(page) > limit
    page = page[:limit]

    next_cursor = (
        page[-1].created_at.isoformat() if has_more and page else None
    )

    serializer = StoryItemSerializer(page, many=True)

    return Response(
        {
            "count": len(page),
            "next_cursor": next_cursor,
            "has_more": has_more,
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )