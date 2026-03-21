from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.text import slugify
import random
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import SuperAdminProfile, AdminProfile, ClientProfile, ClientHistory

User = get_user_model()

# =========================================================
# LOGIN SERIALIZER
# =========================================================
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


# =========================================================
# UPDATE PASSWORD SERIALIZER (GLOBAL)
# =========================================================
class UpdatePasswordSerializer(serializers.Serializer):

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user

        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({
                "current_password": "Current password is incorrect."
            })

        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({
                "new_password": "New password cannot be same as current password."
            })

        if len(attrs["new_password"]) < 8:
            raise serializers.ValidationError({
                "new_password": "Password must be at least 8 characters."
            })

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


# =========================================================
# USER SERIALIZER (REGISTRATION / BASIC)
# =========================================================
class UserSerializer(serializers.ModelSerializer):

    confirm_password = serializers.CharField(write_only=True, required=False)
    gender = serializers.ChoiceField(
        choices=ClientProfile.GENDER_CHOICES,
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

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm = attrs.get("confirm_password")

        if password or confirm:
            if not confirm:
                raise serializers.ValidationError({"confirm_password": "Required"})
            if password != confirm:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")
        gender = validated_data.pop("gender", None)

        base_username = slugify(validated_data["email"].split("@")[0])
        username = base_username

        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{random.randint(100,999)}"

        user = User(username=username, role="client", **validated_data)
        user.set_password(password)
        user.save()

        ClientProfile.objects.create(user=user, gender=gender)

        return user


# =========================================================
# USER UPDATE SERIALIZER
# =========================================================
class UserUpdateSerializer(serializers.ModelSerializer):

    gender = serializers.ChoiceField(
        choices=AdminProfile.GENDER_CHOICES,
        required=False
    )

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "gender"]

    def validate_email(self, value):
        value = value.strip().lower()

        if self.instance and self.instance.email != value:
            if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Email already exists")

        return value

    def update(self, instance, validated_data):
        gender = validated_data.pop("gender", None)

        instance = super().update(instance, validated_data)

        if gender:
            if instance.role == "admin" and hasattr(instance, "admin_profile"):
                instance.admin_profile.gender = gender
                instance.admin_profile.save()

        return instance


# =========================================================
# ADMIN SIGNUP SERIALIZER (FIXED)
# =========================================================
class AdminSignupSerializer(serializers.ModelSerializer):

    confirm_password = serializers.CharField(write_only=True)

    gender = serializers.ChoiceField(
        choices=AdminProfile.GENDER_CHOICES,
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

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        gender = validated_data.pop("gender")
        password = validated_data.pop("password")

        base_username = slugify(validated_data["email"].split("@")[0])
        username = base_username

        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{random.randint(100,999)}"

        user = User(username=username, role="admin", **validated_data)
        user.set_password(password)
        user.save()

        AdminProfile.objects.create(user=user, gender=gender)

        return user


# =========================================================
# CLIENT SIGNUP SERIALIZER
# =========================================================
class ClientSignupSerializer(serializers.ModelSerializer):

    confirm_password = serializers.CharField(write_only=True)
    gender = serializers.ChoiceField(
        choices=ClientProfile.GENDER_CHOICES,
        required=False
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

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        gender = validated_data.pop("gender", None)
        password = validated_data.pop("password")

        base_username = slugify(validated_data["email"].split("@")[0])
        username = base_username

        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{random.randint(100,999)}"

        user = User(username=username, role="client", **validated_data)
        user.set_password(password)
        user.save()

        ClientProfile.objects.create(user=user, gender=gender)

        return user


# =========================================================
# CLIENT UPDATE SERIALIZER
# =========================================================
class ClientUpdateSerializer(serializers.ModelSerializer):

    gender = serializers.ChoiceField(
        choices=ClientProfile.GENDER_CHOICES,
        required=False
    )

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "gender", "is_active"]

    def validate_email(self, value):
        value = value.strip().lower()

        if self.instance and self.instance.email != value:
            if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Email already exists")

        return value

    def update(self, instance, validated_data):
        gender = validated_data.pop("gender", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if gender is not None and hasattr(instance, "client_profile"):
            instance.client_profile.gender = gender
            instance.client_profile.save()

        return instance


# =========================================================
# CLIENT DETAIL SERIALIZER
# =========================================================
class ClientDetailSerializer(serializers.ModelSerializer):

    gender = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "gender",
            "is_active",
            "date_joined",
        ]

    def get_gender(self, obj):
        return getattr(obj.client_profile, "gender", None)


# =========================================================
# CLIENT HISTORY SERIALIZER
# =========================================================
class ClientHistorySerializer(serializers.ModelSerializer):

    performed_by_email = serializers.CharField(source="performed_by.email", read_only=True)

    class Meta:
        model = ClientHistory
        fields = ["id", "action", "performed_by_email", "timestamp", "details"]


# =========================================================
# BULK CLIENT ACTION SERIALIZER
# =========================================================
class BulkClientActionSerializer(serializers.Serializer):

    client_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )

    def validate_client_ids(self, value):
        existing = User.objects.filter(id__in=value, role="client").values_list("id", flat=True)

        missing = set(value) - set(existing)
        if missing:
            raise serializers.ValidationError(f"Invalid client IDs: {list(missing)}")

        return value


# =========================================================
# CLIENT TRANSFER SERIALIZER
# =========================================================
class ClientTransferSerializer(serializers.Serializer):

    new_manager_id = serializers.IntegerField()

    def validate_new_manager_id(self, value):
        if not User.objects.filter(id=value, role="superadmin").exists():
            raise serializers.ValidationError("Invalid superadmin")
        return value


# =========================================================
# CLIENT RESTORE SERIALIZER
# =========================================================
class ClientRestoreSerializer(serializers.Serializer):

    confirm = serializers.BooleanField()

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Confirmation required")
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


# =========================================================
# ADMIN UPDATE SERIALIZER (RESTORED)
# =========================================================
class AdminUpdateSerializer(serializers.ModelSerializer):

    gender = serializers.ChoiceField(
        choices=AdminProfile.GENDER_CHOICES,
        required=False,
        allow_null=True
    )

    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "gender",
        ]

    def update(self, instance, validated_data):
        gender = validated_data.pop("gender", None)

        if "first_name" in validated_data:
            instance.first_name = validated_data["first_name"].strip()

        if "last_name" in validated_data:
            instance.last_name = validated_data["last_name"].strip()

        instance.save()

        if gender is not None and hasattr(instance, "admin_profile"):
            instance.admin_profile.gender = gender
            instance.admin_profile.save()

        return instance