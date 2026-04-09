from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ClientConfig
from .serializers import ClientConfigSerializer


# -----------------------------------
# Helper: Check role
# -----------------------------------
def is_admin(user):
    return user.role in ["admin", "superadmin"]


# -----------------------------------
# CREATE (only once)
# -----------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_client_config(request):

    if not is_admin(request.user):
        return Response(
            {"error": "Only admin or superadmin can create config"},
            status=status.HTTP_403_FORBIDDEN
        )

    if ClientConfig.objects.exists():
        return Response(
            {"error": "ClientConfig already exists"},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = ClientConfigSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -----------------------------------
# GET CONFIG (singleton)
# -----------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_client_config(request):

    config = ClientConfig.objects.first()

    if not config:
        return Response(
            {"error": "Config not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ClientConfigSerializer(config)
    return Response(serializer.data)


# -----------------------------------
# UPDATE CONFIG
# -----------------------------------
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_client_config(request):

    if not is_admin(request.user):
        return Response(
            {"error": "Only admin or superadmin can update"},
            status=status.HTTP_403_FORBIDDEN
        )

    config = ClientConfig.objects.first()

    if not config:
        return Response(
            {"error": "Config not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ClientConfigSerializer(
        config,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -----------------------------------
# DELETE CONFIG (optional)
# -----------------------------------
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_client_config(request):

    if not is_admin(request.user):
        return Response(
            {"error": "Only admin or superadmin can delete"},
            status=status.HTTP_403_FORBIDDEN
        )

    config = ClientConfig.objects.first()

    if not config:
        return Response(
            {"error": "Config not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    config.delete()

    return Response(
        {"message": "ClientConfig deleted successfully"},
        status=status.HTTP_204_NO_CONTENT
    )