# account/serializers.py

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Accounts


# ============================================================
# CREATE USER SERIALIZER
# ============================================================

class CreateNewUserSerializer(serializers.ModelSerializer):

    confirmpassword = serializers.CharField(
        write_only=True
    )

    # Only these roles may be created through the public
    # signup endpoints. "superadmin" must never be reachable
    # from a client request.
    ALLOWED_SIGNUP_ROLES = {
        "serviceprovider",
        "serviceseeker",
    }

    class Meta:

        model = Accounts

        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "gender",
            "password",
            "confirmpassword",
            "role",
            "auth_provider",
        ]

        extra_kwargs = {
            "password": {
                "write_only": True
            },
            "role": {
                "write_only": True
            },
            "auth_provider": {
                "write_only": True
            },
        }

    # --------------------------------------------------------
    # VALIDATE ROLE
    # --------------------------------------------------------

    def validate_role(self, value):

        if value not in self.ALLOWED_SIGNUP_ROLES:

            raise serializers.ValidationError(
                "Invalid role for signup."
            )

        return value

    # --------------------------------------------------------
    # VALIDATE AUTH PROVIDER
    # --------------------------------------------------------

    def validate_auth_provider(self, value):

        if value != "local":

            raise serializers.ValidationError(
                "auth_provider must be 'local' for local signup."
            )

        return value

    # --------------------------------------------------------
    # VALIDATE EMAIL (uniqueness on signup)
    # --------------------------------------------------------

    def validate_email(self, value):

        email = value.strip().lower()

        if Accounts.objects.filter(
            email__iexact=email
        ).exists():

            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    # --------------------------------------------------------
    # VALIDATE PHONE NUMBER (uniqueness on signup)
    # --------------------------------------------------------

    def validate_phone_number(self, value):

        if not value:
            return value

        phone = value.strip()

        if Accounts.objects.filter(
            phone_number=phone
        ).exists():

            raise serializers.ValidationError(
                "An account with this phone number already exists."
            )

        return phone

    # --------------------------------------------------------
    # VALIDATE (object-level)
    # --------------------------------------------------------

    def validate(self, data):

        password = data.get("password")
        confirmpassword = data.get("confirmpassword")

        if password != confirmpassword:

            raise serializers.ValidationError(
                {
                    "confirmpassword": "Passwords do not match."
                }
            )

        return data

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    def create(self, validated_data):

        validated_data.pop("confirmpassword")

        password = validated_data.pop("password")

        user = Accounts.objects.create_user(
            password=password,
            **validated_data
        )

        return user


# ============================================================
# USER SERIALIZER
# ============================================================

class UserSerializer(serializers.ModelSerializer):

    class Meta:

        model = Accounts

        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "gender",
            "role",
            "profile_image_url",
            "has_profile_image",
            "auth_provider",
        ]

        read_only_fields = [
            "id",
            "full_name",
            "role",
            "profile_image_url",
            "has_profile_image",
            "auth_provider",
        ]


# ============================================================
# UPDATE USER SERIALIZER
# ============================================================
#
# Updatable fields:
#     first_name, last_name, email, phone_number, gender
#
# NOT updatable (rejected if sent):
#     role, auth_provider, google_id, profile_image_url,
#     profile_image_public_id, is_premium, premium_expires_at,
#     is_active, is_staff, is_superuser, password
#
# Uniqueness enforced here:
#     - email must be unique across all accounts
#     - phone_number must be unique across all accounts
# ============================================================

class UpdateUserSerializer(serializers.ModelSerializer):

    class Meta:

        model = Accounts

        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "gender",
        ]

    # --------------------------------------------------------
    # FIRST NAME
    # --------------------------------------------------------

    def validate_first_name(self, value):

        first_name = (value or "").strip()

        if not first_name:

            raise serializers.ValidationError(
                "First name is required."
            )

        if len(first_name) < 2:

            raise serializers.ValidationError(
                "First name must be at least 2 characters."
            )

        return first_name

    # --------------------------------------------------------
    # LAST NAME
    # --------------------------------------------------------

    def validate_last_name(self, value):

        last_name = (value or "").strip()

        if not last_name:

            raise serializers.ValidationError(
                "Last name is required."
            )

        if len(last_name) < 2:

            raise serializers.ValidationError(
                "Last name must be at least 2 characters."
            )

        return last_name

    # --------------------------------------------------------
    # EMAIL — must be unique, excluding the current user
    # --------------------------------------------------------

    def validate_email(self, value):

        email = (value or "").strip().lower()

        if not email:

            raise serializers.ValidationError(
                "Email is required."
            )

        # Basic format check
        import re

        if not re.match(
            r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
            email,
        ):

            raise serializers.ValidationError(
                "Enter a valid email address."
            )

        # Uniqueness — exclude the current user
        request = self.context.get("request")

        if request and request.user:

            if (
                Accounts.objects
                .filter(email__iexact=email)
                .exclude(id=request.user.id)
                .exists()
            ):

                raise serializers.ValidationError(
                    "This email is already in use."
                )

        return email

    # --------------------------------------------------------
    # PHONE NUMBER — must be unique, excluding the current user
    # --------------------------------------------------------

    def validate_phone_number(self, value):

        # Allow clearing the phone number
        if value is None or value == "":
            return None

        phone = value.strip()

        if not phone:
            return None

        # Uniqueness — exclude the current user
        request = self.context.get("request")

        if request and request.user:

            if (
                Accounts.objects
                .filter(phone_number=phone)
                .exclude(id=request.user.id)
                .exists()
            ):

                raise serializers.ValidationError(
                    "This phone number is already in use."
                )

        return phone

    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------

    def validate_gender(self, value):

        if value in (None, ""):
            return None

        if value not in ("M", "F", "O"):

            raise serializers.ValidationError(
                "Invalid gender value."
            )

        return value

    # --------------------------------------------------------
    # UPDATE
    # --------------------------------------------------------

    def update(self, instance, validated_data):

        for field, value in validated_data.items():

            setattr(instance, field, value)

        instance.save(
            update_fields=list(validated_data.keys())
        )

        return instance


# ============================================================
# JWT TOKEN SERIALIZER
# ============================================================

class MyTokenObtainPairSerializer(
    TokenObtainPairSerializer
):

    default_error_messages = {
        "no_active_account":
            "Invalid email or password. Login unsuccessful."
    }

    @classmethod
    def get_token(cls, user):

        token = super().get_token(user)

        token["email"] = user.email
        token["role"] = user.role
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["full_name"] = user.full_name
        token["profile_image_url"] = (
            user.profile_image_url
        )
        token["auth_provider"] = (
            user.auth_provider
        )

        return token


# ============================================================
# PROFILE IMAGE UPLOAD SERIALIZER
# ============================================================

class ProfileImageUploadSerializer(
    serializers.Serializer
):

    profile_image = serializers.ImageField(
        required=True
    )

    def validate_profile_image(self, value):

        max_size = 5 * 1024 * 1024

        if value.size > max_size:

            raise serializers.ValidationError(
                "Image size should not exceed 5MB."
            )

        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
        ]

        if value.content_type not in allowed_types:

            raise serializers.ValidationError(
                "File type not supported. "
                "Allowed types: "
                + ", ".join(allowed_types)
            )

        return value

# ============================================================
# UPDATE PASSWORD SERIALIZER
# ============================================================
#
# Handles the "change my own password" flow.
#
# Rules:
#   - current_password must match the user's actual password
#   - new_password must meet complexity requirements
#   - new_password must differ from current_password
#   - confirm_password must equal new_password
# ============================================================

class UpdatePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    # --------------------------------------------------------
    # FIELD-LEVEL VALIDATION
    # --------------------------------------------------------

    def validate_current_password(self, value):

        user = self.context.get("user")

        if not user:

            raise serializers.ValidationError(
                "User context is required."
            )

        if not user.check_password(value):

            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate_new_password(self, value):

        if len(value) < 8:

            raise serializers.ValidationError(
                "Password must be at least 8 characters long."
            )

        if not any(c.isupper() for c in value):

            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )

        if not any(c.islower() for c in value):

            raise serializers.ValidationError(
                "Password must contain at least one lowercase letter."
            )

        if not any(c.isdigit() for c in value):

            raise serializers.ValidationError(
                "Password must contain at least one number."
            )

        return value

    # --------------------------------------------------------
    # OBJECT-LEVEL VALIDATION
    # --------------------------------------------------------

    def validate(self, data):

        current = data.get("current_password")
        new = data.get("new_password")
        confirm = data.get("confirm_password")

        if new != confirm:

            raise serializers.ValidationError(
                {
                    "confirm_password":
                        "New password and confirm password do not match."
                }
            )

        if current and new and current == new:

            raise serializers.ValidationError(
                {
                    "new_password":
                        "New password must be different from the current password."
                }
            )

        return data

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    def save(self, **kwargs):

        user = self.context.get("user")

        new_password = self.validated_data["new_password"]

        user.set_password(new_password)

        user.save(update_fields=["password"])

        return user