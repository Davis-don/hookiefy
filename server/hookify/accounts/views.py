from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.shortcuts import get_object_or_404
from django.db import transaction

from .serializers import (
    LoginSerializer,
    UserSerializer,
    UserUpdateSerializer,
    UpdatePasswordSerializer,
    AdminSignupSerializer,
    AdminUpdateSerializer,  # Add this new import
)
from .authentication import CookieJWTAuthentication
from .models import AdminProfile, User


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

    serializer = AdminSignupSerializer(data=request.data)

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


# ---------------------------
# FETCH ALL ADMINS (SUPERADMIN ONLY)
# ---------------------------
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def fetch_all_admins(request):
    """
    Fetch all Admin users with their profile data.
    Only SuperAdmins can access this endpoint.
    """

    # 🔐 Restrict access
    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can view all admins."},
            status=status.HTTP_403_FORBIDDEN
        )

    from django.contrib.auth import get_user_model
    User = get_user_model()

    admins = (
        User.objects
        .filter(role="admin")
        .select_related("admin_profile")
        .order_by("-id")
    )

    admin_list = []

    for admin in admins:
        admin_list.append({
            "id": admin.id,
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "role": admin.role,
            "gender": admin.admin_profile.gender if hasattr(admin, "admin_profile") else None,
            "is_active": admin.is_active,
            "date_joined": admin.date_joined,
        })

    return Response(
        {
            "message": "Admins fetched successfully",
            "total_admins": admins.count(),
            "admins": admin_list,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------
# UPDATE ADMIN (INLINE EDIT)
# ---------------------------
@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_admin(request, admin_id):
    """
    Update an admin's details (first_name, last_name, gender).
    Only SuperAdmins can access this endpoint.
    """
    # 🔐 Restrict access to SuperAdmins only
    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can update admins."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        admin = User.objects.get(id=admin_id, role="admin")
    except User.DoesNotExist:
        return Response(
            {"error": "Admin not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = AdminUpdateSerializer(admin, data=request.data, partial=True, context={'request': request})

    if serializer.is_valid():
        serializer.save()
        
        # Get updated admin with profile
        updated_admin = User.objects.select_related('admin_profile').get(id=admin_id)
        
        return Response(
            {
                "message": "Admin updated successfully",
                "admin": {
                    "id": updated_admin.id,
                    "email": updated_admin.email,
                    "first_name": updated_admin.first_name,
                    "last_name": updated_admin.last_name,
                    "gender": updated_admin.admin_profile.gender if hasattr(updated_admin, 'admin_profile') else None,
                    "is_active": updated_admin.is_active,
                }
            },
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------
# TOGGLE ADMIN STATUS (ACTIVATE/DEACTIVATE)
# ---------------------------
@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def toggle_admin_status(request, admin_id):
    """
    Activate or deactivate an admin user.
    Only SuperAdmins can access this endpoint.
    """
    # 🔐 Restrict access to SuperAdmins only
    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can modify admin status."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        admin = User.objects.get(id=admin_id, role="admin")
    except User.DoesNotExist:
        return Response(
            {"error": "Admin not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Toggle the status
    admin.is_active = not admin.is_active
    admin.save()

    action = "activated" if admin.is_active else "deactivated"

    return Response(
        {
            "message": f"Admin {action} successfully",
            "admin": {
                "id": admin.id,
                "email": admin.email,
                "first_name": admin.first_name,
                "last_name": admin.last_name,
                "is_active": admin.is_active,
            }
        },
        status=status.HTTP_200_OK
    )


# ---------------------------
# DELETE ADMIN
# ---------------------------
@api_view(['DELETE'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_admin(request, admin_id):
    """
    Delete an admin user.
    Only SuperAdmins can access this endpoint.
    """
    # 🔐 Restrict access to SuperAdmins only
    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can delete admins."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        admin = User.objects.get(id=admin_id, role="admin")
    except User.DoesNotExist:
        return Response(
            {"error": "Admin not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Store admin info for response
    admin_info = {
        "id": admin.id,
        "email": admin.email,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
    }

    # Delete the admin
    admin.delete()

    return Response(
        {
            "message": "Admin deleted successfully",
            "admin": admin_info
        },
        status=status.HTTP_200_OK
    )


# ---------------------------
# BULK DEACTIVATE ADMINS
# ---------------------------
@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def bulk_deactivate_admins(request):
    """
    Deactivate multiple admin users at once.
    Only SuperAdmins can access this endpoint.
    """
    # 🔐 Restrict access to SuperAdmins only
    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can perform bulk actions."},
            status=status.HTTP_403_FORBIDDEN
        )

    admin_ids = request.data.get('admin_ids', [])
    
    if not admin_ids or not isinstance(admin_ids, list):
        return Response(
            {"error": "Please provide a list of admin IDs."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get all valid admins
    admins = User.objects.filter(id__in=admin_ids, role="admin")
    
    if not admins.exists():
        return Response(
            {"error": "No valid admins found with the provided IDs."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Deactivate all found admins
    updated_count = admins.update(is_active=False)

    return Response(
        {
            "message": f"{updated_count} admin(s) deactivated successfully",
            "deactivated_count": updated_count
        },
        status=status.HTTP_200_OK
    )


# ---------------------------
# BULK DELETE ADMINS
# ---------------------------
@api_view(['DELETE'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def bulk_delete_admins(request):
    """
    Delete multiple admin users at once.
    Only SuperAdmins can access this endpoint.
    """
    # 🔐 Restrict access to SuperAdmins only
    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can perform bulk actions."},
            status=status.HTTP_403_FORBIDDEN
        )

    admin_ids = request.data.get('admin_ids', [])
    
    if not admin_ids or not isinstance(admin_ids, list):
        return Response(
            {"error": "Please provide a list of admin IDs."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get all valid admins
    admins = User.objects.filter(id__in=admin_ids, role="admin")
    
    if not admins.exists():
        return Response(
            {"error": "No valid admins found with the provided IDs."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Count before deletion
    delete_count = admins.count()

    # Delete all found admins
    admins.delete()

    return Response(
        {
            "message": f"{delete_count} admin(s) deleted successfully",
            "deleted_count": delete_count
        },
        status=status.HTTP_200_OK
    )