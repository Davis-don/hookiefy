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
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# CREATE
# ============================================================

class BusinessCreateSerializer(serializers.ModelSerializer):
    """
    All fields required. Owner comes from the request.
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
        )

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

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return Businesses.objects.create(**validated_data)


# ============================================================
# UPDATE
# ============================================================

class BusinessUpdateSerializer(serializers.ModelSerializer):
    """
    Update serializer — ownership cannot be changed.
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
        )