

from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from account.models import Accounts
from account.serializers import CreateNewUserSerializer, UserSerializer
from plans.models import Plan
from subscription.services import subscribe


# ============================================================
# TOKENS
# ============================================================

def generate_tokens(user):
    """
    Generate JWT access and refresh tokens for a user.
    """
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ============================================================
# CREATE USER
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def create_user(request):
    """
    Create a normal user account using email and password.

    Public registration always creates:
        role = user
        auth_provider = local

    Superadmins cannot be created through this endpoint.

    On success, the user is subscribed to the system default plan.
    Registration is refused with 503 when no plan exists.
    """

    # ── 1. Resolve default plan BEFORE creating the user ──────
    default_plan = Plan.get_default()

    if default_plan is None:
        return Response(
            {
                "message": (
                    "Registration is temporarily unavailable. "
                    "No subscription plan has been configured."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # ── 2. Sanitise the payload ───────────────────────────────
    data = request.data.copy()

    data["role"] = "user"
    data["auth_provider"] = "local"

    data.pop("profile_image_url", None)
    data.pop("profile_image_public_id", None)
    data.pop("google_id", None)

    # ── 3. Validate ───────────────────────────────────────────
    serializer = CreateNewUserSerializer(data=data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 4. Create the user + attach subscription atomically ───
    try:
        with transaction.atomic():
            user = serializer.save()
            subscribe(
                user,
                default_plan,
                note="Auto-subscribed on signup.",
            )
    except IntegrityError:
        return Response(
            {"message": "An account with this email already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 5. Issue tokens + respond ─────────────────────────────
    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Account created successfully.",
            "user": UserSerializer(user).data,
            "tokens": tokens,
        },
        status=status.HTTP_201_CREATED,
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

    user = authenticate(
        request=request,
        username=email,
        password=password,
    )

    if user is None:
        return Response(
            {"message": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Login successful.",
            "user": UserSerializer(user).data,
            "tokens": tokens,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LOGOUT
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """
    Logout by blacklisting the refresh token.
    """

    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"message": "Refresh token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )

    except Exception:
        return Response(
            {"message": "Invalid or expired refresh token."},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============================================================
# AUTH CHECK
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_check(request):
    """
    Verify that the supplied JWT access token is valid.
    """

    return Response(
        {
            "authenticated": True,
            "user": UserSerializer(request.user).data,
        },
        status=status.HTTP_200_OK,
    )