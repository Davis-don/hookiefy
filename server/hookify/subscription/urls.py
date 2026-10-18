# subscription/urls.py

from django.urls import path
from . import views


urlpatterns = [
    path(
        "current/",
        views.current_subscription,
        name="current-subscription",
    ),
    path(
        "pre-check-downgrade/",
        views.pre_check_downgrade,
        name="pre-check-downgrade",
    ),
]