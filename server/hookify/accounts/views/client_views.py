from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..authentication import CookieJWTAuthentication
from ..serializers import ClientUpdateSerializer, UpdatePasswordSerializer, ClientDetailSerializer

User = get_user_model()


# ================================
# Update Client Profile
# ================================
@api_view(["PATCH", "PUT"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_my_profile(request):
    if request.user.role != "client":
        return Response({"error": "Only clients allowed"}, status=403)

    serializer = ClientUpdateSerializer(
        request.user,
        data=request.data,
        partial=True
    )

    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response({"message": "Profile updated"}, status=200)


# ================================
# Update Client Password
# ================================
@api_view(["POST"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_password(request):
    if request.user.role != "client":
        return Response({"error": "Only clients allowed"}, status=403)

    serializer = UpdatePasswordSerializer(
        data=request.data,
        context={"request": request}
    )

    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response({"message": "Password updated"}, status=200)


# ================================
# Fetch Client Profile (without password)
# ================================
@api_view(["GET"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def fetch_my_profile(request):
    if request.user.role != "client":
        return Response({"error": "Only clients allowed"}, status=403)

    serializer = ClientDetailSerializer(request.user)
    return Response(serializer.data, status=200)