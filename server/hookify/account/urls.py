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
)


urlpatterns = [

    # --------------------------------------------------------
    # HEALTH
    # --------------------------------------------------------

    path(
        "health/",
        health_check,
        name="health-check"
    ),

    # --------------------------------------------------------
    # AUTH CHECK (for ProtectedRoute)
    # --------------------------------------------------------

    path(
        "auth-check/",
        auth_check,
        name="auth-check"
    ),

    # --------------------------------------------------------
    # NORMAL LOGIN
    # --------------------------------------------------------

    path(
        "login/",
        login_view,
        name="login"
    ),

    # --------------------------------------------------------
    # SERVICE PROVIDER SIGNUP
    # --------------------------------------------------------

    path(
        "signup/service-provider/",
        create_service_provider,
        name="service-provider-signup"
    ),

    # --------------------------------------------------------
    # SERVICE SEEKER SIGNUP
    # --------------------------------------------------------

    path(
        "signup/service-seeker/",
        create_service_seeker,
        name="service-seeker-signup"
    ),

    # --------------------------------------------------------
    # GOOGLE SERVICE PROVIDER
    # --------------------------------------------------------

    path(
        "google/service-provider/",
        google_service_provider,
        name="google-service-provider"
    ),

    # --------------------------------------------------------
    # GOOGLE SERVICE SEEKER
    # --------------------------------------------------------

    path(
        "google/service-seeker/",
        google_service_seeker,
        name="google-service-seeker"
    ),
]