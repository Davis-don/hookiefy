# accounts/views/user_views.py

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..authentication import CookieJWTAuthentication
from ..serializers import (
    UserSerializer,
    UserUpdateSerializer,
    UpdatePasswordSerializer,
)


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

    serializer = UserUpdateSerializer(
        user,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            {
                "message": "Profile updated successfully",
                "user": {
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_200_OK,
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
        context={"request": request},
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            {"message": "Password updated successfully"},
            status=status.HTTP_200_OK,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)