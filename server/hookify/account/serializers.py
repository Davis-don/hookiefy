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
            "role",            # REQUIRED so the view's role is not dropped
            "auth_provider",   # REQUIRED so the view's provider is not dropped
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
        """
        Only allow the two public signup roles.
        Prevents a client from creating a superadmin
        or any other privileged account.
        """

        if value not in self.ALLOWED_SIGNUP_ROLES:

            raise serializers.ValidationError(
                "Invalid role for signup."
            )

        return value

    # --------------------------------------------------------
    # VALIDATE AUTH PROVIDER
    # --------------------------------------------------------

    def validate_auth_provider(self, value):
        """
        Local signup must always be 'local'.
        Google signup does not go through this serializer
        (it uses the Google flow in views.py), so any
        non-local value here is invalid.
        """

        if value != "local":

            raise serializers.ValidationError(
                "auth_provider must be 'local' for local signup."
            )

        return value

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

        validated_data.pop(
            "confirmpassword"
        )

        password = validated_data.pop(
            "password"
        )

        # Use the Accounts manager.
        # role and auth_provider now survive validation
        # and are passed through to create_user().
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

class UpdateUserSerializer(serializers.ModelSerializer):

    class Meta:

        model = Accounts

        fields = [
            "first_name",
            "last_name",
            "phone_number",
            "gender",
            "profile_image_url",
        ]

        read_only_fields = [
            "profile_image_url",
        ]


# ============================================================
# JWT TOKEN SERIALIZER
# ============================================================

class MyTokenObtainPairSerializer(
    TokenObtainPairSerializer
):

    # --------------------------------------------------------
    # CUSTOM LOGIN ERROR
    # --------------------------------------------------------

    default_error_messages = {
        "no_active_account":
            "Invalid email or password. Login unsuccessful."
    }

    # --------------------------------------------------------
    # CUSTOM JWT CLAIMS
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # VALIDATE PROFILE IMAGE
    # --------------------------------------------------------

    def validate_profile_image(self, value):

        # ----------------------------------------------------
        # MAX FILE SIZE: 5MB
        # ----------------------------------------------------

        max_size = 5 * 1024 * 1024

        if value.size > max_size:

            raise serializers.ValidationError(
                "Image size should not exceed 5MB."
            )

        # ----------------------------------------------------
        # ALLOWED IMAGE TYPES
        # ----------------------------------------------------

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