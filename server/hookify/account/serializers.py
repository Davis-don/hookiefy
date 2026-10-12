# account/serializers.py

import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from .models import Accounts


User = get_user_model()


# ============================================================
# KENYAN PHONE VALIDATION
# ============================================================

# +254, then 9 digits starting with 7 or 1.
# Examples: +254712345678, +254112345678
KENYAN_PHONE_RE = re.compile(r"^\+254[71]\d{8}$")


def validate_kenyan_phone(value):
    """
    Validate a Kenyan phone number in international format.

    Rules:
        - Must start with +254
        - Exactly 9 digits after +254
        - First digit after +254 must be 7 or 1

    Cleaning applied before checking:
        - Spaces, dashes and brackets are removed.
        - A single leading 0 directly after +254 is stripped.
          So "+2540712345678" becomes "+254712345678",
          and "+2540112345678" becomes "+254112345678".

    Blank input returns None (stored as NULL).
    """

    if value is None:
        return value

    # Normalise: remove spaces, dashes, brackets
    value = re.sub(r"[\s\-()]", "", value)

    # Allow clearing the field
    if value == "":
        return None

    # Strip a stray 0 directly after the country code.
    # +2540712345678 -> +254712345678
    # +2540112345678 -> +254112345678
    value = re.sub(r"^\+2540", "+254", value)

    if not KENYAN_PHONE_RE.match(value):
        raise serializers.ValidationError(
            "Enter a valid Kenyan phone number: "
            "+2547XXXXXXXX or +2541XXXXXXXX."
        )

    return value


# ============================================================
# EMAIL VALIDATION
# ============================================================

# Basic shape: local@domain.tld
EMAIL_SHAPE_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

# A reasonable set of real TLDs. Catches obvious junk while
# accepting every real address in common use.
COMMON_TLDS = {
    # generic
    "com", "org", "net", "edu", "gov", "mil", "int", "info", "biz",
    "io", "co", "app", "dev", "ai", "me", "tv", "xyz", "online",
    "site", "store", "tech", "cloud", "email", "pro", "name",

    # country codes — Africa / Kenya focus + common
    "ke", "tz", "ug", "rw", "bi", "et", "so", "ss", "sd", "eg",
    "za", "ng", "gh", "zm", "zw", "mw", "mz", "na", "bw",

    # common others
    "uk", "us", "ca", "au", "nz", "de", "fr", "es", "it", "nl",
    "be", "ch", "at", "se", "no", "dk", "fi", "ie", "pt", "gr",
    "pl", "cz", "ro", "hu", "ru", "ua", "tr", "il", "ae", "sa",
    "in", "pk", "bd", "lk", "np", "cn", "jp", "kr", "sg", "my",
    "id", "ph", "th", "vn", "hk", "tw",
}

# Common typo domains → correct domain.
EMAIL_TYPO_DOMAINS = {
    "gmial.com":  "gmail.com",
    "gmai.com":   "gmail.com",
    "gmail.co":   "gmail.com",
    "gmail.cm":   "gmail.com",
    "gmail.con":  "gmail.com",
    "gmailcom":   "gmail.com",
    "gnail.com":  "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.comm": "gmail.com",

    "yaho.com":   "yahoo.com",
    "yahooo.com": "yahoo.com",
    "yahoo.co":   "yahoo.com",
    "yahoo.con":  "yahoo.com",
    "yhaoo.com":  "yahoo.com",

    "hotmial.com": "hotmail.com",
    "hotmai.com":  "hotmail.com",
    "hotmail.co":  "hotmail.com",
    "hotmail.con": "hotmail.com",
    "homail.com":  "hotmail.com",

    "outlok.com":  "outlook.com",
    "outloo.com":  "outlook.com",
    "outlook.co":  "outlook.com",
    "outlook.con": "outlook.com",
    "outllok.com": "outlook.com",

    "iclod.com":   "icloud.com",
    "icloud.co":   "icloud.com",
    "icoud.com":   "icloud.com",

    "protonmai.com": "protonmail.com",
    "protonmal.com": "protonmail.com",

    "yandex.co":   "yandex.com",
    "yandex.con":  "yandex.com",
}

# Optional — throwaway inboxes. Delete this set (or the check)
# if you'd rather allow them.
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


def validate_email_address(value):
    """
    Validate an email address beyond a simple shape check.

    Rules:
        1. Shape: local@domain.tld  (basic regex)
        2. Local part ≤ 64 chars, whole address ≤ 254 chars.
        3. Domain must end in a known TLD.
        4. Common typo domains are rejected with a suggestion.
        5. Common disposable inboxes are rejected.

    Returns the cleaned (lowercased, trimmed) address.
    """

    if value is None:
        return value

    value = value.strip().lower()

    if value == "":
        return value

    # 1. Shape
    if not EMAIL_SHAPE_RE.match(value):
        raise serializers.ValidationError("Enter a valid email address.")

    # 2. Length guards
    if len(value) > 254:
        raise serializers.ValidationError("Email address is too long.")

    local, _, domain = value.rpartition("@")

    if not local or not domain:
        raise serializers.ValidationError("Enter a valid email address.")

    if len(local) > 64:
        raise serializers.ValidationError(
            "The part before @ cannot exceed 64 characters."
        )

    # 3. Known TLD
    if "." not in domain:
        raise serializers.ValidationError("Enter a valid email address.")

    tld = domain.rsplit(".", 1)[-1]

    if tld not in COMMON_TLDS:
        raise serializers.ValidationError(
            f"'.{tld}' is not a recognised email domain ending."
        )

    # 4. Common typos
    if domain in EMAIL_TYPO_DOMAINS:
        suggestion = EMAIL_TYPO_DOMAINS[domain]
        raise serializers.ValidationError(
            f"Did you mean {local}@{suggestion}?"
        )

    # 5. Disposable inboxes
    if domain in DISPOSABLE_DOMAINS:
        raise serializers.ValidationError(
            "Disposable email addresses are not allowed."
        )

    return value


# ============================================================
# PASSWORD VALIDATION
# ============================================================

# At least one uppercase letter
PASSWORD_UPPER_RE = re.compile(r"[A-Z]")

# At least one lowercase letter
PASSWORD_LOWER_RE = re.compile(r"[a-z]")

# At least one digit
PASSWORD_DIGIT_RE = re.compile(r"\d")

# At least one special character (anything that is NOT a letter or digit)
PASSWORD_SPECIAL_RE = re.compile(r"[^A-Za-z0-9]")


def validate_strong_password(value, user=None):
    """
    Enforce password policy:

        - At least 8 characters.
        - At least one UPPERCASE letter (A–Z).
        - At least one lowercase letter (a–z).
        - At least one digit (0–9).
        - At least one special character
          (anything that is not a letter or digit).

    Also runs Django's built-in password validators.
    """

    if not value:
        raise serializers.ValidationError("Password is required.")

    if len(value) < 8:
        raise serializers.ValidationError(
            "Password must be at least 8 characters long."
        )

    if not PASSWORD_UPPER_RE.search(value):
        raise serializers.ValidationError(
            "Password must contain at least one uppercase letter."
        )

    if not PASSWORD_LOWER_RE.search(value):
        raise serializers.ValidationError(
            "Password must contain at least one lowercase letter."
        )

    if not PASSWORD_DIGIT_RE.search(value):
        raise serializers.ValidationError(
            "Password must contain at least one number."
        )

    if not PASSWORD_SPECIAL_RE.search(value):
        raise serializers.ValidationError(
            "Password must contain at least one special character "
            "(e.g. ! @ # $ % ^ & *)."
        )

    # Django's built-in checks (too common, too similar to email, etc.)
    validate_password(value, user=user)

    return value


# ============================================================
# USER SERIALIZER — READ
# ============================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for returning user information through the API.

    Used for:
      - login / register responses
      - GET /account/me/
      - the "user" object returned by /account/profile/
    """

    full_name = serializers.ReadOnlyField()
    has_profile_image = serializers.ReadOnlyField()
    is_google_user = serializers.ReadOnlyField()

    class Meta:
        model = Accounts

        fields = (
            # identity
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",

            # profile
            "gender",
            "phone_number",
            "profile_image_url",
            "profile_image_public_id",

            # account meta
            "role",
            "auth_provider",
            "is_google_user",
            "has_profile_image",
            "is_active",
            "date_joined",
            "last_login",
        )

        read_only_fields = fields


# ============================================================
# CREATE USER
# ============================================================

class CreateNewUserSerializer(serializers.ModelSerializer):
    """
    Serializer used when creating a normal user account.

    Role and authentication provider are controlled by the server.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    password2 = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = Accounts

        fields = (
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "gender",
            "phone_number",
            "role",
            "auth_provider",
        )

        read_only_fields = (
            "role",
            "auth_provider",
        )

    def validate_email(self, value):
        """
        Full email validation: shape, TLD, typo, disposable.
        Then check uniqueness.
        """

        value = validate_email_address(value)

        if Accounts.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate_phone_number(self, value):
        return validate_kenyan_phone(value)

    def validate(self, attrs):
        password = attrs.get("password")
        password2 = attrs.pop("password2", None)

        if password != password2:
            raise serializers.ValidationError(
                {"password2": "Passwords do not match."}
            )

        # Strong-password policy
        validate_strong_password(password, user=None)

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")

        validated_data["role"] = "user"
        validated_data["auth_provider"] = "local"

        user = Accounts.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


# ============================================================
# UPDATE — GENERAL ACCOUNT DETAILS
# (everything except: role, image, password, auth_provider)
# ============================================================

class UpdateUserSerializer(serializers.ModelSerializer):
    """
    Update the authenticated user's general details.

    Editable fields:
        - email
        - first_name
        - last_name
        - gender
        - phone_number

    NOT editable here:
        - role
        - profile_image_url / profile_image_public_id
        - password
        - auth_provider
        - is_active
    """

    class Meta:
        model = Accounts

        fields = (
            "email",
            "first_name",
            "last_name",
            "gender",
            "phone_number",
        )

    def validate_email(self, value):
        """
        Full email validation + uniqueness against other users.
        """

        value = validate_email_address(value)

        user = self.instance

        if Accounts.objects.filter(
            email__iexact=value
        ).exclude(
            pk=user.pk
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate_first_name(self, value):
        value = (value or "").strip()
        if len(value) > 80:
            raise serializers.ValidationError(
                "First name cannot exceed 80 characters."
            )
        return value

    def validate_last_name(self, value):
        value = (value or "").strip()
        if len(value) > 80:
            raise serializers.ValidationError(
                "Last name cannot exceed 80 characters."
            )
        return value

    def validate_phone_number(self, value):
        return validate_kenyan_phone(value)


# ============================================================
# UPDATE PASSWORD
# ============================================================

class UpdatePasswordSerializer(serializers.Serializer):
    """
    Change the authenticated user's password.

    Requires:
        - old_password
        - new_password
        - new_password2
    """

    old_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    new_password2 = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_old_password(self, value):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "Authentication is required."
            )

        if not request.user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        new_password2 = attrs.get("new_password2")

        if new_password != new_password2:
            raise serializers.ValidationError(
                {"new_password2": "Passwords do not match."}
            )

        # Prevent reusing the same password
        if new_password == attrs.get("old_password"):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "New password must be different "
                        "from the current one."
                    )
                }
            )

        # Strong-password policy
        validate_strong_password(
            new_password,
            user=self.context["request"].user,
        )

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user

        user.set_password(
            self.validated_data["new_password"]
        )
        user.save(update_fields=["password"])

        return user