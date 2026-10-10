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
    # FEED
    # Merged posts + products stream and business feed.
    # Every URL here starts with /feed/
    #   /feed/stories/
    #   /feed/stories/mine/
    #   /feed/businesses/
    #   /feed/businesses/mine/
    # ============================================================

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
]