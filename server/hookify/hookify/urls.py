"""
URL configuration for hookify project.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from account.views import health_check

urlpatterns = [
    # API root / health check
    path("", health_check, name="health_check"),

    # Django Admin
    path("admin/", admin.site.urls),

    # Authentication & Account APIs
    path("account/", include("account.urls")),
    # Assignments
    path("assignments/", include("assignments.urls")),

     # User Profile
    path("profile/", include("userprofile.urls")),

    # User preference
    path("preference/", include("userpreference.urls")),

     # User feed
    path("feed/", include("feed.urls")),
    # User connections
    path("connections/", include("connections.urls")),
    # Notifications
    path("notifications/", include("notification.urls")),

    # JWT Token Refresh
    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    # Administration APIs
    path("administration/", include("administration.urls")),
    # Payments APIs
    path("payments/", include("payments.urls")),
    # User Balance APIs
    path("balance/", include("UserBalance.urls")),
    # Stats APIs
    path("stats/", include("stats.urls")),
    # Commissions APIs
    path("commissions/", include("commisions.urls")),
    # Paystack URLs
    path('paystack/', include('paystack.urls')),
    # System configuration
    path('system-config/', include('system_config.urls')),
    # Withdrawals
    path('withdrawals/', include('withdrawals.urls')),
    # Adverts
    path('adverts/', include('adverts.urls')),
]
