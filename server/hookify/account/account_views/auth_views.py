# account/auth_views.py

from django.contrib.auth import authenticate
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
    "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz",
    "io", "co", "app", "dev", "ai", "me", "tv", "xyz", "online",
    "site", "store", "tech", "cloud", "email", "pro", "name",
    "ke", "tz", "ug", "rw", "bi", "et", "so", "ss", "sd", "eg",
    "za", "ng", "gh", "zm", "zw", "mw", "mz", "na", "bw",
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
    if raw is None or str(raw).strip() == "":
        return ""
    if not normalize_local_phone(raw):
        return (
            "Enter a valid Kenyan number. It must start with 07, 01, 7 or 1."
        )
    return ""


# ============================================================
# FORBIDDEN KEYS — the client must never set these
# ============================================================

FORBIDDEN_CREATE_KEYS = (
    # role / auth
    "role",
    "auth_provider",
    "google_id",

    # active state
    "is_active",
    "is_staff",
    "is_superuser",

    # server-controlled status
    "status",

    # Youpata-managed flag is server-controlled: it is set
    # automatically based on whether the request is made by
    # an authenticated superadmin. Clients must never set it.
    "is_youpata_managed",

    # images
    "profile_image_url",
    "profile_image_public_id",

    # timestamps
    "date_joined",
    "last_login",
    "last_login_at",

    # passwords
    "password",
    "password2",
)


# ============================================================
# TOKENS
# ============================================================

def generate_tokens(user):
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
    Create an account using first name, last name, email and password.

    Two modes, decided purely by who is making the request:

      1. Anonymous (public signup)
         → role = "user", is_youpata_managed = False

      2. Authenticated superadmin (super admin dashboard)
         → role = "user", is_youpata_managed = True

    In BOTH cases the client can never influence role,
    auth_provider, is_staff, is_superuser, or is_youpata_managed —
    those are all set server-side.

    Registration requires a plan marked as the default.
    """

    # ── 0. Who is calling? ───────────────────────────────────
    # Permission is AllowAny so public signup still works.
    # We only treat the caller as a superadmin if the request
    # is authenticated *and* their role is superadmin.
    requesting_user = request.user if request.user.is_authenticated else None
    caller_is_superadmin = bool(
        requesting_user and requesting_user.is_superadmin
    )

    # ── 1. Plans must exist ──────────────────────────────────
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

    # ── 2. A default plan must be set ────────────────────────
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

    # ── 3. Sanitise the payload ──────────────────────────────
    data = request.data.copy()

    # Server-set values (role/provider are always "user"/"local";
    # superadmins are only ever created via createsuperuser).
    data["role"] = "user"
    data["auth_provider"] = "local"

    # The Youpata-managed flag is fully derived from the caller.
    # Client-supplied values are stripped below regardless.
    data["is_youpata_managed"] = caller_is_superadmin

    # Strip every key the client must never set — including
    # `is_youpata_managed`, `status`, etc.
    for key in FORBIDDEN_CREATE_KEYS:
        # Keep `password` and `password2` — they ARE allowed on create.
        if key in ("password", "password2"):
            continue
        data.pop(key, None)

    # ── 4. Backend-side validation (email + phone) ───────────
    errors = {}

    email_error = validate_email_address(data.get("email", ""))
    if email_error:
        errors["email"] = [email_error]

    phone_error = validate_phone_number(data.get("phone_number", ""))
    if phone_error:
        errors["phone_number"] = [phone_error]

    if "phone_number" in data and not phone_error:
        raw_phone = data.get("phone_number")
        if raw_phone and str(raw_phone).strip():
            local = normalize_local_phone(raw_phone)
            data["phone_number"] = f"+254{local}"
        else:
            data["phone_number"] = None

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    # ── 5. Serializer validation ─────────────────────────────
    serializer = CreateNewUserSerializer(data=data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 6. Create + subscribe atomically ─────────────────────
    try:
        with transaction.atomic():
            user = serializer.save()

            # Belt-and-braces: even if the serializer's field list
            # ever changes, force the flag here too so the DB
            # constraint can never be violated and the intended
            # value can never be silently dropped.
            user.is_youpata_managed = caller_is_superadmin
            user.role = "user"
            user.save(update_fields=["is_youpata_managed", "role"])

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

    # ── 7. Issue tokens + respond ────────────────────────────
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
    return Response(
        {
            "authenticated": True,
            "user": UserSerializer(request.user).data,
        },
        status=status.HTTP_200_OK,
    )

# ============================================================
# YOUPATA-MANAGED ACCOUNTS (superadmin only)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def youpata_managed_accounts(request):
    """
    List all accounts that are flagged is_youpata_managed=True.

    Access is restricted to authenticated superadmins. Any other
    authenticated user (regular user, staff-but-not-superadmin)
    gets 403. Anonymous callers get 401 from the permission class.

    Query params:
        ?search=<text>   case-insensitive filter on email / first / last name
        ?ordering=<field> one of: date_joined, email, first_name, last_name
                          (prefix with - for descending)

    Default ordering: -date_joined
    """

    # ── 1. Superadmin check ──────────────────────────────────
    if not getattr(request.user, "is_superadmin", False):
        return Response(
            {"message": "Only superadmins can view this list."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── 2. Base queryset ─────────────────────────────────────
    queryset = Accounts.objects.filter(
        is_youpata_managed=True
    ).order_by("-date_joined")

    # ── 3. Optional search ───────────────────────────────────
    search = (request.query_params.get("search") or "").strip()
    if search:
        queryset = queryset.filter(
            models.Q(email__icontains=search)
            | models.Q(first_name__icontains=search)
            | models.Q(last_name__icontains=search)
        )

    # ── 4. Optional ordering ─────────────────────────────────
    ordering = (request.query_params.get("ordering") or "").strip()
    allowed_ordering = {
        "date_joined",
        "-date_joined",
        "email",
        "-email",
        "first_name",
        "-first_name",
        "last_name",
        "-last_name",
    }
    if ordering in allowed_ordering:
        queryset = queryset.order_by(ordering)

    # ── 5. Serialize ─────────────────────────────────────────
    serializer = UserSerializer(queryset, many=True)

    return Response(
        {
            "count": queryset.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )