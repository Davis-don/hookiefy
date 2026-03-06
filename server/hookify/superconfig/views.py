from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import AdminConfig
from .serializers import AdminConfigSerializer


# CREATE AdminConfig
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_admin_config(request):

    serializer = AdminConfigSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# GET ALL AdminConfigs
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_admin_configs(request):

    configs = AdminConfig.objects.all()
    serializer = AdminConfigSerializer(configs, many=True)

    return Response(serializer.data)


# GET SINGLE AdminConfig
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_admin_config(request, pk):

    try:
        config = AdminConfig.objects.get(id=pk)
    except AdminConfig.DoesNotExist:
        return Response(
            {"error": "AdminConfig not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = AdminConfigSerializer(config)

    return Response(serializer.data)


# UPDATE AdminConfig
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_admin_config(request, pk):

    try:
        config = AdminConfig.objects.get(id=pk)
    except AdminConfig.DoesNotExist:
        return Response(
            {"error": "AdminConfig not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = AdminConfigSerializer(config, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# DELETE AdminConfig
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_admin_config(request, pk):

    try:
        config = AdminConfig.objects.get(id=pk)
    except AdminConfig.DoesNotExist:
        return Response(
            {"error": "AdminConfig not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    config.delete()

    return Response(
        {"message": "AdminConfig deleted successfully"},
        status=status.HTTP_204_NO_CONTENT
    )