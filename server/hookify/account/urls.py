from django.urls import path

from . import views


urlpatterns = [
    # Health
    path(
        "health/",
        views.health_check,
        name="health_check",
    ),

    # Authentication
    path(
        "register/",
        views.create_user,
        name="create_user",
    ),
    path(
        "login/",
        views.login_view,
        name="login",
    ),
    path(
        "logout/",
        views.logout_view,
        name="logout",
    ),
    path(
        "auth-check/",
        views.auth_check,
        name="auth_check",
    ),

    # Google authentication
    path(
        "google/",
        views.google_auth,
        name="google_auth",
    ),

    # Profile
    path(
        "profile/",
        views.update_user,
        name="update_user",
    ),
    path(
        "profile/image/",
        views.profile_image_url,
        name="profile_image_url",
    ),
    path(
        "profile/image/upload/",
        views.upload_profile_image,
        name="upload_profile_image",
    ),

    # Profile completeness
    path(
        "profile/status/",
        views.profile_status,
        name="profile_status",
    ),

    # Password
    path(
        "password/",
        views.update_password,
        name="update_password",
    ),
]