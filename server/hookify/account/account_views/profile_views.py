# account/account_views/profile_views.py

import traceback

from django.contrib.auth.password_validation import validate_password as dj_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework.decorators import (
    api_view,
    permission_classes,
    parser_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

from account.models import Accounts
from account.serializers import (
    UserSerializer,
    UpdateUserSerializer,
    UpdatePasswordSerializer,
)

from account.controllers.cloudinary_utils import (
    upload_or_replace_profile_image,
    ImageValidationError,
    ALLOWED_MIME_TYPES,
    ALLOWED_IMAGE_LABEL,
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
# TARGET RESOLUTION — caller updates self by default,
# but a superadmin can target any account.
# ============================================================

def resolve_target_user(request):
    """
    Return (target_user, error_response_or_None).

    Rules:
        • Anonymous → never reaches here (IsAuthenticated).
        • Non-superadmin caller:
            - no query params → target = themselves
            - any target query params → 403
        • Superadmin caller:
            - no query params → target = themselves
            - ?user_id=<id> → that user (404 if missing)
            - ?email=<email> → that user (404 if missing)
    """

    requesting_user = request.user

    target_id = request.query_params.get("user_id")
    target_email = request.query_params.get("email")

    # No target specified → update self (allowed for everyone).
    if not target_id and not target_email:
        return requesting_user, None

    # A target was specified → only superadmins may use it.
    if not getattr(requesting_user, "is_superadmin", False):
        return None, Response(
            {
                "message": (
                    "Only superadmins can update other accounts."
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # Resolve the target.
    if target_id:
        try:
            target = Accounts.objects.get(pk=target_id)
        except (Accounts.DoesNotExist, ValueError, TypeError):
            return None, Response(
                {"message": "Target account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return target, None

    # Resolve by email.
    target = Accounts.objects.filter(email__iexact=target_email).first()
    if target is None:
        return None, Response(
            {"message": "Target account not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return target, None


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

    # ── Quick MIME gate before touching the util ────────────
    content_type = (getattr(image, "content_type", "") or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        return Response(
            {
                "message": (
                    f"Unsupported file type. Please use {ALLOWED_IMAGE_LABEL}."
                ),
                "received_content_type": content_type,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    try:
        result = upload_or_replace_profile_image(
            image_file=image,
            user=user,
        )

    except ImageValidationError as error:
        return Response(
            {"message": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as error:
        traceback.print_exc()
        return Response(
            {
                "message": f"Image upload failed: {str(error)}",
                "error_type": error.__class__.__name__,
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
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
#
# Caller updates themselves by default.
# Superadmin may add ?user_id=<id> or ?email=<email> to
# update any account.
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_user(request):
    """
    Update an account's general details.

    Editable:
        email, first_name, last_name, gender, phone_number

    Not editable here:
        role, status, auth_provider, is_active,
        profile_image_*, password

    Targeting (superadmin only):
        ?user_id=<id>
        ?email=<email>
    """

    # ── 0. Resolve target ────────────────────────────────────
    target, error_response = resolve_target_user(request)
    if error_response is not None:
        return error_response

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
        target,
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
#
# Caller updates themselves by default — current password required.
# Superadmin may add ?user_id=<id> or ?email=<email> to reset
# another user's password — current password NOT required.
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_password(request):
    # ── 0. Resolve target ────────────────────────────────────
    target, error_response = resolve_target_user(request)
    if error_response is not None:
        return error_response

    requesting_user = request.user
    acting_on_self = target.pk == requesting_user.pk

    # ── 1. Pull the incoming fields ──────────────────────────
    incoming = request.data

    new_password = (
        incoming.get("password")
        or incoming.get("new_password")
        or ""
    )
    confirm_password = (
        incoming.get("password2")
        or incoming.get("confirm_password")
        or ""
    )

    if not new_password:
        return Response(
            {"password": ["Please enter a new password."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not confirm_password:
        return Response(
            {"password2": ["Please confirm the password."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if new_password != confirm_password:
        return Response(
            {"password2": ["Passwords do not match."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 2. Superadmin resetting someone else ─────────────────
    #
    # No current_password required. We don't touch the serializer
    # at all — we just apply Django's password validators and save.
    if not acting_on_self:
        try:
            dj_validate_password(new_password, user=target)
        except DjangoValidationError as error:
            return Response(
                {"password": list(error.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target.set_password(new_password)
        target.save(update_fields=["password"])

        return Response(
            {"message": "Password updated successfully."},
            status=status.HTTP_200_OK,
        )

    # ── 3. Self-service password change ──────────────────────
    #
    # Current password required. Delegate to the serializer so
    # its own field-level validators run as before.
    serializer = UpdatePasswordSerializer(
        data=incoming,
        context={
            "request": request,
            "target_user": target,
            "acting_on_self": True,
        },
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer.save(user=target)

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