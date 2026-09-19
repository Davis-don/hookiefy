from django.urls import path

from .views import (
    LikeView,
    UnlikeView,
    CheckLikeView,
)


urlpatterns = [
    path(
        "like/",
        LikeView.as_view(),
        name="like",
    ),

    path(
        "unlike/",
        UnlikeView.as_view(),
        name="unlike",
    ),

    path(
        "check/",
        CheckLikeView.as_view(),
        name="check-like",
    ),
]