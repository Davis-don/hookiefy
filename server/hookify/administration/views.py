# payments/views.py

from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PlatformConfig


# ============================================================
# HELPER
# ============================================================

def is_superadmin(user):
    return user.is_authenticated and user.role == "superadmin"


def serialize_platform_config(config):
    return {
        "id": config.id,
        "connection_fee": config.connection_fee,
        "currency": "KES",
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }


# ============================================================
# VIEW 1: FETCH CURRENT CONNECTION FEE
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_connection_fee_view(request):
    """
    Returns the current global connection fee.

    Any authenticated user can access this endpoint.
    """

    try:
        config = PlatformConfig.objects.first()

        if not config:
            return Response(
                {
                    "success": False,
                    "message": "Connection fee has not been configured yet.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "message": "Connection fee retrieved successfully.",
                "data": serialize_platform_config(config),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# VIEW 2: FETCH ALL PLATFORM CONFIGURATIONS
# SUPERADMIN ONLY
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_platform_configs_view(request):
    """
    Returns all PlatformConfig records.

    Only superadmins can access this endpoint.
    """

    if not is_superadmin(request.user):
        return Response(
            {
                "success": False,
                "message": "Only superadmins can access this endpoint.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        configs = PlatformConfig.objects.all().order_by("-created_at")

        data = [
            serialize_platform_config(config)
            for config in configs
        ]

        return Response(
            {
                "success": True,
                "message": "Platform configurations retrieved successfully.",
                "count": len(data),
                "data": data,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# VIEW 3: CREATE CONNECTION FEE
# SUPERADMIN ONLY
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_connection_fee_view(request):
    """
    Creates the global connection fee configuration.

    Only superadmins can create it.
    Only one global PlatformConfig should exist.
    """

    if not is_superadmin(request.user):
        return Response(
            {
                "success": False,
                "message": "Only superadmins can create the connection fee.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        # Only one global configuration is allowed
        if PlatformConfig.objects.exists():
            return Response(
                {
                    "success": False,
                    "message": (
                        "A connection fee configuration already exists. "
                        "Use the update endpoint instead."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection_fee = request.data.get("connection_fee")

        if connection_fee is None:
            return Response(
                {
                    "success": False,
                    "message": "connection_fee is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            connection_fee = Decimal(str(connection_fee))
        except (InvalidOperation, ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Connection fee must be a valid number.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if connection_fee < 0:
            return Response(
                {
                    "success": False,
                    "message": "Connection fee cannot be negative.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        config = PlatformConfig.objects.create(
            connection_fee=connection_fee
        )

        return Response(
            {
                "success": True,
                "message": "Connection fee created successfully.",
                "data": serialize_platform_config(config),
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# VIEW 4: UPDATE CONNECTION FEE
# SUPERADMIN ONLY
# ============================================================

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_connection_fee_view(request, config_id=None):
    """
    Updates the global connection fee.

    Only superadmins can update it.
    """

    if not is_superadmin(request.user):
        return Response(
            {
                "success": False,
                "message": "Only superadmins can update the connection fee.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        # If an ID is provided, use it.
        # Otherwise use the first/global configuration.
        if config_id:
            config = get_object_or_404(
                PlatformConfig,
                id=config_id
            )
        else:
            config = PlatformConfig.objects.first()

            if not config:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "Connection fee configuration does not exist. "
                            "Create one first."
                        ),
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        connection_fee = request.data.get("connection_fee")

        if connection_fee is None:
            return Response(
                {
                    "success": False,
                    "message": "connection_fee is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            connection_fee = Decimal(str(connection_fee))
        except (InvalidOperation, ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Connection fee must be a valid number.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if connection_fee < 0:
            return Response(
                {
                    "success": False,
                    "message": "Connection fee cannot be negative.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        config.connection_fee = connection_fee
        config.save()

        return Response(
            {
                "success": True,
                "message": "Connection fee updated successfully.",
                "data": serialize_platform_config(config),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# VIEW 5: DELETE CONNECTION FEE
# SUPERADMIN ONLY
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_connection_fee_view(request, config_id=None):
    """
    Deletes the global connection fee configuration.

    Only superadmins can delete it.
    """

    if not is_superadmin(request.user):
        return Response(
            {
                "success": False,
                "message": "Only superadmins can delete the connection fee.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        if config_id:
            config = get_object_or_404(
                PlatformConfig,
                id=config_id
            )
        else:
            config = PlatformConfig.objects.first()

            if not config:
                return Response(
                    {
                        "success": False,
                        "message": "Connection fee configuration not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

        config_id = config.id
        config.delete()

        return Response(
            {
                "success": True,
                "message": "Connection fee deleted successfully.",
                "data": {
                    "id": config_id,
                },
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )