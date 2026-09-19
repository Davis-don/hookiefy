from django.core.paginator import (
    EmptyPage,
    PageNotAnInteger,
    Paginator,
)

from .models import Story
from .serializers import StoryFeedSerializer


# ============================================================
# CONFIG
# ============================================================

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


# ============================================================
# HELPERS
# ============================================================

def _coerce_int(value, default):
    """
    Safely convert a value to integer.
    """

    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ============================================================
# STORY FEED
# ============================================================

def get_story_feed(
    user=None,
    page=1,
    page_size=DEFAULT_PAGE_SIZE,
    category=None,
):
    """
    Return the Youpata Stories feed.

    Stories are ordered from newest to oldest.

    Optional category filtering is supported.

    Example:

        get_story_feed(
            user=request.user,
            page=1,
            page_size=20,
            category="success",
        )
    """

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    page = max(
        1,
        _coerce_int(page, 1),
    )

    page_size = _coerce_int(
        page_size,
        DEFAULT_PAGE_SIZE,
    )

    page_size = max(
        1,
        min(page_size, MAX_PAGE_SIZE),
    )

    # --------------------------------------------------------
    # QUERYSET
    # --------------------------------------------------------

    queryset = (
        Story.objects
        .select_related("user")
        .all()
        .order_by("-created_at")
    )

    # --------------------------------------------------------
    # CATEGORY FILTER
    # --------------------------------------------------------

    if category:
        category = category.strip().lower()

        valid_categories = {
            choice[0]
            for choice in Story.CATEGORY_CHOICES
        }

        if category in valid_categories:
            queryset = queryset.filter(
                category=category
            )

    # --------------------------------------------------------
    # SERIALIZE
    # --------------------------------------------------------

    serializer = StoryFeedSerializer(
        queryset,
        many=True,
    )

    stories = serializer.data

    # --------------------------------------------------------
    # PAGINATE
    # --------------------------------------------------------

    paginator = Paginator(
        stories,
        page_size,
    )

    try:
        page_obj = paginator.page(page)

    except PageNotAnInteger:
        page_obj = paginator.page(1)

    except EmptyPage:
        page_obj = paginator.page(
            paginator.num_pages or 1
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "page": page_obj.number,
        "page_size": page_size,
        "total_items": paginator.count,
        "total_pages": paginator.num_pages,
        "has_next": page_obj.has_next(),
        "has_previous": page_obj.has_previous(),
        "results": list(page_obj.object_list),
    }