# account/views.py

import logging

from decouple import config

from django.db import transaction

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Accounts
from .serializers import CreateNewUserSerializer


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

    # Never trust role from frontend
    data["role"] = "serviceprovider"

    # This endpoint is for local authentication
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

    # Never trust role from frontend
    data["role"] = "serviceseeker"

    # This endpoint is for local authentication
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

    Returns:
        dict:
            Verified Google account information.

        None:
            If the token is invalid.
    """

    # --------------------------------------------------------
    # GET GOOGLE CLIENT ID
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # VERIFY TOKEN
    # --------------------------------------------------------

    try:

        google_user = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            google_client_id,
        )

        # ----------------------------------------------------
        # DEBUG INFORMATION
        # ----------------------------------------------------
        #
        # Do NOT log the complete token.
        #
        # We only log safe identifying information useful
        # for debugging.
        # ----------------------------------------------------

        logger.info(
            "Google token verified successfully for email=%s",
            google_user.get("email"),
        )

        return google_user

    except ValueError as e:

        # ----------------------------------------------------
        # THIS IS IMPORTANT FOR DEBUGGING
        # ----------------------------------------------------
        #
        # Previously the actual Google error was hidden.
        #
        # Now Django will tell us exactly why verification
        # failed.
        # ----------------------------------------------------

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
    Extract the useful account information from a verified
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

    expected_role:
        serviceprovider
        or
        serviceseeker
    """

    # ========================================================
    # GET TOKEN
    # ========================================================

    google_token = request.data.get("token")

    if not google_token:

        return Response(
            {
                "message": "Google token is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ========================================================
    # VERIFY TOKEN
    # ========================================================

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

    # ========================================================
    # EXTRACT GOOGLE INFORMATION
    # ========================================================

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

    # ========================================================
    # VALIDATE GOOGLE INFORMATION
    # ========================================================

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

    # ========================================================
    # FIND USER BY GOOGLE ID
    # ========================================================

    user = Accounts.objects.filter(
        google_id=google_id
    ).first()

    # ========================================================
    # IF GOOGLE ID NOT FOUND
    #
    # TRY EMAIL
    # ========================================================

    if not user:

        user = Accounts.objects.filter(
            email__iexact=email
        ).first()

    # ========================================================
    # EXISTING USER
    # ========================================================

    if user:

        # ----------------------------------------------------
        # CHECK FOR DIFFERENT GOOGLE ACCOUNT
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # CHECK ROLE
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # CONNECT LOCAL ACCOUNT TO GOOGLE
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # ADD GOOGLE PROFILE IMAGE IF USER DOES NOT HAVE ONE
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # ADD GOOGLE FIRST NAME IF EMPTY
        # ----------------------------------------------------

        if (
            first_name
            and not user.first_name
        ):

            user.first_name = first_name

            fields_to_update.append(
                "first_name"
            )

        # ----------------------------------------------------
        # ADD GOOGLE LAST NAME IF EMPTY
        # ----------------------------------------------------

        if (
            last_name
            and not user.last_name
        ):

            user.last_name = last_name

            fields_to_update.append(
                "last_name"
            )

        # ----------------------------------------------------
        # SAVE ONLY IF NECESSARY
        # ----------------------------------------------------

        if fields_to_update:

            user.save(
                update_fields=fields_to_update
            )

    # ========================================================
    # NEW USER
    # ========================================================

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

    # ========================================================
    # CHECK ACCOUNT STATUS
    # ========================================================

    if not user.is_active:

        return Response(
            {
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ========================================================
    # GENERATE JWT TOKENS
    # ========================================================

    tokens = generate_tokens(user)

    # ========================================================
    # RETURN RESPONSE
    # ========================================================

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

    Expected request:

    {
        "token": "GOOGLE_ID_TOKEN"
    }
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

    Expected request:

    {
        "token": "GOOGLE_ID_TOKEN"
    }
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

    # ========================================================
    # VALIDATE REQUEST
    # ========================================================

    if not email or not password:

        return Response(
            {
                "message": (
                    "Email and password are required."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ========================================================
    # FIND USER
    # ========================================================

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

    # ========================================================
    # CHECK ACCOUNT STATUS
    # ========================================================

    if not user.is_active:

        return Response(
            {
                "message": (
                    "This account is inactive."
                ),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ========================================================
    # CHECK PASSWORD
    # ========================================================

    if not user.check_password(password):

        return Response(
            {
                "message": (
                    "Invalid email or password."
                ),
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # ========================================================
    # GENERATE TOKENS
    # ========================================================

    tokens = generate_tokens(user)

    # ========================================================
    # RESPONSE
    # ========================================================

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
# AUTH CHECK (used by ProtectedRoute on every navigation)
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def auth_check(request):
    """
    Verify the Bearer token and return the current user.

    Used by the frontend's ProtectedRoute on every navigation.

    Request:
        GET /account/auth-check/
        Authorization: Bearer <access_token>

    Response:
        200 {
            "authenticated": true,
            "user": { ...public user fields... }
        }
        401 {
            "authenticated": false,
            "message": "Invalid or expired token."
        }
        403 {
            "authenticated": false,
            "message": "This account is inactive."
        }
    """

    auth = JWTAuthentication()

    # ========================================================
    # AUTHENTICATE
    # ========================================================

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

    # ========================================================
    # NO CREDENTIALS PROVIDED
    # ========================================================

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

    # ========================================================
    # UNPACK USER
    # ========================================================

    user, _ = result

    # ========================================================
    # CHECK ACCOUNT STATUS
    # ========================================================

    if not user.is_active:

        return Response(
            {
                "authenticated": False,
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ========================================================
    # SUCCESS
    # ========================================================

    return Response(
        {
            "authenticated": True,
            "user": get_user_data(user),
        },
        status=status.HTTP_200_OK,
    )