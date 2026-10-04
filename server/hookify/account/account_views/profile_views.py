# account/account_views/profile_views.py

import traceback

from rest_framework.decorators import (
    api_view,
    permission_classes,
    parser_classes,
)
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

from account.services.profile_stats import get_user_stats


# ============================================================
# PROFILE IMAGE — GET
# ============================================================

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


# ============================================================
# PROFILE IMAGE — POST (upload / replace)
# ============================================================

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
            {"message": "Profile image is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }

    if image.content_type not in allowed_types:
        return Response(
            {
                "message": (
                    "Unsupported file type. "
                    "Please use JPG, PNG, WEBP or GIF."
                ),
                "received_content_type": image.content_type,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    try:
        result = upload_or_replace_profile_image(
            image_file=image,
            user=user,
        )
    except Exception as error:
        traceback.print_exc()
        return Response(
            {
                "message": "Failed to upload profile image.",
                "error": str(error),
                "error_type": error.__class__.__name__,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Profile image uploaded successfully.",
            "profile_image_url": result.get("url") or user.profile_image_url,
            "profile_image_public_id": result.get("public_id")
            or user.profile_image_public_id,
            "replaced": result.get("replaced", False),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE ACCOUNT — general details
# PATCH /account/profile/
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_user(request):
    """
    Update the authenticated user's general details.

    Editable:
        email, first_name, last_name, gender, phone_number

    Not editable here:
        role, auth_provider, profile_image_*, password, is_active
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
            "message": "Account updated successfully.",
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE PASSWORD
# PATCH /account/password/
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_password(request):
    """
    Change the authenticated user's password.

    Body:
        {
            "old_password":     "...",
            "new_password":     "...",
            "new_password2":    "..."
        }
    """

    serializer = UpdatePasswordSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer.save()

    return Response(
        {"message": "Password updated successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# CURRENT USER — GET /account/me/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Return the full profile data of the authenticated user,
    plus counts and view totals across their content.
    """

    user = request.user
    stats = get_user_stats(user)

    return Response(
        {
            "user": UserSerializer(user).data,
            "counts": stats["counts"],
            "totals": stats["totals"],
        },
        status=status.HTTP_200_OK,
    )