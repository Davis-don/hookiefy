# feed_data/feed_views/story_view.py
# ============================================================
# Story helpers + two views:
#
#   GET /feed/stories/mine/     → my own stories (newest first)
#   GET /feed/stories/          → personalised stories from others
#
# The views are mounted in feed_data/urls.py.
# ============================================================

from django.contrib.contenttypes.models import ContentType
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers

from stories.models import Story
from businesses.models import Businesses
from my_engagements.models import Like, Follow


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

    # Cached counters already on the model
    likes_count = serializers.IntegerField(read_only=True)
    follows_count = serializers.IntegerField(read_only=True)

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
            "likes_count",
            "follows_count",
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
# SIGNAL COLLECTION
# ============================================================

def _collect_story_signals(user):
    """
    Gather the personalisation signals for the story feed.

    Returns a dict of sets + location values. Every query here
    is on a small table (Like, Follow, Businesses, Story) with
    indexes on the columns we touch, so this stays cheap.
    """

    story_ct = ContentType.objects.get_for_model(Story)

    # ── 1. Story IDs the user has already engaged with ────
    liked_story_ids = set(
        Like.objects.filter(
            user=user, content_type=story_ct
        ).values_list("object_id", flat=True)
    )
    followed_story_ids = set(
        Follow.objects.filter(
            user=user, content_type=story_ct
        ).values_list("object_id", flat=True)
    )

    engaged_story_ids = liked_story_ids | followed_story_ids

    # ── 2. Authors of those stories ───────────────────────
    engaged_author_ids = set()
    engaged_categories = set()

    if engaged_story_ids:
        for author_id, category in (
            Story.objects
            .filter(id__in=engaged_story_ids)
            .values_list("user_id", "category")
        ):
            if author_id:
                engaged_author_ids.add(author_id)
            if category:
                engaged_categories.add(category)

    # ── 3. My location (from my own business) ─────────────
    my_business = (
        Businesses.objects
        .filter(owner=user)
        .only("county", "city_town", "region")
        .first()
    )

    my_county = None
    my_city = None
    my_region = None

    if my_business is not None:
        my_county = (my_business.county or "").strip() or None
        my_city = (my_business.city_town or "").strip() or None
        my_region = (my_business.region or "").strip() or None

    # ── 4. Authors in my area ─────────────────────────────
    #      Which users own at least one business that sits
    #      in my region / city / county? Used to boost
    #      local authors' stories.
    local_author_ids = set()

    location_q = None

    if my_region:
        q = f"region__iexact={my_region!r}"
        location_q = q if location_q is None else f"{location_q} OR {q}"

    # Build the OR query cleanly with Q objects
    from django.db.models import Q

    loc_query = Q()

    if my_region:
        loc_query |= Q(region__iexact=my_region)
    if my_city:
        loc_query |= Q(city_town__iexact=my_city)
    if my_county:
        loc_query |= Q(county__iexact=my_county)

    if loc_query:
        local_author_ids = set(
            Businesses.objects
            .filter(loc_query)
            .values_list("owner_id", flat=True)
            .distinct()
        )

    return {
        "engaged_story_ids": engaged_story_ids,
        "engaged_author_ids": engaged_author_ids,
        "engaged_categories": engaged_categories,
        "local_author_ids": local_author_ids,
        "my_county": my_county,
        "my_city": my_city,
        "my_region": my_region,
    }


# ============================================================
# SCORING
# ============================================================

def _score_story(story, signals):
    """
    Return a numeric score for one story.

    Higher = shown earlier. Additive and simple — no ML.
    Recency breaks ties inside the same score tier in the
    final sort step.
    """

    score = 0

    # ── I already engaged with something from this author ──
    if story.user_id in signals["engaged_author_ids"]:
        score += 60

    # ── Author is in my area ───────────────────────────────
    if story.user_id in signals["local_author_ids"]:
        score += 35

    # ── I've engaged with this category before ─────────────
    if story.category in signals["engaged_categories"]:
        score += 15

    # ── Popularity as a soft tie-breaker ───────────────────
    score += min(getattr(story, "likes_count", 0), 25)
    score += min(getattr(story, "follows_count", 0), 15)

    return score


# ============================================================
# VIEW 1 — my own stories (unchanged behaviour)
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


# ============================================================
# VIEW 2 — personalised stories from everyone else
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def personalised_stories_feed(request):
    """
    Personalised feed of Stories from OTHER users.

    Ranking blends:
        - Authors whose stories the user has liked / followed
        - Authors located in the same region / city / county
          as the user's own business
        - Categories the user already engages with
        - Popularity (likes + follows) as a soft tie-breaker
        - Recency within each tier

    Query params:
        limit     — 1..60, default 20
        before    — ISO datetime cursor
        category  — filter by category
    """

    limit = _parse_limit(
        request.query_params.get("limit"), default=20, maximum=60
    )
    before = request.query_params.get("before")
    category = request.query_params.get("category")

    # ── Signals ──────────────────────────────────────────
    signals = _collect_story_signals(request.user)

    # ── Candidate window ─────────────────────────────────
    # 4× the page size, capped, so we have room to rank
    # without scanning the whole table.
    pool_size = max(limit * 4, 40)

    qs = (
        Story.objects
        .exclude(user=request.user)         # exclude my own stories
        .select_related("user")
    )

    if category:
        qs = qs.filter(category=category)
    if before:
        qs = qs.filter(created_at__lt=before)

    candidates = list(qs.order_by("-created_at")[:pool_size])

    # ── Score + sort ─────────────────────────────────────
    scored = [
        {
            "score": _score_story(story, signals),
            "created_at": story.created_at,
            "obj": story,
        }
        for story in candidates
    ]

    scored.sort(
        key=lambda row: (row["score"], row["created_at"]),
        reverse=True,
    )

    # ── Page + cursor ────────────────────────────────────
    page_rows = scored[:limit]
    items = [row["obj"] for row in page_rows]

    has_more = len(scored) > limit
    next_cursor = (
        page_rows[-1]["created_at"].isoformat()
        if has_more and page_rows
        else None
    )

    serializer = StoryItemSerializer(items, many=True)

    return Response(
        {
            "count": len(items),
            "next_cursor": next_cursor,
            "has_more": has_more,
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# PUBLIC API
# ============================================================

__all__ = [
    "StoryItemSerializer",
    "my_feed",
    "personalised_stories_feed",
]