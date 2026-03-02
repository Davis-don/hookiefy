# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.text import slugify
import random
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


# =========================================================
# LOGIN SERIALIZER
# =========================================================
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


# =========================================================
# USER SERIALIZER
# Used for:
# - Registration
# - Fetch profile
# =========================================================
class UserSerializer(serializers.ModelSerializer):

    confirm_password = serializers.CharField(
        write_only=True,
        required=False
    )

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "password",
            "confirm_password",
            "role",
            "institution_name",
        ]

        extra_kwargs = {
            "password": {"write_only": True},
            "role": {"read_only": True},
        }

    # Validate passwords
    def validate(self, attrs):

        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        if password or confirm_password:

            if not confirm_password:
                raise serializers.ValidationError({
                    "confirm_password": "Confirm password is required."
                })

            if password != confirm_password:
                raise serializers.ValidationError({
                    "confirm_password": "Passwords do not match."
                })

        return attrs

    # Create user
    def create(self, validated_data):

        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")

        role = "client"

        first_name = validated_data.get("first_name", "").strip()
        last_name = validated_data.get("last_name", "").strip()

        if first_name and last_name:
            base_name = f"{first_name}_{last_name}"
        else:
            base_name = validated_data["email"].split("@")[0]

        base_username = slugify(base_name)

        if not base_username:
            base_username = f"user_{random.randint(1000,9999)}"

        username = base_username

        # Ensure unique username
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{random.randint(100,999)}"

        user = User(
            username=username,
            role=role,
            **validated_data
        )

        user.set_password(password)
        user.save()

        return user


# =========================================================
# USER UPDATE SERIALIZER
# Used for updating profile
# =========================================================
class UserUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name"
        ]

    def validate_email(self, value):

        value = value.strip().lower()

        if self.instance and self.instance.email != value:
            if User.objects.filter(email=value).exclude(
                id=self.instance.id
            ).exists():
                raise serializers.ValidationError(
                    "A user with this email already exists."
                )

        return value

    def validate_first_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "First name cannot be empty."
            )

        return value

    def validate_last_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Last name cannot be empty."
            )

        return value


# =========================================================
# UPDATE PASSWORD SERIALIZER
# =========================================================
class UpdatePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(
        write_only=True,
        required=True
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=True
    )

    def validate(self, attrs):

        user = self.context['request'].user

        current_password = attrs.get("current_password")
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        # Check current password
        if not user.check_password(current_password):
            raise serializers.ValidationError({
                "current_password": "Current password is incorrect."
            })

        # Check new passwords match
        if new_password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "New passwords do not match."
            })

        # Prevent same password reuse
        if current_password == new_password:
            raise serializers.ValidationError({
                "new_password": "New password cannot be same as current password."
            })

        return attrs

    def save(self, **kwargs):

        user = self.context['request'].user
        new_password = self.validated_data["new_password"]

        user.set_password(new_password)
        user.save()

        return user


# =========================================================
# INSTITUTION SERIALIZER
# =========================================================
class InstitutionSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "institution_name"
        ]

    def validate_institution_name(self, value):

        if not value:
            raise serializers.ValidationError(
                "Institution name cannot be empty."
            )

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Institution name cannot be blank."
            )

        return value


# =========================================================
# CUSTOM JWT SERIALIZER
# =========================================================
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):

        data = super().validate(attrs)

        user = self.user

        if user.role == "superadmin":
            data["redirect_to"] = "/superadmin/dashboard"
        elif user.role == "admin":
            data["redirect_to"] = "/admin/dashboard"
        else:
            data["redirect_to"] = "/client/dashboard"

        return data