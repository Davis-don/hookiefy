# account/serializers.py

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from .models import Accounts


User = get_user_model()


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
        value = value.strip().lower()

        if Accounts.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password2 = attrs.pop("password2", None)

        if password != password2:
            raise serializers.ValidationError(
                {"password2": "Passwords do not match."}
            )

        validate_password(password, user=None)

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
        Ensure the new email is not already used by another account.
        """

        value = value.strip().lower()

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
        """
        Basic sanity check — max length is enforced by the field.
        """

        if value is None:
            return value

        value = value.strip()

        # Let blank / None through
        if value == "":
            return None

        return value


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

        validate_password(
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