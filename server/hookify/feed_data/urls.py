# feed_data/urls.py
# ============================================================
# Feed routes.
#
# PUBLIC FEEDS (no auth — AllowAny):
#
#   GET /feed/businesses/                    → mixed feed (default)
#   GET /feed/businesses/all/                → explicit mixed alias
#   GET /feed/businesses/products/           → products only
#   GET /feed/businesses/posts/              → posts only
#   GET /feed/businesses/youpata/            → managed items, mixed
#   GET /feed/businesses/youpata/products/   → managed products only
#   GET /feed/businesses/youpata/posts/      → managed posts only
#
# PERSONAL FEED (auth required):
#
#   GET /feed/businesses/mine/               → personalised,
#                                              excludes own content
#
# STORY FEEDS:
#
#   GET /feed/stories/                       → personalised stories
#   GET /feed/stories/mine/                  → the user's own stories
#
# IMPORTANT — order matters.
# Django's path resolver matches on first-registered pattern.
# The specific sub-paths (all/, products/, posts/, youpata/…)
# MUST come before the bare `businesses/` route, otherwise
# `/feed/businesses/products/` would hit `public_businesses_feed`
# with a mangled path and 404. Same applies to `businesses/mine/`
# vs `businesses/`.
# ============================================================

from django.urls import path

from .views import (
    public_businesses_feed,
    all_feed,
    products_feed,
    posts_feed,
    youpata_feed,
    youpata_products_feed,
    youpata_posts_feed,
    my_businesses_feed,
    my_feed,
    personalised_stories_feed,
)


urlpatterns = [
    # ============================================================
    # PERSONAL FEED — must come before the bare /businesses/
    # ============================================================
    path(
        "businesses/mine/",
        my_businesses_feed,
        name="feed-businesses-mine",
    ),

    # ============================================================
    # PUBLIC TAB FEEDS — must come before the bare /businesses/
    # ============================================================

    # Mixed alias — what the frontend "All" tab calls.
    path(
        "businesses/all/",
        all_feed,
        name="feed-businesses-all",
    ),

    # Products only.
    path(
        "businesses/products/",
        products_feed,
        name="feed-businesses-products",
    ),

    # Posts only.
    path(
        "businesses/posts/",
        posts_feed,
        name="feed-businesses-posts",
    ),

    # Youpata-managed, mixed.
    path(
        "businesses/youpata/",
        youpata_feed,
        name="feed-businesses-youpata",
    ),

    # Youpata-managed products.
    path(
        "businesses/youpata/products/",
        youpata_products_feed,
        name="feed-businesses-youpata-products",
    ),

    # Youpata-managed posts.
    path(
        "businesses/youpata/posts/",
        youpata_posts_feed,
        name="feed-businesses-youpata-posts",
    ),

    # ============================================================
    # MIXED FEED (default) — must come AFTER every specific
    # /businesses/* sub-path above.
    # ============================================================
    path(
        "businesses/",
        public_businesses_feed,
        name="feed-businesses",
    ),

    # ============================================================
    # STORY FEEDS
    # ============================================================

    # Specific first — same reasoning as /businesses/mine/.
    path(
        "stories/mine/",
        my_feed,
        name="feed-stories-mine",
    ),
    path(
        "stories/",
        personalised_stories_feed,
        name="feed-stories",
    ),
]