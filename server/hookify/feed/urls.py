# feed/urls.py
from django.urls import path

from .views import get_user_feed_data


urlpatterns = [
    path(
        "info/",
        get_user_feed_data,
        name="user-feed",
    ),
]