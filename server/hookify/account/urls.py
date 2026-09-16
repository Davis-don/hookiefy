# account/urls.py

from django.urls import path

from .views import (
    health_check,
    login_view,
    create_service_provider,
    create_service_seeker,
    google_service_provider,
    google_service_seeker,
    auth_check,
    profile_image_url,
    upload_profile_image,
    check_premium_status, 
)


urlpatterns = [

    # HEALTH
    path(
        "health/",
        health_check,
        name="health-check"
    ),

    # AUTH CHECK
    path(
        "auth-check/",
        auth_check,
        name="auth-check"
    ),

    # NORMAL LOGIN
    path(
        "login/",
        login_view,
        name="login"
    ),

    # SERVICE PROVIDER SIGNUP
    path(
        "signup/service-provider/",
        create_service_provider,
        name="service-provider-signup"
    ),

    # SERVICE SEEKER SIGNUP
    path(
        "signup/service-seeker/",
        create_service_seeker,
        name="service-seeker-signup"
    ),

    # GOOGLE SERVICE PROVIDER
    path(
        "google/service-provider/",
        google_service_provider,
        name="google-service-provider"
    ),

    # GOOGLE SERVICE SEEKER
    path(
        "google/service-seeker/",
        google_service_seeker,
        name="google-service-seeker"
    ),

    # CURRENT LOGGED-IN USER PROFILE IMAGE (GET)
    path(
        "profile-image/",
        profile_image_url,
        name="profile-image"
    ),

    # UPLOAD / REPLACE PROFILE IMAGE (POST)
    path(
        "upload-profile-image/",
        upload_profile_image,
        name="upload-profile-image"
    ),
        # PREMIUM / VERIFIED STATUS CHECK
    path(
        "premium-status/",
        check_premium_status,
        name="premium-status"
    ),
]