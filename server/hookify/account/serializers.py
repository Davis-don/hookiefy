from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from rest_framework import serializers

from .models import Accounts


User = get_user_model()


# ============================================================
# USER SERIALIZER
# ============================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for returning user information through the API.
    """

    full_name = serializers.ReadOnlyField()
    has_profile_image = serializers.ReadOnlyField()
    is_google_user = serializers.ReadOnlyField()

    class Meta:
        model = Accounts

        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "gender",
            "phone_number",
            "profile_image_url",
            "role",
            "auth_provider",
            "has_profile_image",
            "is_google_user",
            "date_joined",
        )

        read_only_fields = (
            "id",
            "full_name",
            "profile_image_url",
            "role",
            "auth_provider",
            "has_profile_image",
            "is_google_user",
            "date_joined",
        )


# ============================================================
# CREATE USER SERIALIZER
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
        Ensure email is unique.
        """

        value = value.strip().lower()

        if Accounts.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate(self, attrs):
        """
        Validate password confirmation and password rules.
        """

        password = attrs.get("password")
        password2 = attrs.pop("password2", None)

        if password != password2:
            raise serializers.ValidationError(
                {
                    "password2": "Passwords do not match."
                }
            )

        # Validate password against Django's password validators.
        validate_password(
            password,
            user=None,
        )

        return attrs

    def create(self, validated_data):
        """
        Create the account using AccountsManager.create_user().
        """

        password = validated_data.pop("password")

        # Server-controlled defaults.
        validated_data["role"] = "user"
        validated_data["auth_provider"] = "local"

        user = Accounts.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


# ============================================================
# UPDATE USER SERIALIZER
# ============================================================

class UpdateUserSerializer(serializers.ModelSerializer):
    """
    Serializer used to update the authenticated user's profile.

    Role and authentication provider cannot be changed here.
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
        Ensure the new email is not already being used
        by another account.
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


# ============================================================
# UPDATE PASSWORD SERIALIZER
# ============================================================

class UpdatePasswordSerializer(serializers.Serializer):
    """
    Serializer used to change the authenticated user's password.
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
        """
        Verify that the current password is correct.
        """

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
        """
        Validate the new password.
        """

        new_password = attrs.get("new_password")
        new_password2 = attrs.get("new_password2")

        if new_password != new_password2:
            raise serializers.ValidationError(
                {
                    "new_password2": "Passwords do not match."
                }
            )

        validate_password(
            new_password,
            user=self.context["request"].user,
        )

        return attrs

    def save(self, **kwargs):
        """
        Set the new password.
        """

        user = self.context["request"].user

        user.set_password(
            self.validated_data["new_password"]
        )

        user.save(
            update_fields=["password"]
        )

        return user