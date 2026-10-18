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


    # ============================================================
    # BUSINESSES
    # ============================================================

    path(
        "businesses/",
        include("businesses.urls"),
    ),


    # ============================================================
    # POSTS
    # Every URL here starts with /posts/
    # ============================================================

    path(
        "posts/",
        include("posts.urls"),
    ),


    # ============================================================
    # PRODUCTS
    # Every URL here starts with /products/
    # ============================================================

    path(
        "products/",
        include("products.urls"),
    ),


    # ============================================================
    # Plan 
    # ============================================================
    path(
        "plans/",
        include("plans.urls"),
    ),

    path(
        "feed/",
        include("feed_data.urls"),
    ),


    # ============================================================
    # SUBSCRIPTION PAYMENTS
    #
    #   POST /subscription_payments/initiate/
    #   GET  /subscription_payments/<ref>/status/
    #   GET  /subscription_payments/payment-success/
    #   POST /subscription_payments/ipn/
    # ============================================================

    path(
        "subscription_payments/",
        include("subscription_payment.urls"),
    ),


    # ============================================================
    # USER PREFERENCE
    # ============================================================

    path(
        "preference/",
        include("userpreference.urls"),
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
    # USER BALANCE APIs
    # ============================================================

    path(
        "balance/",
        include("UserBalance.urls"),
    ),


    # ============================================================
    # SYSTEM BALANCE APIs
    #
    #   GET    /system_balance/fetch/         → fetch current balance
    #   POST   /system_balance/fetch/         → credit / debit by amount
    #   PATCH  /system_balance/fetch/         → set exact balance value
    #   GET    /system_balance/initialize/    → create singleton row (0.00 KES)
    #   POST   /system_balance/initialize/    → create singleton row (0.00 KES)
    # ============================================================

    path(
        "system_balance/",
        include("system_balance.urls"),
    ),


    # ============================================================
    # SYSTEM STATS APIs
    #
    #   GET /system_stats/users/       → total registered users
    #   GET /system_stats/businesses/  → total businesses
    # ============================================================

    path(
        "system_stats/",
        include("system_stats.urls"),
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
        "my_engagements/",
        include("my_engagements.urls"),
    ),


    # ============================================================
    # PLANS
    # Subscription plan catalogue.
    # ============================================================

    path(
        "plans/",
        include("plans.urls"),
    ),


    # ============================================================
    # SUBSCRIPTION
    # A user's subscription to a plan.
    # ============================================================

    path(
        "subscription/",
        include("subscription.urls"),
    ),


    # ============================================================
    # NOTIFICATIONS
    # ============================================================

    path(
        "notifications/",
        include("notifications.urls"),
    ),


    # ============================================================
    # PERFORMANCE TESTS
    #
    #   POST /perf/tests/run/           → run all 3 perf tests
    #                                     (?image_runs=5&posts=5&products=5)
    #   POST /perf/tests/image-upload/  → just the image upload test
    #   POST /perf/tests/overall-upload/  → just the upload test
    #   POST /perf/tests/overall-download/ → just the download test
    #
    # Superadmin only. Every test cleans up after itself.
    # ============================================================

    path(
        "perf/",
        include("perfomance_tests.urls"),
    ),
]