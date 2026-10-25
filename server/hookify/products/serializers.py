# products/serializers.py

import re

from rest_framework import serializers

from .models import Products, ProductImage, ProductProperty


# ============================================================
# LIMITS & VALIDATION HELPERS
# ============================================================

PRODUCT_NAME_MIN_LENGTH        = 3
PRODUCT_NAME_MAX_LENGTH        = 80
PRODUCT_DESCRIPTION_MIN_LENGTH = 10
PRODUCT_DESCRIPTION_MAX_LENGTH = 400

# Property name/value limits
PROPERTY_NAME_MAX_LENGTH  = 60
PROPERTY_VALUE_MAX_LENGTH = 120

# Stock limits — keep absurd values out
PRODUCT_QUANTITY_MAX = 1_000_000

# Patterns that would let a user paste links into text fields
URL_PATTERNS = (
    re.compile(r"https?://", re.IGNORECASE),
    re.compile(r"\bwww\.", re.IGNORECASE),
    re.compile(
        r"\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
        r"\.(?:com|net|org|io|co|ke|app|dev|me|info|biz|xyz|shop|store|site|online|link|click|tv|xyz|ly|to|gl)\b",
        re.IGNORECASE,
    ),
)


def _has_url(value: str) -> bool:
    if not value:
        return False
    return any(p.search(value) for p in URL_PATTERNS)


def _check_text_field(value, field_label, min_len, max_len):
    """
    Shared text validator:
      - trims whitespace
      - rejects empty
      - rejects too short / too long
      - rejects any URL / link
    Returns the trimmed value or raises ValidationError.
    """
    value = (value or "").strip()

    if not value:
        raise serializers.ValidationError(f"{field_label} is required.")

    if len(value) < min_len:
        raise serializers.ValidationError(
            f"{field_label} must be at least {min_len} characters."
        )

    if len(value) > max_len:
        raise serializers.ValidationError(
            f"{field_label} cannot exceed {max_len} characters."
        )

    if _has_url(value):
        raise serializers.ValidationError(
            f"{field_label} cannot contain links or URLs."
        )

    return value


def _check_quantity(value):
    """
    Shared quantity validator:
      - rejects negative
      - rejects absurdly large (guards against typos like 1e9)
    PositiveIntegerField already rejects negatives at DB level,
    but the serializer should surface the error before we hit it.
    """
    if value is None:
        return value

    if value < 0:
        raise serializers.ValidationError(
            "Quantity cannot be negative."
        )

    if value > PRODUCT_QUANTITY_MAX:
        raise serializers.ValidationError(
            f"Quantity cannot exceed {PRODUCT_QUANTITY_MAX}."
        )

    return value


# ============================================================
# NESTED SERIALIZERS
# ============================================================

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = (
            "id",
            "image_url",
            "image_public_id",
            "is_primary",
            "sort_order",
            "created_at",
        )
        read_only_fields = fields


class ProductPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductProperty
        fields = (
            "id",
            "name",
            "value",
            "sort_order",
        )

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Property name is required.")
        if len(value) > PROPERTY_NAME_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Property name cannot exceed {PROPERTY_NAME_MAX_LENGTH} characters."
            )
        if _has_url(value):
            raise serializers.ValidationError(
                "Property name cannot contain links or URLs."
            )
        return value

    def validate_value(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Property value is required.")
        if len(value) > PROPERTY_VALUE_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Property value cannot exceed {PROPERTY_VALUE_MAX_LENGTH} characters."
            )
        if _has_url(value):
            raise serializers.ValidationError(
                "Property value cannot contain links or URLs."
            )
        return value


# ============================================================
# READ
# ============================================================

class ProductSerializer(serializers.ModelSerializer):
    """
    Read serializer — returns the full product shape.
    """

    business_name = serializers.CharField(
        source="business.business_name",
        read_only=True,
    )

    business_category = serializers.CharField(
        source="business.business_category",
        read_only=True,
    )

    business_type = serializers.CharField(
        source="business.business_type",
        read_only=True,
    )

    owner = serializers.SerializerMethodField()

    images = ProductImageSerializer(many=True, read_only=True)

    primary_image = serializers.SerializerMethodField()

    properties = ProductPropertySerializer(
        source="property_items",
        many=True,
        read_only=True,
    )

    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Products
        fields = (
            "id",
            "business",
            "business_name",
            "business_category",
            "business_type",
            "owner",
            "name",
            "description",
            "price",
            "quantity",
            "in_stock",
            "images",
            "primary_image",
            "has_images",
            "image_urls",
            "has_price",
            "properties",
            "has_properties",
            "views",
            "likes_count",
            "follows_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_owner(self, obj):
        owner = obj.business.owner if obj.business_id else None
        if not owner:
            return None
        return {
            "id": owner.id,
            "full_name": owner.full_name,
            "profile_image_url": owner.profile_image_url,
        }

    def get_primary_image(self, obj):
        image = obj.primary_image
        if image is None:
            return None
        return ProductImageSerializer(image, context=self.context).data


# ============================================================
# CREATE
# ============================================================

class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Validate text fields + optional properties + optional stock.

    Rules:
        - name:        required, 3–80 chars, no URLs
        - description: required, 10–400 chars, no URLs
        - properties:  each name/value ≤ limit, no URLs
        - price:       optional, ≥ 0
        - quantity:    optional, ≥ 0, ≤ 1 000 000
        - images:      handled in the view (uploaded to Cloudinary)
    """

    properties = ProductPropertySerializer(many=True, required=False)

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "quantity",
            "properties",
        )
        extra_kwargs = {
            "name":        {"required": True,  "allow_blank": False},
            "description": {"required": True,  "allow_blank": False},
            "price":       {"required": False, "allow_null": True},
            "quantity":    {"required": False},
        }

    def validate_name(self, value):
        return _check_text_field(
            value,
            "Product name",
            PRODUCT_NAME_MIN_LENGTH,
            PRODUCT_NAME_MAX_LENGTH,
        )

    def validate_description(self, value):
        return _check_text_field(
            value,
            "Description",
            PRODUCT_DESCRIPTION_MIN_LENGTH,
            PRODUCT_DESCRIPTION_MAX_LENGTH,
        )

    def validate_price(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_quantity(self, value):
        return _check_quantity(value)

    def validate_properties(self, value):
        for item in value:
            if not item.get("name") or not item.get("value"):
                raise serializers.ValidationError(
                    "Each property must have a name and a value."
                )
        return value

    def create(self, validated_data):
        properties_data = validated_data.pop("properties", [])
        product = Products.objects.create(**validated_data)
        for index, prop in enumerate(properties_data):
            ProductProperty.objects.create(
                product=product,
                name=prop["name"],
                value=prop["value"],
                sort_order=prop.get("sort_order", index),
            )
        return product


# ============================================================
# UPDATE
# ============================================================

class ProductUpdateSerializer(serializers.ModelSerializer):
    """
    Same validation as create, but every field is optional.
    Any field that IS sent must still pass the same rules
    (including the "no URLs" rule).
    Properties, if provided, replace the existing set entirely.
    """

    properties = ProductPropertySerializer(many=True, required=False)

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "quantity",
            "properties",
        )
        extra_kwargs = {
            "name":        {"required": False, "allow_blank": False},
            "description": {"required": False, "allow_blank": False},
            "price":       {"required": False, "allow_null": True},
            "quantity":    {"required": False},
        }

    def validate_name(self, value):
        if value is None:
            return value
        return _check_text_field(
            value,
            "Product name",
            PRODUCT_NAME_MIN_LENGTH,
            PRODUCT_NAME_MAX_LENGTH,
        )

    def validate_description(self, value):
        if value is None:
            return value
        return _check_text_field(
            value,
            "Description",
            PRODUCT_DESCRIPTION_MIN_LENGTH,
            PRODUCT_DESCRIPTION_MAX_LENGTH,
        )

    def validate_price(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_quantity(self, value):
        if value is None:
            return value
        return _check_quantity(value)

    def validate_properties(self, value):
        for item in value:
            if not item.get("name") or not item.get("value"):
                raise serializers.ValidationError(
                    "Each property must have a name and a value."
                )
        return value

    def update(self, instance, validated_data):
        properties_data = validated_data.pop("properties", None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if properties_data is not None:
            instance.property_items.all().delete()
            for index, prop in enumerate(properties_data):
                ProductProperty.objects.create(
                    product=instance,
                    name=prop["name"],
                    value=prop["value"],
                    sort_order=prop.get("sort_order", index),
                )

        return instance