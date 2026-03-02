from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.text import slugify
import random
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import SuperAdminProfile, AdminProfile, ClientProfile

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
    gender = serializers.ChoiceField(
        choices=[("male","Male"), ("female","Female"), ("other","Other"), ("nonbinary","Non-binary"), ("prefer_not_say","Prefer not to say")],
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
            "gender",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "role": {"read_only": True},
        }

    # Validate email uniqueness
    def validate_email(self, value):
        value = value.strip().lower()
        
        # Check if email already exists in the database
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return value

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
        gender = validated_data.pop("gender", None)

        role = "client"  # Default role, can override in view if needed
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

        # Attach gender to the appropriate profile if role is admin or superadmin
        if role == "superadmin":
            SuperAdminProfile.objects.create(user=user, gender=gender)
        elif role == "admin":
            AdminProfile.objects.create(user=user, gender=gender)
        elif role == "client":
            ClientProfile.objects.create(user=user, gender=gender)

        return user


# =========================================================
# USER UPDATE SERIALIZER
# =========================================================
class UserUpdateSerializer(serializers.ModelSerializer):
    gender = serializers.ChoiceField(
        choices=[("male","Male"), ("female","Female"), ("other","Other"), ("nonbinary","Non-binary"), ("prefer_not_say","Prefer not to say")],
        required=False
    )

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "gender",
        ]

    def validate_email(self, value):
        value = value.strip().lower()
        if self.instance and self.instance.email != value:
            if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError(
                    "A user with this email already exists."
                )
        return value

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("First name cannot be empty.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Last name cannot be empty.")
        return value

    def update(self, instance, validated_data):
        gender = validated_data.pop("gender", None)
        instance = super().update(instance, validated_data)
        # Update gender in profile
        if gender:
            if instance.role == "superadmin" and hasattr(instance, "superadmin_profile"):
                instance.superadmin_profile.gender = gender
                instance.superadmin_profile.save()
            elif instance.role == "admin" and hasattr(instance, "admin_profile"):
                instance.admin_profile.gender = gender
                instance.admin_profile.save()
            elif instance.role == "client" and hasattr(instance, "client_profile"):
                instance.client_profile.gender = gender
                instance.client_profile.save()
        return instance


# =========================================================
# UPDATE PASSWORD SERIALIZER
# =========================================================
class UpdatePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        user = self.context['request'].user
        current_password = attrs.get("current_password")
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if not user.check_password(current_password):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if new_password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        if current_password == new_password:
            raise serializers.ValidationError({"new_password": "New password cannot be same as current password."})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save()
        return user


# =========================================================
# ADMIN SIGNUP SERIALIZER (for creating admin users)
# =========================================================
class AdminSignupSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True, required=True)
    gender = serializers.ChoiceField(
        choices=[("male","Male"), ("female","Female"), ("other","Other"), ("nonbinary","Non-binary"), ("prefer_not_say","Prefer not to say")],
        required=True
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "password",
            "confirm_password",
            "gender",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        
        if len(password) < 8:
            raise serializers.ValidationError({
                "password": "Password must be at least 8 characters long."
            })
            
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")
        gender = validated_data.pop("gender")
        
        # Set role to admin
        role = "admin"
        
        first_name = validated_data.get("first_name", "").strip()
        last_name = validated_data.get("last_name", "").strip()

        if first_name and last_name:
            base_name = f"{first_name}_{last_name}"
        else:
            base_name = validated_data["email"].split("@")[0]

        base_username = slugify(base_name)
        if not base_username:
            base_username = f"admin_{random.randint(1000,9999)}"
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

        # Create AdminProfile with gender
        AdminProfile.objects.create(user=user, gender=gender)

        return user


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