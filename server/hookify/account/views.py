# account/views.py

import logging

from decouple import config

from django.db import transaction
from django.utils import timezone

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

from .models import Accounts
from .serializers import CreateNewUserSerializer,UpdateUserSerializer

# ── Cloudinary helper for profile image upload ───────────────
from .controllers.cloudinary_utils import upload_or_replace_profile_image
# ─────────────────────────────────────────────────────────────


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


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
    """

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
    """

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
        "first_name": google_user.get(
            "given_name",
            "",
        ),
        "last_name": google_user.get(
            "family_name",
            "",
        ),
        "profile_image_url": google_user.get(
            "picture",
            None,
        ),
    }


# ============================================================
# HELPER: GOOGLE ACCOUNT AUTHENTICATION
# ============================================================

def authenticate_google_user(
    request,
    expected_role,
):
    """
    Authenticate a user using a verified Google ID token.
    """

    google_token = request.data.get("token")

    if not google_token:

        return Response(
            {
                "message": "Google token is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    google_user = verify_google_token(
        google_token
    )

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

    google_data = get_google_account_data(
        google_user
    )

    google_id = google_data["google_id"]
    email = google_data["email"]
    email_verified = google_data["email_verified"]

    first_name = google_data["first_name"]
    last_name = google_data["last_name"]

    profile_image_url = google_data[
        "profile_image_url"
    ]

    if not google_id:

        return Response(
            {
                "message": (
                    "Google account ID was not provided."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not email:

        return Response(
            {
                "message": (
                    "Google email address was not provided."
                ),
            },
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

    user = Accounts.objects.filter(
        google_id=google_id
    ).first()

    if not user:

        user = Accounts.objects.filter(
            email__iexact=email
        ).first()

    if user:

        if (
            user.google_id
            and user.google_id != google_id
        ):

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

            fields_to_update.append(
                "google_id"
            )

        if user.auth_provider != "google":

            user.auth_provider = "google"

            fields_to_update.append(
                "auth_provider"
            )

        if (
            profile_image_url
            and not user.profile_image_url
        ):

            user.profile_image_url = (
                profile_image_url
            )

            fields_to_update.append(
                "profile_image_url"
            )

        if (
            first_name
            and not user.first_name
        ):

            user.first_name = first_name

            fields_to_update.append(
                "first_name"
            )

        if (
            last_name
            and not user.last_name
        ):

            user.last_name = last_name

            fields_to_update.append(
                "last_name"
            )

        if fields_to_update:

            user.save(
                update_fields=fields_to_update
            )

    else:

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

    if not user.is_active:

        return Response(
            {
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": (
                "Google authentication "
                "successful."
            ),
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
            {
                "message": (
                    "Email and password are required."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:

        user = Accounts.objects.get(
            email__iexact=email
        )

    except Accounts.DoesNotExist:

        return Response(
            {
                "message": (
                    "Invalid email or password."
                ),
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:

        return Response(
            {
                "message": (
                    "This account is inactive."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.check_password(password):

        return Response(
            {
                "message": (
                    "Invalid email or password."
                ),
            },
            status=status.HTTP_401_UNAUTHORIZED,
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
            {
                "authenticated": False,
                "message": str(e),
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if result is None:

        return Response(
            {
                "authenticated": False,
                "message": (
                    "Authentication credentials "
                    "were not provided."
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
        {
            "authenticated": True,
            "user": get_user_data(user),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CURRENT USER PROFILE IMAGE
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_image_url(request):
    """
    Return the profile image URL belonging ONLY to the
    currently authenticated user.
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

    image_url = user.profile_image_url

    return Response(
        {
            "profile_image_url": image_url,
        },
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

    Request:
        POST /account/upload-profile-image/
        Authorization: Bearer <access_token>
        Content-Type: multipart/form-data
        Body:
            image: <file>

    Behavior:
        - If the user already has a Cloudinary image
          (profile_image_public_id is set), the old image
          is deleted from Cloudinary before the new one is
          uploaded.
        - If the user only had a Google image URL (no public_id),
          the helper skips deletion and just uploads the new image.
        - The user's profile_image_url and profile_image_public_id
          are updated in the DB.
    """

    user = request.user

    if not user.is_active:

        return Response(
            {
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    image_file = request.FILES.get("image")

    if not image_file:

        return Response(
            {
                "message": "No image file was provided.",
            },
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
# PREMIUM / VERIFIED STATUS CHECK
# ============================================================

# ============================================================
# PREMIUM / VERIFIED STATUS CHECK
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_premium_status(request):
    """
    Return whether the currently authenticated user has an
    active Premium/Verified status, plus how much time is
    left before it expires.

    Response:
        {
            "is_premium": true|false,
            "role": "serviceprovider",
            "expires_at": "2026-01-01T00:00:00Z" | null,
            "is_expired": true|false,
            "time_remaining": {
                "total_seconds": 123456,
                "days": 1,
                "hours": 10,
                "minutes": 17,
                "seconds": 36,
                "human": "1 day, 10 hours, 17 minutes",
                "short": "1d 10h 17m"
            } | null
        }

    Notes:
        - Only service providers can ever be Premium/Verified.
        - Service seekers and superadmins always get
          is_premium = False and time_remaining = null.
        - "is_premium" is True only when the account is a
          service provider AND is_premium is True AND
          premium_expires_at is in the future.
        - time_remaining is null when there is no active
          premium period (no expiry set, or already expired).
    """

    user = request.user

    if not user.is_active:

        return Response(
            {
                "is_premium": False,
                "message": "This account is inactive.",
                "time_remaining": None,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    is_premium = user.premium_is_active
    expires_at = user.premium_expires_at

    # --------------------------------------------------------
    # BUILD TIME-REMAINING OBJECT
    # --------------------------------------------------------
    #
    # Only compute the countdown when the account is
    # actually premium and an expiry date exists.
    # --------------------------------------------------------

    time_remaining = None

    if is_premium and expires_at:

        now = timezone.now()
        delta = expires_at - now
        total_seconds = int(delta.total_seconds())

        # Days = full 24-hour days
        days = total_seconds // 86400

        # Hours = remainder after full days
        hours = (total_seconds % 86400) // 3600

        # Minutes = remainder after full hours
        minutes = (total_seconds % 3600) // 60

        # Seconds = remainder after full minutes
        seconds = total_seconds % 60

        # ----------------------------------------------------
        # HUMAN-READABLE STRING
        # ----------------------------------------------------
        #
        # Examples:
        #   1 day, 10 hours, 17 minutes
        #   3 hours, 5 minutes
        #   42 minutes
        #   Less than a minute
        # ----------------------------------------------------

        parts = []

        if days > 0:
            parts.append(f"{days} day{'s' if days != 1 else ''}")

        if hours > 0:
            parts.append(
                f"{hours} hour{'s' if hours != 1 else ''}"
            )

        if minutes > 0:
            parts.append(
                f"{minutes} minute{'s' if minutes != 1 else ''}"
            )

        human = (
            ", ".join(parts)
            if parts
            else "Less than a minute"
        )

        # ----------------------------------------------------
        # SHORT STRING (for tight UI spaces)
        # ----------------------------------------------------
        #
        # Examples: "1d 10h 17m", "3h 5m", "42m"
        # ----------------------------------------------------

        short_parts = []

        if days > 0:
            short_parts.append(f"{days}d")

        if hours > 0:
            short_parts.append(f"{hours}h")

        if minutes > 0:
            short_parts.append(f"{minutes}m")

        short = " ".join(short_parts) or "<1m"

        time_remaining = {
            "total_seconds": total_seconds,
            "days": days,
            "hours": hours,
            "minutes": minutes,
            "seconds": seconds,
            "human": human,
            "short": short,
        }

    return Response(
        {
            "is_premium": is_premium,
            "role": user.role,
            "expires_at": expires_at if expires_at else None,
            "is_expired": user.premium_is_expired,
            "time_remaining": time_remaining,
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

    Updatable fields:
        - first_name
        - last_name
        - email
        - phone_number
        - gender

    NOT updatable (silently rejected if sent):
        - role
        - auth_provider
        - google_id
        - profile_image_url
        - profile_image_public_id
        - is_premium
        - premium_expires_at
        - is_active
        - is_staff
        - is_superuser
        - password

    Uniqueness rules (enforced in serializer):
        - email must be unique across all accounts
        - phone_number must be unique across all accounts

    Request body (any subset of the above):
        {
            "first_name": "Brian",
            "last_name": "Kamau",
            "email": "brian@example.com",
            "phone_number": "0712345678",
            "gender": "M"
        }

    Response:
        {
            "message": "Profile updated successfully.",
            "user": { ... same shape as get_user_data() ... }
        }
    """

    user = request.user

    if not user.is_active:

        return Response(
            {
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # --------------------------------------------------------
    # ONLY ALLOW THESE FIELDS THROUGH
    # --------------------------------------------------------
    #
    # This blocks a client from sneaking in `role`,
    # `is_premium`, `google_id`, etc. Even if they send
    # them, they'll be silently ignored.
    # --------------------------------------------------------

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
            {
                "message": "No updatable fields were provided.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # SERIALIZE + VALIDATE
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    try:

        updated_user = serializer.save()

    except Exception as e:

        logger.exception(
            "Failed to update user_id=%s",
            user.id,
        )

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