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
# PHONE HELPERS
# ============================================================

def normalize_local_phone(raw):
    if raw is None:
        return ""

    digits = "".join(ch for ch in str(raw) if ch.isdigit())

    if digits.startswith("254") and len(digits) > 9:
        digits = digits[3:]
    if digits.startswith("0"):
        digits = digits[1:]
    if len(digits) != 9:
        return ""
    if digits[0] not in ("7", "1"):
        return ""

    return digits


# ============================================================
# FORBIDDEN KEYS — client must never set these
# ============================================================

FORBIDDEN_UPDATE_KEYS = (
    "role",
    "status",
    "auth_provider",
    "google_id",
    "is_active",
    "is_staff",
    "is_superuser",
    "password",
    "password2",
    "profile_image_url",
    "profile_image_public_id",
    "date_joined",
    "last_login",
)


# ============================================================
# PROFILE IMAGE — GET
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_image_url(request):
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
        role, status, auth_provider, is_active,
        profile_image_*, password
    """

    # ── 1. Mutable copy ──────────────────────────────────────
    data = request.data.copy()

    # ── 2. Strip every server-owned key ─────────────────────
    for key in FORBIDDEN_UPDATE_KEYS:
        data.pop(key, None)

    # ── 3. Email — trim + lowercase ─────────────────────────
    if "email" in data and data["email"] is not None:
        data["email"] = str(data["email"]).strip().lower()

    # ── 4. Gender — blank → None ────────────────────────────
    if "gender" in data:
        raw_gender = data.get("gender")
        if raw_gender in (None, ""):
            data["gender"] = None

    # ── 5. Phone — accept any format, normalise ─────────────
    if "phone_number" in data:
        raw_phone = data.get("phone_number")

        if raw_phone in (None, ""):
            data["phone_number"] = None
        else:
            local = normalize_local_phone(raw_phone)
            if not local:
                return Response(
                    {
                        "phone_number": [
                            "Enter a valid Kenyan number. "
                            "It must start with 07, 01, 7 or 1."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data["phone_number"] = f"+254{local}"

    # ── 6. Serializer validation ────────────────────────────
    serializer = UpdateUserSerializer(
        request.user,
        data=data,
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