from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import (
    LoginSerializer,
    UserSerializer,
    UserUpdateSerializer,
    UpdatePasswordSerializer,
    AdminSignupSerializer,  # ADD THIS IMPORT
)
from .authentication import CookieJWTAuthentication
from .models import AdminProfile


# ---------------------------
# SIGNUP VIEW (FOR ADMINS)
# ---------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def adminSignup(request):
    """
    Register a new Admin user (only SuperAdmins should call this endpoint)
    """
    # Check if current user is SuperAdmin (if authenticated)
    if request.user.is_authenticated and request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can create Admin users."},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = AdminSignupSerializer(data=request.data)  # Now this will work

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "message": "Admin user created successfully",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------
# LOGIN VIEW (JWT Cookie Based)
# ---------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login a user using email and password.
    Returns JWT tokens in HTTP-only cookies and role-based redirect info.
    """
    # 1️⃣ Validate input
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].strip().lower()
    password = serializer.validated_data['password']

    # 2️⃣ Authenticate user
    # ✅ Use 'username=email' because USERNAME_FIELD = 'email' in your User model
    user = authenticate(request, username=email, password=password)

    if user is None:
        return Response(
            {"error": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 3️⃣ Create JWT tokens
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # 4️⃣ Role-based redirect
    if user.role == "superadmin":
        redirect_to = "/superadmin/dashboard"
    elif user.role == "admin":
        redirect_to = "/admin/dashboard"
    else:
        redirect_to = "/client/dashboard"

    # 5️⃣ Prepare response
    response = Response(
        {
            "message": "Logged in successfully",
            "redirect_to": redirect_to,
        },
        status=status.HTTP_200_OK,
    )

    # 6️⃣ Set JWT cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Change to True in production with HTTPS
        samesite="Lax",
        path="/",
        max_age=60 * 60 * 12,  # 12 hours
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Change to True in production with HTTPS
        samesite="Lax",
        path="/",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )

    return response

# ---------------------------
# CHECK AUTH VIEW
# ---------------------------
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def check_auth(request):
    user = request.user

    if user.role == "superadmin":
        redirect_to = "/superadmin/dashboard"
    elif user.role == "admin":
        redirect_to = "/admin/dashboard"
    else:
        redirect_to = "/client/dashboard"

    return Response(
        {
            "authenticated": True,
            "redirect_to": redirect_to,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
            }
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------
# REFRESH TOKEN VIEW
# ---------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    refresh_token = request.COOKIES.get('refresh_token')

    if not refresh_token:
        return Response(
            {"error": "Refresh token not found"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)

        response = Response(
            {"message": "Token refreshed successfully"},
            status=status.HTTP_200_OK
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=60 * 60 * 12,
        )

        return response

    except TokenError:
        return Response(
            {"error": "Invalid or expired refresh token"},
            status=status.HTTP_401_UNAUTHORIZED
        )


# ---------------------------
# LOGOUT VIEW
# ---------------------------
@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def logout_view(request):
    refresh_token = request.COOKIES.get("refresh_token")

    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

    response = Response(
        {"message": "Logged out successfully"},
        status=status.HTTP_200_OK,
    )

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

    return response


# ---------------------------
# FETCH USER PROFILE VIEW
# ---------------------------
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def fetch_user_profile(request):
    user = request.user
    serializer = UserSerializer(user)

    return Response(
        {
            "message": "User profile fetched successfully",
            "user": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------
# UPDATE USER PROFILE VIEW
# ---------------------------
@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    user = request.user

    serializer = UserUpdateSerializer(user, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(
            {
                "message": "Profile updated successfully",
                "user": {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
            },
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------
# UPDATE PASSWORD VIEW
# ---------------------------
@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_password(request):
    serializer = UpdatePasswordSerializer(
        data=request.data,
        context={'request': request}
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            {"message": "Password updated successfully"},
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)