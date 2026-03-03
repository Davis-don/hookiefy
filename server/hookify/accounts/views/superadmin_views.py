# accounts/views/superadmin_views.py

# ---------------------------
# DJANGO IMPORTS
# ---------------------------
from django.contrib.auth import get_user_model

User = get_user_model()

# ---------------------------
# DRF IMPORTS
# ---------------------------
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# ---------------------------
# LOCAL IMPORTS
# ---------------------------
from ..authentication import CookieJWTAuthentication
from ..serializers import (
    AdminSignupSerializer,
    AdminUpdateSerializer,
)


# =====================================================
# SIGNUP VIEW (FOR ADMINS)
# =====================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def adminSignup(request):
    """
    Register a new Admin user (only SuperAdmins should call this endpoint)
    """

    if request.user.is_authenticated and request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can create Admin users."},
            status=status.HTTP_403_FORBIDDEN,
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


# =====================================================
# FETCH ALL ADMINS (SUPERADMIN ONLY)
# =====================================================
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def fetch_all_admins(request):

    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can view all admins."},
            status=status.HTTP_403_FORBIDDEN,
        )

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


# =====================================================
# UPDATE ADMIN
# =====================================================
@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_admin(request, admin_id):

    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can update admins."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        admin = User.objects.get(id=admin_id, role="admin")
    except User.DoesNotExist:
        return Response(
            {"error": "Admin not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = AdminUpdateSerializer(
        admin,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
        serializer.save()

        updated_admin = User.objects.select_related(
            "admin_profile"
        ).get(id=admin_id)

        return Response(
            {
                "message": "Admin updated successfully",
                "admin": {
                    "id": updated_admin.id,
                    "email": updated_admin.email,
                    "first_name": updated_admin.first_name,
                    "last_name": updated_admin.last_name,
                    "gender": updated_admin.admin_profile.gender
                    if hasattr(updated_admin, "admin_profile") else None,
                    "is_active": updated_admin.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# TOGGLE ADMIN STATUS
# =====================================================
@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def toggle_admin_status(request, admin_id):

    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can modify admin status."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        admin = User.objects.get(id=admin_id, role="admin")
    except User.DoesNotExist:
        return Response(
            {"error": "Admin not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

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
            },
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# DELETE ADMIN
# =====================================================
@api_view(['DELETE'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_admin(request, admin_id):

    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can delete admins."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        admin = User.objects.get(id=admin_id, role="admin")
    except User.DoesNotExist:
        return Response(
            {"error": "Admin not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    admin_info = {
        "id": admin.id,
        "email": admin.email,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
    }

    admin.delete()

    return Response(
        {
            "message": "Admin deleted successfully",
            "admin": admin_info,
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# BULK DEACTIVATE ADMINS
# =====================================================
@api_view(['POST'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def bulk_deactivate_admins(request):

    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can perform bulk actions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    admin_ids = request.data.get("admin_ids", [])

    if not admin_ids or not isinstance(admin_ids, list):
        return Response(
            {"error": "Please provide a list of admin IDs."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    admins = User.objects.filter(id__in=admin_ids, role="admin")

    if not admins.exists():
        return Response(
            {"error": "No valid admins found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    updated_count = admins.update(is_active=False)

    return Response(
        {
            "message": f"{updated_count} admin(s) deactivated successfully",
            "deactivated_count": updated_count,
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# BULK DELETE ADMINS
# =====================================================
@api_view(['DELETE'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def bulk_delete_admins(request):

    if request.user.role != "superadmin":
        return Response(
            {"error": "Only SuperAdmins can perform bulk actions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    admin_ids = request.data.get("admin_ids", [])

    if not admin_ids or not isinstance(admin_ids, list):
        return Response(
            {"error": "Please provide a list of admin IDs."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    admins = User.objects.filter(id__in=admin_ids, role="admin")

    if not admins.exists():
        return Response(
            {"error": "No valid admins found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    delete_count = admins.count()
    admins.delete()

    return Response(
        {
            "message": f"{delete_count} admin(s) deleted successfully",
            "deleted_count": delete_count,
        },
        status=status.HTTP_200_OK,
    )