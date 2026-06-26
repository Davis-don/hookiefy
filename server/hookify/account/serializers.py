from rest_framework import serializers
from .models import Accounts
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CreateNewUserSerializer(serializers.ModelSerializer):
    confirmpassword = serializers.CharField(write_only=True)

    class Meta:
        model = Accounts
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "gender",
            "role",
            "password",
            "confirmpassword",
            "profile_image_url",
            "profile_image_public_id",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "profile_image_url": {"read_only": True},
            "profile_image_public_id": {"read_only": True},
        }

    def validate(self, data):
        if data["password"] != data["confirmpassword"]:
            raise serializers.ValidationError("Passwords do not match!")
        return data

    def create(self, validated_data):
        validated_data.pop("confirmpassword")

        password = validated_data.pop("password")

        user = Accounts(**validated_data)
        user.set_password(password)  # 🔥 important (hashing)
        user.save()

        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    has_profile_image = serializers.SerializerMethodField()

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
            "profile_image_public_id",
            "has_profile_image",
        ]
        read_only_fields = [
            "id",
            "role",
            "profile_image_public_id",
        ]

    def get_full_name(self, obj):
        return obj.full_name

    def get_has_profile_image(self, obj):
        return obj.has_profile_image


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
        extra_kwargs = {
            "profile_image_url": {"read_only": True},
        }


# Token serializer
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    # 👇 This replaces the default ugly error message
    default_error_messages = {
        "no_active_account": "Invalid email or password. Login unsuccessful."
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # 👇 add custom claims into JWT (optional but powerful)
        token["email"] = user.email
        token["role"] = user.role
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["full_name"] = user.full_name
        token["profile_image_url"] = user.profile_image_url

        return token


class ProfileImageUploadSerializer(serializers.Serializer):
    profile_image = serializers.ImageField(required=True)

    def validate_profile_image(self, value):
        """Validate the uploaded image"""
        # Check file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Image size should not exceed {max_size // (1024 * 1024)}MB"
            )

        # Check file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"File type not supported. Allowed types: {', '.join(allowed_types)}"
            )

        return value