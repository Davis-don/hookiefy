# my_engagements/urls.py

from django.urls import path

from .views import (
    LikeToggleView,
    FollowToggleView,
    EngagementStatusView,
    LikeListView,
    FollowListView,
)


urlpatterns = [
    path(
        "like/toggle/",
        LikeToggleView.as_view(),
        name="like-toggle",
    ),
    path(
        "follow/toggle/",
        FollowToggleView.as_view(),
        name="follow-toggle",
    ),
    path(
        "status/",
        EngagementStatusView.as_view(),
        name="engagement-status",
    ),
    path(
        "likes/",
        LikeListView.as_view(),
        name="like-list",
    ),
    path(
        "follows/",
        FollowListView.as_view(),
        name="follow-list",
    ),
]