# feed_data/urls.py
# ============================================================
# Feed routes.
#
#   businesses/       → public feed (posts + products), newest first
#   businesses/mine/  → personalised feed (excludes own content)
#   stories/          → personalised stories from other users
#   stories/mine/     → the user's own stories, newest first
# ============================================================

from django.urls import path

from .views import (
    public_businesses_feed,
    my_businesses_feed,
    my_feed,
    personalised_stories_feed,
)


urlpatterns = [
    # ── Businesses ────────────────────────────────────────
    path(
        "businesses/",
        public_businesses_feed,
        name="feed-businesses",
    ),
    path(
        "businesses/mine/",
        my_businesses_feed,
        name="feed-businesses-mine",
    ),

    # ── Stories ───────────────────────────────────────────
    path(
        "stories/",
        personalised_stories_feed,
        name="feed-stories",
    ),
    path(
        "stories/mine/",
        my_feed,
        name="feed-stories-mine",
    ),
]