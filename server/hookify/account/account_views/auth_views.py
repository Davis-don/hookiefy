from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from account.models import Accounts
from account.serializers import CreateNewUserSerializer, UserSerializer
from plans.models import Plan
from subscription.services import subscribe


# ============================================================
# VALIDATORS — mirror the frontend rules
# ============================================================

COMMON_TLDS = {
    # generic
    "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz",
    "io", "co", "app", "dev", "ai", "me", "tv", "xyz", "online",
    "site", "store", "tech", "cloud", "email", "pro", "name",

    # Africa / Kenya + common
    "ke", "tz", "ug", "rw", "bi", "et", "so", "ss", "sd", "eg",
    "za", "ng", "gh", "zm", "zw", "mw", "mz", "na", "bw",

    # common others
    "uk", "us", "ca", "au", "nz", "de", "fr", "es", "it", "nl",
    "be", "ch", "at", "se", "no", "dk", "fi", "ie", "pt", "gr",
    "pl", "cz", "ro", "hu", "ru", "ua", "tr", "il", "ae", "sa",
    "in", "pk", "bd", "lk", "np", "cn", "jp", "kr", "sg", "my",
    "id", "ph", "th", "vn", "hk", "tw",
}

EMAIL_TYPO_DOMAINS = {
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.cm": "gmail.com",
    "gmail.con": "gmail.com",
    "gmailcom": "gmail.com",
    "gnail.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.comm": "gmail.com",

    "yaho.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "yahoo.co": "yahoo.com",
    "yahoo.con": "yahoo.com",
    "yhaoo.com": "yahoo.com",

    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "hotmail.co": "hotmail.com",
    "hotmail.con": "hotmail.com",
    "homail.com": "hotmail.com",

    "outlok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "outlook.co": "outlook.com",
    "outlook.con": "outlook.com",
    "outllok.com": "outlook.com",

    "iclod.com": "icloud.com",
    "icloud.co": "icloud.com",
    "icoud.com": "icloud.com",

    "protonmai.com": "protonmail.com",
    "protonmal.com": "protonmail.com",

    "yandex.co": "yandex.com",
    "yandex.con": "yandex.com",
}

DISPOSABLE_DOMAINS = {
    "mailinator.com",
    "10minutemail.com",
    "tempmail.com",
    "temp-mail.org",
    "guerrillamail.com",
    "sharklasers.com",
    "throwawaymail.com",
    "yopmail.com",
    "trashmail.com",
    "getnada.com",
    "dispostable.com",
    "fakeinbox.com",
}


def validate_email_address(raw: str) -> str:
    """
    Returns "" if valid, else an error message string.
    Mirrors the frontend validateEmail().
    """
    value = (raw or "").strip().lower()

    if not value:
        return "Please enter your email address."

    if value.count("@") != 1:
        return "Enter a valid email address."

    if len(value) > 254:
        return "Email address is too long."

    local, _, domain = value.partition("@")

    if not local or not domain:
        return "Enter a valid email address."

    if len(local) > 64:
        return "The part before @ cannot exceed 64 characters."

    if "." not in domain:
        return "Enter a valid email address."

    tld = domain.rsplit(".", 1)[-1]

    if tld not in COMMON_TLDS:
        return f"'.{tld}' is not a recognised email domain ending."

    if domain in EMAIL_TYPO_DOMAINS:
        return f"Did you mean {local}@{EMAIL_TYPO_DOMAINS[domain]}?"

    if domain in DISPOSABLE_DOMAINS:
        return "Disposable email addresses are not allowed."

    return ""


def normalize_local_phone(raw: str) -> str:
    """
    Accepts a Kenyan number in any of these forms:
        +254712345678 / 254712345678 / 0712345678 / 712345678
    Returns the 9-digit local part if valid, else "".
    Rules (mirroring the frontend):
        - exactly 9 digits after stripping prefixes
        - must start with 7 or 1
    """
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


def validate_phone_number(raw: str) -> str:
    """
    Returns "" if valid, else an error message string.
    """
    if raw is None or str(raw).strip() == "":
        return ""  # optional — no phone provided is fine

    if not normalize_local_phone(raw):
        return (
            "Enter a valid Kenyan number. It must start with 07, 01, 7 or 1."
        )

    return ""


# ============================================================
# TOKENS
# ============================================================

def generate_tokens(user):
    """
    Generate JWT access and refresh tokens for a user.
    """
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ============================================================
# CREATE USER
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def create_user(request):
    """
    Create a normal user account using first name, last name,
    email and password.

    gender and phone_number are optional and validated if present.

    Public registration always creates:
        role = user
        auth_provider = local

    Superadmins cannot be created through this endpoint.

    Registration requires a plan marked as the default.

    Refusals:
        - 503 if no plans exist at all.
        - 503 if plans exist but none is marked as default.
    """

    # ── 1. Does the system have any plans at all? ─────────────
    if not Plan.objects.exists():
        return Response(
            {
                "message": (
                    "Registration is temporarily unavailable. "
                    "No subscription plan has been configured."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # ── 2. Is there a plan explicitly marked as default? ─────
    default_plan = Plan.objects.filter(is_default=True).first()

    if default_plan is None:
        return Response(
            {
                "message": (
                    "Registration is temporarily unavailable. "
                    "No default plan has been set. "
                    "Please contact the administrator."
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # ── 3. Sanitise the payload ───────────────────────────────
    data = request.data.copy()

    data["role"] = "user"
    data["auth_provider"] = "local"

    data.pop("profile_image_url", None)
    data.pop("profile_image_public_id", None)
    data.pop("google_id", None)

    # ── 4. Backend-side validation (email + phone) ────────────
    errors = {}

    email_error = validate_email_address(data.get("email", ""))
    if email_error:
        errors["email"] = [email_error]

    phone_error = validate_phone_number(data.get("phone_number", ""))
    if phone_error:
        errors["phone_number"] = [phone_error]

    # If a phone was supplied and valid, normalise it to +254XXXXXXXXX
    if "phone_number" in data and not phone_error:
        raw_phone = data.get("phone_number")
        if raw_phone and str(raw_phone).strip():
            local = normalize_local_phone(raw_phone)
            data["phone_number"] = f"+254{local}"
        else:
            # Blank string → null so the model can store None
            data["phone_number"] = None

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    # ── 5. Serializer validation ──────────────────────────────
    serializer = CreateNewUserSerializer(data=data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 6. Create the user + attach subscription atomically ───
    try:
        with transaction.atomic():
            user = serializer.save()
            subscribe(
                user,
                default_plan,
                note="Auto-subscribed on signup.",
            )
    except IntegrityError:
        return Response(
            {"message": "An account with this email already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 7. Issue tokens + respond ─────────────────────────────
    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Account created successfully.",
            "user": UserSerializer(user).data,
            "tokens": tokens,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# LOGIN
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login using email and password.
    """

    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"message": "Email and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(
        request=request,
        username=email,
        password=password,
    )

    if user is None:
        return Response(
            {"message": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Login successful.",
            "user": UserSerializer(user).data,
            "tokens": tokens,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LOGOUT
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """
    Logout by blacklisting the refresh token.
    """

    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"message": "Refresh token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response(
            {"message": "Logout successful."},
            status=status.HTTP_200_OK,
        )

    except Exception:
        return Response(
            {"message": "Invalid or expired refresh token."},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============================================================
# AUTH CHECK
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_check(request):
    """
    Verify that the supplied JWT access token is valid.
    """

    return Response(
        {
            "authenticated": True,
            "user": UserSerializer(request.user).data,
        },
        status=status.HTTP_200_OK,
    )