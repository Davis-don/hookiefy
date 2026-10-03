from rest_framework import serializers
from .models import Businesses


# ============================================================
# READ
# ============================================================

class BusinessSerializer(serializers.ModelSerializer):
    """
    Read serializer — used for every response.
    """

    owner_email = serializers.EmailField(
        source="owner.email",
        read_only=True,
    )
    owner_full_name = serializers.CharField(
        source="owner.full_name",
        read_only=True,
    )
    business_category_display = serializers.CharField(
        source="get_business_category_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Businesses
        fields = (
            "id",
            "owner",
            "owner_email",
            "owner_full_name",
            "business_name",
            "business_category",
            "business_category_display",
            "business_type",
            "description",
            "county",
            "city_town",
            "region",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# CREATE
# ============================================================

class BusinessCreateSerializer(serializers.ModelSerializer):
    """
    Create serializer — owner comes from the request.
    Status is optional; defaults to "active" from the model.
    """

    class Meta:
        model = Businesses
        fields = (
            "business_name",
            "business_category",
            "business_type",
            "description",
            "county",
            "city_town",
            "region",
            "status",
        )
        extra_kwargs = {
            "status": {"required": False},
        }

    def validate_business_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Business name cannot be empty.")
        return value

    def validate_business_category(self, value):
        if value not in ("goods", "services"):
            raise serializers.ValidationError(
                "Category must be 'goods' or 'services'."
            )
        return value

    def validate_business_type(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Business type cannot be empty.")
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Description cannot be empty.")
        return value

    def validate_county(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("County cannot be empty.")
        return value

    def validate_city_town(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("City/town cannot be empty.")
        return value

    def validate_region(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Region cannot be empty.")
        return value

    def validate_status(self, value):
        if value in (None, ""):
            return "active"
        valid = {choice[0] for choice in Businesses.STATUS_CHOICES}
        if value not in valid:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(sorted(valid))}."
            )
        return value

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        validated_data.setdefault("status", "active")
        return Businesses.objects.create(**validated_data)


# ============================================================
# UPDATE
# ============================================================

class BusinessUpdateSerializer(serializers.ModelSerializer):
    """
    Update serializer — ownership cannot be changed.
    All fields optional.

    `status` can only be changed by a superadmin. If a
    non-superadmin sends it, the field is silently dropped
    so the rest of the update still succeeds.
    """

    class Meta:
        model = Businesses
        fields = (
            "business_name",
            "business_category",
            "business_type",
            "description",
            "county",
            "city_town",
            "region",
            "status",
        )
        extra_kwargs = {
            "status": {"required": False},
        }

    def validate_business_category(self, value):
        if value not in ("goods", "services"):
            raise serializers.ValidationError(
                "Category must be 'goods' or 'services'."
            )
        return value

    def validate_status(self, value):
        valid = {choice[0] for choice in Businesses.STATUS_CHOICES}
        if value not in valid:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(sorted(valid))}."
            )
        return value

    def validate(self, attrs):
        """
        Drop `status` from the payload if the requester is not a
        superadmin. The rest of the update still goes through.
        """
        request = self.context.get("request")
        new_status = attrs.get("status")

        if new_status is not None and request is not None:
            user = request.user
            is_super = (
                getattr(user, "is_superuser", False)
                or getattr(user, "role", "") == "superadmin"
            )
            if not is_super:
                attrs.pop("status", None)

        return attrs