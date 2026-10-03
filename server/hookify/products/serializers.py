from rest_framework import serializers
from .models import Products


# ============================================================
# READ
# ============================================================

class ProductSerializer(serializers.ModelSerializer):
    """
    Read serializer — returns the full product shape,
    including the aggregated `properties` list.
    """

    business_name = serializers.CharField(
        source="business.business_name",
        read_only=True,
    )
    properties = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )

    class Meta:
        model = Products
        fields = (
            "id",
            "business",
            "business_name",
            "name",
            "description",
            "price",
            "image_url",
            "image_public_id",
            "has_image",
            "has_price",
            "property1",
            "property2",
            "property3",
            "property4",
            "property5",
            "properties",
            "has_properties",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# CREATE
# ============================================================

class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Validate text fields + optional properties.
    image_url and image_public_id are set by the view after
    uploading the file to Cloudinary.
    """

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "property1",
            "property2",
            "property3",
            "property4",
            "property5",
        )
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "price":       {"required": False, "allow_null": True},
            "property1":   {"required": False, "allow_blank": True, "allow_null": True},
            "property2":   {"required": False, "allow_blank": True, "allow_null": True},
            "property3":   {"required": False, "allow_blank": True, "allow_null": True},
            "property4":   {"required": False, "allow_blank": True, "allow_null": True},
            "property5":   {"required": False, "allow_blank": True, "allow_null": True},
        }

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Product name cannot be empty.")
        return value

    def validate_price(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


# ============================================================
# UPDATE
# ============================================================

class ProductUpdateSerializer(serializers.ModelSerializer):
    """
    Same validation as create, but every field is optional.
    """

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "property1",
            "property2",
            "property3",
            "property4",
            "property5",
        )
        extra_kwargs = {
            "name":        {"required": False},
            "description": {"required": False, "allow_blank": True},
            "price":       {"required": False, "allow_null": True},
            "property1":   {"required": False, "allow_blank": True, "allow_null": True},
            "property2":   {"required": False, "allow_blank": True, "allow_null": True},
            "property3":   {"required": False, "allow_blank": True, "allow_null": True},
            "property4":   {"required": False, "allow_blank": True, "allow_null": True},
            "property5":   {"required": False, "allow_blank": True, "allow_null": True},
        }

    def validate_name(self, value):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Product name cannot be empty.")
        return value

    def validate_price(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value