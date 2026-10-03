"""
URL configuration for hookify project.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView



urlpatterns = [
    # ============================================================
    # DJANGO ADMIN
    # ============================================================

    path(
        "admin/",
        admin.site.urls,
    ),


    # ============================================================
    # AUTHENTICATION & ACCOUNT APIs
    # ============================================================

    path(
        "account/",
        include("account.urls"),
    ),

    # Subscription payment apis
    path(
    "subscription_payments/",
    include("subscription_payment.urls"),
),


    # ============================================================
    # ASSIGNMENTS
    # ============================================================

    path(
        "assignments/",
        include("assignments.urls"),
    ),


    # ============================================================
    # USER PROFILE
    # ============================================================

    path(
        "profile/",
        include("userprofile.urls"),
    ),


    # ============================================================
    # USER PREFERENCE
    # ============================================================

    path(
        "preference/",
        include("userpreference.urls"),
    ),


    # ============================================================
    # USER FEED
    # ============================================================

    path(
        "feed/",
        include("feed.urls"),
    ),


    # ============================================================
    # USER CONNECTIONS
    # ============================================================

    path(
        "connections/",
        include("connections.urls"),
    ),


    # ============================================================
    # NOTIFICATIONS
    # ============================================================

    path(
        "notifications/",
        include("notification.urls"),
    ),


    # ============================================================
    # JWT TOKEN REFRESH
    # ============================================================

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),


    # ============================================================
    # ADMINISTRATION APIs
    # ============================================================

    path(
        "connection_fee/",
        include("administration.urls"),
    ),


    # ============================================================
    # PAYMENTS APIs
    # ============================================================

    path(
        "payments/",
        include("payments.urls"),
    ),


    # ============================================================
    # USER BALANCE APIs
    # ============================================================

    path(
        "balance/",
        include("UserBalance.urls"),
    ),


    # ============================================================
    # STATS APIs
    # ============================================================

    path(
        "stats/",
        include("stats.urls"),
    ),


    # ============================================================
    # WITHDRAWALS
    # ============================================================

    path(
        "withdrawals/",
        include("withdrawals.urls"),
    ),


    # ============================================================
    # ADVERTS
    # ============================================================

    path(
        "adverts/",
        include("adverts.urls"),
    ),


    # ============================================================
    # PLANS
    # ============================================================

    path(
        "plans/",
        include("plans.urls"),
    ),


    # ============================================================
    # SERVICES
    # ============================================================

    path(
        "services/",
        include("services.urls"),
    ),


    # ============================================================
    # STORIES
    # ============================================================

    path(
        "stories/",
        include("stories.urls"),
    ),


    # ============================================================
    # LIKES / ENGAGEMENT
    # ============================================================

    path(
        "engagement/",
        include("engagement.urls"),
    ),
    path("subscription/", include("subscription.urls"))
]