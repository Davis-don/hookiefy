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

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")

        return value

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

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")
        gender = validated_data.pop("gender", None)

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

        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{random.randint(100,999)}"

        user = User(
            username=username,
            role=role,
            **validated_data
        )

        user.set_password(password)
        user.save()

        if role == "superadmin":
            SuperAdminProfile.objects.create(user=user)
        elif role == "admin":
            AdminProfile.objects.create(user=user, gender=gender)
        elif role == "client":
            ClientProfile.objects.create(user=user)

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

        if gender:
            if instance.role == "superadmin" and hasattr(instance, "superadmin_profile"):
                instance.superadmin_profile.gender = gender
                instance.superadmin_profile.save()

            elif instance.role == "admin" and hasattr(instance, "admin_profile"):
                instance.admin_profile.gender = gender
                instance.admin_profile.save()

        return instance


# =========================================================
# ADMIN UPDATE SERIALIZER
# =========================================================
class AdminUpdateSerializer(serializers.ModelSerializer):

    gender = serializers.ChoiceField(
        choices=[("male","Male"), ("female","Female"), ("other","Other"), ("nonbinary","Non-binary"), ("prefer_not_say","Prefer not to say")],
        required=False,
        allow_blank=True
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
            instance.first_name = validated_data["first_name"]

        if "last_name" in validated_data:
            instance.last_name = validated_data["last_name"]

        instance.save()

        if gender is not None and hasattr(instance, "admin_profile"):
            instance.admin_profile.gender = gender
            instance.admin_profile.save()

        return instance


# =========================================================
# UPDATE PASSWORD SERIALIZER
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
                "new_password": "New password cannot be the same as current password."
            })

        return attrs

    def save(self, **kwargs):

        user = self.context["request"].user

        user.set_password(self.validated_data["new_password"])
        user.save()

        return user


# =========================================================
# ADMIN SIGNUP SERIALIZER
# =========================================================
class AdminSignupSerializer(serializers.ModelSerializer):

    confirm_password = serializers.CharField(write_only=True)

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

        user = User(
            username=username,
            role="admin",
            **validated_data
        )

        user.set_password(password)
        user.save()

        AdminProfile.objects.create(
            user=user,
            gender=gender
        )

        return user


# =========================================================
# CLIENT SIGNUP SERIALIZER (UPDATED)
# Used by Admin or Superadmin to create clients
# =========================================================
class ClientSignupSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    gender = serializers.ChoiceField(
        choices=[("male","Male"), ("female","Female"), ("other","Other"), 
                ("nonbinary","Non-binary"), ("prefer_not_say","Prefer not to say")],
        required=False,
        allow_blank=True
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

        user = User(
            username=username,
            role="client",
            **validated_data
        )

        user.set_password(password)
        user.save()

        # The created_by_admin will be set in the view
        ClientProfile.objects.create(
            user=user,
            gender=gender
        )

        return user


# =========================================================
# CLIENT UPDATE SERIALIZER (UPDATED)
# =========================================================
class ClientUpdateSerializer(serializers.ModelSerializer):
    gender = serializers.ChoiceField(
        choices=[("male","Male"), ("female","Female"), ("other","Other"), 
                ("nonbinary","Non-binary"), ("prefer_not_say","Prefer not to say")],
        required=False,
        allow_blank=True
    )
    
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "gender",
            "is_active",
        ]

    def validate_email(self, value):
        if value:
            value = value.strip().lower()
            
            if self.instance and self.instance.email != value:
                if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
                    raise serializers.ValidationError(
                        "A user with this email already exists."
                    )
        return value

    def validate_first_name(self, value):
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("First name cannot be empty.")
        return value

    def validate_last_name(self, value):
        if value:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Last name cannot be empty.")
        return value

    def update(self, instance, validated_data):
        gender = validated_data.pop("gender", None)

        # Update user fields
        for attr, value in validated_data.items():
            if value is not None:  # Only update if value is provided
                setattr(instance, attr, value)
        instance.save()

        # Update client profile gender if provided
        if gender is not None and hasattr(instance, "client_profile"):
            instance.client_profile.gender = gender
            instance.client_profile.save()

        return instance


# =========================================================
# CLIENT DETAIL SERIALIZER (NEW)
# For fetching detailed client information
# =========================================================
class ClientDetailSerializer(serializers.ModelSerializer):
    gender = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    managed_by = serializers.SerializerMethodField()
    deleted_by = serializers.SerializerMethodField()
    is_deleted = serializers.BooleanField(source='client_profile.is_deleted', read_only=True)
    deleted_at = serializers.DateTimeField(source='client_profile.deleted_at', read_only=True)
    created_at = serializers.DateTimeField(source='client_profile.created_at', read_only=True)
    updated_at = serializers.DateTimeField(source='client_profile.updated_at', read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "gender",
            "is_active",
            "is_deleted",
            "created_by",
            "managed_by",
            "deleted_by",
            "deleted_at",
            "created_at",
            "updated_at",
            "date_joined",
        ]

    def get_gender(self, obj):
        if hasattr(obj, "client_profile"):
            return obj.client_profile.gender
        return None

    def get_created_by(self, obj):
        if hasattr(obj, "client_profile") and obj.client_profile.created_by_admin:
            return {
                "id": obj.client_profile.created_by_admin.id,
                "email": obj.client_profile.created_by_admin.email,
                "name": f"{obj.client_profile.created_by_admin.first_name} {obj.client_profile.created_by_admin.last_name}".strip()
            }
        return None

    def get_managed_by(self, obj):
        if hasattr(obj, "client_profile") and obj.client_profile.managed_by_superuser:
            return {
                "id": obj.client_profile.managed_by_superuser.id,
                "email": obj.client_profile.managed_by_superuser.email,
                "name": f"{obj.client_profile.managed_by_superuser.first_name} {obj.client_profile.managed_by_superuser.last_name}".strip()
            }
        return None

    def get_deleted_by(self, obj):
        if hasattr(obj, "client_profile") and obj.client_profile.deleted_by:
            return {
                "id": obj.client_profile.deleted_by.id,
                "email": obj.client_profile.deleted_by.email,
                "name": f"{obj.client_profile.deleted_by.first_name} {obj.client_profile.deleted_by.last_name}".strip()
            }
        return None


# =========================================================
# CLIENT HISTORY SERIALIZER (FIXED)
# For client action history
# =========================================================
class ClientHistorySerializer(serializers.ModelSerializer):
    performed_by_email = serializers.CharField(source='performed_by.email', read_only=True)
    performed_by_name = serializers.SerializerMethodField()
    client_email = serializers.CharField(source='client.user.email', read_only=True)
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientHistory
        fields = [
            "id",
            "client_id",
            "client_email",
            "client_name",
            "action",
            "performed_by_email",
            "performed_by_name",
            "timestamp",
            "details",
        ]
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return f"{obj.performed_by.first_name} {obj.performed_by.last_name}".strip()
        return "System"

    def get_client_name(self, obj):
        if obj.client and obj.client.user:
            return f"{obj.client.user.first_name} {obj.client.user.last_name}".strip()
        return "Unknown"


# =========================================================
# BULK CLIENT ACTION SERIALIZER (NEW)
# For bulk operations on clients
# =========================================================
class BulkClientActionSerializer(serializers.Serializer):
    client_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
    
    def validate_client_ids(self, value):
        if not value:
            raise serializers.ValidationError("client_ids list cannot be empty")
        
        # Check if all clients exist and are actually clients
        existing_clients = User.objects.filter(
            id__in=value, 
            role="client"
        ).values_list('id', flat=True)
        
        missing_ids = set(value) - set(existing_clients)
        if missing_ids:
            raise serializers.ValidationError(
                f"Clients with ids {list(missing_ids)} not found or are not clients"
            )
        
        return value


# =========================================================
# CLIENT TRANSFER SERIALIZER (NEW)
# For transferring client management between superusers
# =========================================================
class ClientTransferSerializer(serializers.Serializer):
    new_manager_id = serializers.IntegerField(required=True)
    
    def validate_new_manager_id(self, value):
        try:
            manager = User.objects.get(id=value, role="superadmin")
        except User.DoesNotExist:
            raise serializers.ValidationError("Manager not found or not a superadmin")
        return value


# =========================================================
# CLIENT RESTORE SERIALIZER (NEW)
# For restoring soft-deleted clients
# =========================================================
class ClientRestoreSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(required=True)
    
    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Must confirm restore action")
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