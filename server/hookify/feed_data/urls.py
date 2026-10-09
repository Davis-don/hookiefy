# feed_data/urls.py
# ============================================================
# Feed routes.
#
#   businesses/       → public feed (posts + products)
#   businesses/mine/  → personal feed (excludes own content)
#   stories/mine/     → the user's own stories
# ============================================================

from django.urls import path

from . import views


urlpatterns = [
    path(
        "businesses/",
        views.public_businesses_feed,
        name="feed-businesses",
    ),
    path(
        "businesses/mine/",
        views.my_businesses_feed,
        name="feed-businesses-mine",
    ),
    path(
        "stories/mine/",
        views.my_feed,
        name="feed-stories-mine",
    ),
]