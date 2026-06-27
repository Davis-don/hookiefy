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

    # JWT Token Refresh
    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
]