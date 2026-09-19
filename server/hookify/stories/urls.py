# stories/urls.py
from django.urls import path

from .views import (
    stories_list_create,
    story_detail,
    story_feed,
)


urlpatterns = [
    # ────────────────────────────────────────────────────────
    # STATIC routes first (must come before <int:pk>)
    # ────────────────────────────────────────────────────────

    # POST /stories/create/   → create a story (multipart, image required)
    path(
        "create/",
        stories_list_create,
        name="story-create",
    ),

    # GET /stories/feed/      → paginated, category-filtered feed
    path(
        "feed/",
        story_feed,
        name="story-feed",
    ),

    # ────────────────────────────────────────────────────────
    # LIST + CREATE
    # ────────────────────────────────────────────────────────

    # GET  /stories/          → list (public)
    # POST /stories/          → create (multipart, image required)
    path(
        "",
        stories_list_create,
        name="stories-list-create",
    ),

    # ────────────────────────────────────────────────────────
    # DETAIL (dynamic — must come last)
    # ────────────────────────────────────────────────────────

    # GET    /stories/<pk>/   → public read
    # PUT    /stories/<pk>/   → full update (owner / superadmin)
    # PATCH  /stories/<pk>/   → partial update (owner / superadmin)
    # DELETE /stories/<pk>/   → delete (owner / superadmin)
    path(
        "<int:pk>/",
        story_detail,
        name="story-detail",
    ),
]