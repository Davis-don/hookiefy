# subscription/urls.py
from django.urls import path
from . import views

app_name = "subscription"

urlpatterns = [
    path(
        "status/",
        views.subscription_status,
        name="subscription_status",
    ),
    path(
        "renew/",
        views.renew_subscription,
        name="renew_subscription",
    ),
    path(
        "premium-status/",
        views.premium_status,
        name="premium_status",
    ),
]