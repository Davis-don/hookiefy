from django.contrib.auth import authenticate

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

from account.serializers import (
    UserSerializer,
    UpdateUserSerializer,
    UpdatePasswordSerializer,
)

from account.controllers.cloudinary_utils import (
    upload_or_replace_profile_image,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_image_url(request):
    """
    Return the current user's profile image information.
    """

    user = request.user

    return Response(
        {
            "profile_image_url": user.profile_image_url,
            "profile_image_public_id": user.profile_image_public_id,
            "has_profile_image": user.has_profile_image,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_image(request):
    """
    Upload or replace the authenticated user's profile image.
    """

    image = request.FILES.get("image")

    if not image:
        return Response(
            {
                "message": "Profile image is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    try:
        image_url, public_id = upload_or_replace_profile_image(
            image=image,
            user=user,
        )

        user.profile_image_url = image_url
        user.profile_image_public_id = public_id
        user.save(
            update_fields=[
                "profile_image_url",
                "profile_image_public_id",
            ]
        )

    except Exception as error:
        return Response(
            {
                "message": "Failed to upload profile image.",
                "error": str(error),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Profile image uploaded successfully.",
            "profile_image_url": user.profile_image_url,
            "profile_image_public_id": user.profile_image_public_id,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_user(request):
    """
    Update the authenticated user's profile information.
    """

    serializer = UpdateUserSerializer(
        request.user,
        data=request.data,
        partial=True,
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = serializer.save()

    return Response(
        {
            "message": "Profile updated successfully.",
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_password(request):
    """
    Change the authenticated user's password.
    """

    serializer = UpdatePasswordSerializer(
        data=request.data,
        context={
            "request": request,
        },
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer.save()

    return Response(
        {
            "message": "Password updated successfully."
        },
        status=status.HTTP_200_OK,
    )