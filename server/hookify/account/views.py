# account/views.py

import logging

from decouple import config

from django.db import transaction

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import Accounts
from .serializers import (
    CreateNewUserSerializer,
    UpdateUserSerializer,
    UpdatePasswordSerializer,
)

# ── Cloudinary helper for profile image upload ───────────────
from .controllers.cloudinary_utils import upload_or_replace_profile_image
# ─────────────────────────────────────────────────────────────

# ── Subscription helper ──────────────────────────────────────
from subscription.models import Subscription
from plans.models import Plan
# ─────────────────────────────────────────────────────────────


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# EXCEPTION: FREE PLAN MISSING
# ============================================================

class FreePlanMissingError(Exception):
    """
    Raised when no plan named 'free' or 'Free' exists.
    Signups must abort when this happens.
    """
    pass


# ============================================================
# HELPER: CREATE JWT TOKENS
# ============================================================

def generate_tokens(user):
    """
    Generate SimpleJWT access and refresh tokens
    for the given user.
    """

    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ============================================================
# HELPER: USER RESPONSE DATA
# ============================================================

def get_user_data(user):
    """
    Return public account information.
    """

    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "gender": user.gender,
        "role": user.role,
        "profile_image_url": user.profile_image_url,
        "profile_image_public_id": user.profile_image_public_id,
        "has_profile_image": user.has_profile_image,
        "auth_provider": user.auth_provider,
    }


# ============================================================
# HELPER: FIND THE FREE PLAN
# ============================================================

def find_free_plan():
    """
    Return the Plan whose name is 'free' or 'Free'
    (case-insensitive), or None if it doesn't exist.
    """

    return (
        Plan.objects
        .filter(name__iexact="free")
        .order_by("display_order", "price")
        .first()
    )


# ============================================================
# HELPER: ATTACH FREE SUBSCRIPTION (STRICT)
# ============================================================

def attach_free_subscription(user):
    """
    Create a Subscription row for `user` pointing at the plan
    whose name is 'free' or 'Free'.

    Raises `FreePlanMissingError` when no such plan exists —
    the caller MUST abort the whole signup in that case.

    Superadmins are skipped (they don't need a subscription).
    Idempotent — safe to call repeatedly.
    """

    if user.role == "superadmin":
        logger.info(
            "Skipping free subscription for superadmin "
            "user_id=%s",
            user.id,
        )
        return None

    free_plan = find_free_plan()

    if not free_plan:
        logger.error(
            "❌ No plan named 'free' or 'Free' exists. "
            "Cannot create subscription for user_id=%s.",
            user.id,
        )
        raise FreePlanMissingError(
            "No 'free' plan exists. Signup aborted."
        )

    subscription, created = Subscription.objects.get_or_create(
        user=user,
        defaults={"plan": free_plan},
    )

    if created:
        logger.info(
            "✅ Free subscription created | user_id=%s | "
            "plan=%s | starts=%s | ends=%s",
            user.id,
            free_plan.name,
            subscription.start_date,
            subscription.end_date,
        )
    else:
        logger.info(
            "ℹ️ User_id=%s already has a subscription.",
            user.id,
        )

    return subscription


# ============================================================
# HEALTH CHECK
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Check whether the backend is running.
    """

    return Response(
        {
            "status": "ok",
            "message": "Backend is running",
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# SERVICE PROVIDER SIGNUP
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def create_service_provider(request):
    """
    Create a service provider using email/password.
    Also attaches a free-plan Subscription.
    """

    if not find_free_plan():
        logger.error(
            "Signup blocked: no 'free' plan exists."
        )
        return Response(
            {
                "message": (
                    "Signups are temporarily unavailable. "
                    "Please try again later."
                ),
                "error_code": "FREE_PLAN_MISSING",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    data = request.data.copy()
    data["role"] = "serviceprovider"
    data["auth_provider"] = "local"

    serializer = CreateNewUserSerializer(data=data)

    if not serializer.is_valid():
        return Response(
            {
                "message": "Validation failed",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = serializer.save()
        attach_free_subscription(user)

    except FreePlanMissingError:
        transaction.set_rollback(True)
        logger.error(
            "Rolled back service provider signup — "
            "free plan disappeared mid-request."
        )
        return Response(
            {
                "message": (
                    "Signups are temporarily unavailable. "
                    "Please try again later."
                ),
                "error_code": "FREE_PLAN_MISSING",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except Exception as e:
        logger.exception(
            "Failed to create service provider account."
        )
        return Response(
            {
                "message": (
                    "Failed to create service provider account."
                ),
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": (
                "Service provider account "
                "created successfully."
            ),
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": get_user_data(user),
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# SERVICE SEEKER SIGNUP
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def create_service_seeker(request):
    """
    Create a service seeker using email/password.
    Also attaches a free-plan Subscription.
    """

    if not find_free_plan():
        logger.error(
            "Signup blocked: no 'free' plan exists."
        )
        return Response(
            {
                "message": (
                    "Signups are temporarily unavailable. "
                    "Please try again later."
                ),
                "error_code": "FREE_PLAN_MISSING",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    data = request.data.copy()
    data["role"] = "serviceseeker"
    data["auth_provider"] = "local"

    serializer = CreateNewUserSerializer(data=data)

    if not serializer.is_valid():
        return Response(
            {
                "message": "Validation failed",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = serializer.save()
        attach_free_subscription(user)

    except FreePlanMissingError:
        transaction.set_rollback(True)
        logger.error(
            "Rolled back service seeker signup — "
            "free plan disappeared mid-request."
        )
        return Response(
            {
                "message": (
                    "Signups are temporarily unavailable. "
                    "Please try again later."
                ),
                "error_code": "FREE_PLAN_MISSING",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    except Exception as e:
        logger.exception(
            "Failed to create service seeker account."
        )
        return Response(
            {
                "message": (
                    "Failed to create service seeker account."
                ),
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": (
                "Service seeker account "
                "created successfully."
            ),
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": get_user_data(user),
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# GOOGLE TOKEN VERIFICATION
# ============================================================

def verify_google_token(token):
    """
    Verify a Google ID token.
    """

    google_client_id = config(
        "GOOGLE_CLIENT_ID",
        default="",
    )

    if not google_client_id:
        logger.error(
            "GOOGLE_CLIENT_ID is not configured."
        )
        raise ValueError(
            "GOOGLE_CLIENT_ID is not configured."
        )

    try:
        google_user = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            google_client_id,
        )

        logger.info(
            "Google token verified successfully for email=%s",
            google_user.get("email"),
        )

        return google_user

    except ValueError as e:
        logger.error(
            "GOOGLE TOKEN VERIFICATION FAILED: %s",
            str(e),
        )
        return None


# ============================================================
# HELPER: GET GOOGLE ACCOUNT DATA
# ============================================================

def get_google_account_data(google_user):
    """
    Extract useful account information from a verified
    Google ID token.
    """

    return {
        "google_id": google_user.get("sub"),
        "email": google_user.get("email"),
        "email_verified": google_user.get(
            "email_verified",
            False,
        ),
        "first_name": google_user.get("given_name", ""),
        "last_name": google_user.get("family_name", ""),
        "profile_image_url": google_user.get("picture", None),
    }


# ============================================================
# HELPER: GOOGLE ACCOUNT AUTHENTICATION
# ============================================================

def authenticate_google_user(request, expected_role):
    """
    Authenticate a user using a verified Google ID token.

    - Existing users are signed in and backfilled with a
      subscription if they don't have one.
    - NEW users are only created if the 'free' plan exists.
      Otherwise the signup is aborted and no user is created.
    """

    google_token = request.data.get("token")

    if not google_token:
        return Response(
            {"message": "Google token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    google_user = verify_google_token(google_token)

    if not google_user:
        return Response(
            {
                "message": (
                    "Invalid Google token. "
                    "Check the Django terminal for "
                    "the Google verification error."
                ),
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    google_data = get_google_account_data(google_user)

    google_id = google_data["google_id"]
    email = google_data["email"]
    email_verified = google_data["email_verified"]
    first_name = google_data["first_name"]
    last_name = google_data["last_name"]
    profile_image_url = google_data["profile_image_url"]

    if not google_id:
        return Response(
            {"message": "Google account ID was not provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not email:
        return Response(
            {"message": "Google email address was not provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not email_verified:
        return Response(
            {
                "message": (
                    "Google email address is not verified."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # Look for an existing account
    # --------------------------------------------------------
    user = Accounts.objects.filter(google_id=google_id).first()

    if not user:
        user = Accounts.objects.filter(
            email__iexact=email
        ).first()

    # ========================================================
    # EXISTING USER → sign in
    # ========================================================
    if user:
        if user.google_id and user.google_id != google_id:
            return Response(
                {
                    "message": (
                        "This email is already connected "
                        "to another Google account."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.role != expected_role:
            return Response(
                {
                    "message": (
                        "This Google account belongs "
                        "to a different account type."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        fields_to_update = []

        if user.google_id != google_id:
            user.google_id = google_id
            fields_to_update.append("google_id")

        if user.auth_provider != "google":
            user.auth_provider = "google"
            fields_to_update.append("auth_provider")

        if profile_image_url and not user.profile_image_url:
            user.profile_image_url = profile_image_url
            fields_to_update.append("profile_image_url")

        if first_name and not user.first_name:
            user.first_name = first_name
            fields_to_update.append("first_name")

        if last_name and not user.last_name:
            user.last_name = last_name
            fields_to_update.append("last_name")

        if fields_to_update:
            user.save(update_fields=fields_to_update)

        # ----------------------------------------------------
        # Safety net for existing accounts
        # ----------------------------------------------------
        try:
            attach_free_subscription(user)
        except FreePlanMissingError:
            logger.warning(
                "Existing user_id=%s has no subscription "
                "and no 'free' plan exists to create one.",
                user.id,
            )

    # ========================================================
    # NEW USER → create, but only if the free plan exists
    # ========================================================
    else:
        if not find_free_plan():
            logger.error(
                "Google signup blocked for email=%s — "
                "no 'free' plan exists.",
                email,
            )
            return Response(
                {
                    "message": (
                        "Signups are temporarily unavailable. "
                        "Please try again later."
                    ),
                    "error_code": "FREE_PLAN_MISSING",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            user = Accounts.objects.create_user(
                email=email,
                password=None,
                first_name=first_name,
                last_name=last_name,
                google_id=google_id,
                profile_image_url=profile_image_url,
                role=expected_role,
                auth_provider="google",
            )

            attach_free_subscription(user)

        except FreePlanMissingError:
            transaction.set_rollback(True)
            logger.error(
                "Rolled back Google signup — free plan missing."
            )
            return Response(
                {
                    "message": (
                        "Signups are temporarily unavailable. "
                        "Please try again later."
                    ),
                    "error_code": "FREE_PLAN_MISSING",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception as e:
            logger.exception(
                "Failed to create Google account for email=%s",
                email,
            )
            return Response(
                {
                    "message": "Failed to create account.",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # --------------------------------------------------------
    # Active check
    # --------------------------------------------------------
    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Google authentication successful.",
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": get_user_data(user),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# GOOGLE SERVICE PROVIDER SIGNUP
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def google_service_provider(request):
    """
    Create or login a service provider using Google.
    """

    return authenticate_google_user(
        request=request,
        expected_role="serviceprovider",
    )


# ============================================================
# GOOGLE SERVICE SEEKER SIGNUP
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@transaction.atomic
def google_service_seeker(request):
    """
    Create or login a service seeker using Google.
    """

    return authenticate_google_user(
        request=request,
        expected_role="serviceseeker",
    )


# ============================================================
# LOGIN
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login using email and password.
    """

    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"message": "Email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = Accounts.objects.get(email__iexact=email)
    except Accounts.DoesNotExist:
        return Response(
            {"message": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.check_password(password):
        return Response(
            {"message": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # --------------------------------------------------------
    # Safety net — backfill a subscription if the user
    # somehow doesn't have one yet.
    # --------------------------------------------------------
    try:
        attach_free_subscription(user)
    except FreePlanMissingError:
        logger.warning(
            "Login: user_id=%s has no subscription and no "
            "'free' plan exists to create one.",
            user.id,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Login successful.",
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "user": get_user_data(user),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LOGOUT
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout the currently authenticated user.
    """

    user = request.user

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"message": "Refresh token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()

    except TokenError as e:
        logger.warning(
            "Logout failed for user_id=%s: %s",
            user.id,
            str(e),
        )
        return Response(
            {
                "message": "Invalid or expired refresh token.",
                "error": str(e),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        logger.exception(
            "Unexpected error during logout for user_id=%s",
            user.id,
        )
        return Response(
            {"message": "Failed to log out.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Logged out successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# AUTH CHECK
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def auth_check(request):
    """
    Verify the Bearer token and return the current user.
    """

    auth = JWTAuthentication()

    try:
        result = auth.authenticate(request)
    except AuthenticationFailed as e:
        return Response(
            {"authenticated": False, "message": str(e)},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if result is None:
        return Response(
            {
                "authenticated": False,
                "message": (
                    "Authentication credentials were not provided."
                ),
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user, _ = result

    if not user.is_active:
        return Response(
            {
                "authenticated": False,
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(
        {"authenticated": True, "user": get_user_data(user)},
        status=status.HTTP_200_OK,
    )


# ============================================================
# CURRENT USER PROFILE IMAGE
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_image_url(request):
    """
    Return the profile image URL for the authenticated user.
    """

    user = request.user

    if not user.is_active:
        return Response(
            {
                "profile_image_url": None,
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(
        {"profile_image_url": user.profile_image_url},
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPLOAD / REPLACE PROFILE IMAGE
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_profile_image(request):
    """
    Upload (or replace) the authenticated user's profile image.
    """

    user = request.user

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    image_file = request.FILES.get("image")

    if not image_file:
        return Response(
            {"message": "No image file was provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = upload_or_replace_profile_image(
            image_file=image_file,
            user=user,
        )
    except Exception as e:
        logger.exception(
            "Failed to upload profile image for user_id=%s",
            user.id,
        )
        return Response(
            {
                "message": "Failed to upload profile image.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Profile image uploaded successfully.",
            "profile_image_url": result.get("url"),
            "profile_image_public_id": result.get("public_id"),
            "replaced": result.get("replaced", False),
            "old_public_id": result.get("old_public_id"),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE CURRENT USER
# ============================================================

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_user(request):
    """
    Update the currently authenticated user's profile.
    """

    user = request.user

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    allowed_fields = {
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "gender",
    }

    data = {
        key: value
        for key, value in request.data.items()
        if key in allowed_fields
    }

    if not data:
        return Response(
            {"message": "No updatable fields were provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = UpdateUserSerializer(
        instance=user,
        data=data,
        partial=True,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {
                "message": "Validation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        updated_user = serializer.save()
    except Exception as e:
        logger.exception("Failed to update user_id=%s", user.id)
        return Response(
            {
                "message": "Failed to update profile.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Profile updated successfully.",
            "user": get_user_data(updated_user),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE PASSWORD
# ============================================================

@api_view(["PUT", "POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_password(request):
    """
    Update the authenticated user's password.
    """

    user = request.user

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if (
        user.auth_provider == "google"
        and not user.has_usable_password()
    ):
        return Response(
            {
                "message": (
                    "This account uses Google sign-in and "
                    "does not have a password to change."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = UpdatePasswordSerializer(
        data=request.data,
        context={"request": request, "user": user},
    )

    if not serializer.is_valid():
        return Response(
            {
                "message": "Validation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        serializer.save()
    except Exception as e:
        logger.exception(
            "Failed to update password for user_id=%s",
            user.id,
        )
        return Response(
            {
                "message": "Failed to update password.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Password updated successfully."},
        status=status.HTTP_200_OK,
    )