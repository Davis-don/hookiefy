# account/urls.py

from django.urls import path

from . import views


urlpatterns = [
    # ========================================================
    # HEALTH
    # ========================================================
    path(
        "health/",
        views.health_check,
        name="health_check",
    ),

    # ========================================================
    # AUTHENTICATION
    # ========================================================
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

    # ========================================================
    # GOOGLE AUTHENTICATION
    # ========================================================
    path(
        "google/",
        views.google_auth,
        name="google_auth",
    ),

    # ========================================================
    # YOUPATA-MANAGED ACCOUNTS (superadmin only)
    # ========================================================
    path(
        "accounts/",
        views.youpata_managed_accounts,
        name="youpata_managed_accounts",
    ),

    # ========================================================
    # USER LOOKUP BY EMAIL (superadmin only)
    #
    #   GET /account/users/by-email/?email=foo@bar.com
    #
    # Used by the admin Add-order wizard on the Orders tab.
    # Returns the small verification-card payload (name,
    # phone, joined, active) — never the full user row.
    # ========================================================
    path(
        "users/by-email/",
        views.lookup_user_by_email,
        name="lookup_user_by_email",
    ),

    # ========================================================
    # PROFILE — READ
    # ========================================================
    path(
        "me/",
        views.current_user,
        name="current_user",
    ),

    # ========================================================
    # PROFILE — UPDATE (general details)
    # ========================================================
    path(
        "profile/",
        views.update_user,
        name="update_user",
    ),

    # ========================================================
    # PROFILE IMAGE
    # ========================================================
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

    # ========================================================
    # PROFILE COMPLETENESS
    # ========================================================
    path(
        "profile/status/",
        views.profile_status,
        name="profile_status",
    ),

    # ========================================================
    # PASSWORD — UPDATE
    # ========================================================
    path(
        "password/",
        views.update_password,
        name="update_password",
    ),
]