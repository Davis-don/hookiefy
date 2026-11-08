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

PROPERTY_NAME_MAX_LENGTH  = 60
PROPERTY_VALUE_MAX_LENGTH = 120

PRODUCT_QUANTITY_MAX = 1_000_000

# Delivery towns: at most this many per product, and each
# name can't exceed this length. Keeps the JSON column
# manageable and gives a friendly error long before the DB
# complains.
DELIVERY_TOWNS_MAX_COUNT  = 200
DELIVERY_TOWN_MAX_LENGTH  = 200

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
    if value is None:
        return value
    if value < 0:
        raise serializers.ValidationError("Quantity cannot be negative.")
    if value > PRODUCT_QUANTITY_MAX:
        raise serializers.ValidationError(
            f"Quantity cannot exceed {PRODUCT_QUANTITY_MAX}."
        )
    return value


def _normalise_delivery_towns(value):
    """
    Accept a list of town names, dedupe case-insensitively
    (preserving order), trim whitespace, and enforce limits.

    Raises ValidationError on invalid input.
    """
    if value in (None, ""):
        return []

    if not isinstance(value, list):
        raise serializers.ValidationError(
            "Delivery towns must be a list of town names."
        )

    if len(value) > DELIVERY_TOWNS_MAX_COUNT:
        raise serializers.ValidationError(
            f"Delivery towns cannot exceed {DELIVERY_TOWNS_MAX_COUNT} entries."
        )

    clean = []
    seen = set()
    for item in value:
        if not isinstance(item, str):
            raise serializers.ValidationError(
                "Every delivery town must be a string."
            )
        town = item.strip()
        if not town:
            continue
        if len(town) > DELIVERY_TOWN_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Each town name cannot exceed {DELIVERY_TOWN_MAX_LENGTH} characters."
            )
        key = town.lower()
        if key in seen:
            continue
        seen.add(key)
        clean.append(town)

    return clean


def _check_delivery_scope(scope, towns):
    """
    Validate the (scope, towns) pair — the two fields are
    coupled: 'specific' requires a non-empty list, everything
    else must accept an empty list.

    Returns (clean_scope, clean_towns) or raises.
    """
    valid_scopes = {choice[0] for choice in Products.DELIVERY_CHOICES}

    if scope is None:
        scope = Products.DELIVERY_EVERYWHERE

    if scope not in valid_scopes:
        raise serializers.ValidationError(
            {
                "delivery_scope": [
                    f"Must be one of: {', '.join(sorted(valid_scopes))}."
                ]
            }
        )

    towns = _normalise_delivery_towns(towns)

    if scope == Products.DELIVERY_SPECIFIC and not towns:
        raise serializers.ValidationError(
            {
                "delivery_towns": [
                    "At least one town is required when delivery_scope "
                    "is 'specific'."
                ]
            }
        )

    return scope, towns


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
    Read serializer — full product shape, now including
    delivery_scope / delivery_towns.
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

    # Convenience flags the frontend can render without
    # re-deriving them:
    #
    #   can_be_delivered → boolean (true for everywhere/specific)
    #   delivery_scope_display → human label ("Everywhere", …)
    #
    can_be_delivered = serializers.BooleanField(read_only=True)
    delivery_scope_display = serializers.CharField(
        source="get_delivery_scope_display",
        read_only=True,
    )

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

            # Delivery
            "delivery_scope",
            "delivery_scope_display",
            "delivery_towns",
            "can_be_delivered",

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
    Validate text fields + optional properties + optional stock
    + delivery policy.

    Delivery fields are validated as a pair — scope and towns
    must agree — even though each is independently optional in
    the payload (a create with neither set falls back to
    'everywhere' with an empty towns list).
    """

    properties = ProductPropertySerializer(many=True, required=False)

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "quantity",
            "delivery_scope",
            "delivery_towns",
            "properties",
        )
        extra_kwargs = {
            "name":           {"required": True,  "allow_blank": False},
            "description":    {"required": True,  "allow_blank": False},
            "price":          {"required": False, "allow_null": True},
            "quantity":       {"required": False},
            "delivery_scope": {"required": False},
            "delivery_towns": {"required": False},
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

    def validate(self, attrs):
        scope = attrs.get("delivery_scope", Products.DELIVERY_EVERYWHERE)
        towns = attrs.get("delivery_towns", [])
        clean_scope, clean_towns = _check_delivery_scope(scope, towns)
        attrs["delivery_scope"] = clean_scope
        attrs["delivery_towns"] = clean_towns
        return attrs

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
    Any field that IS sent must still pass the same rules.

    The delivery pair has partial-update semantics: sending only
    `delivery_scope` keeps the existing `delivery_towns` on the
    row and re-validates the pair against them; sending only
    `delivery_towns` keeps the existing scope. Sending both
    replaces both.
    """

    properties = ProductPropertySerializer(many=True, required=False)

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "quantity",
            "delivery_scope",
            "delivery_towns",
            "properties",
        )
        extra_kwargs = {
            "name":           {"required": False, "allow_blank": False},
            "description":    {"required": False, "allow_blank": False},
            "price":          {"required": False, "allow_null": True},
            "quantity":       {"required": False},
            "delivery_scope": {"required": False},
            "delivery_towns": {"required": False},
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

    def validate(self, attrs):
        # Partial update semantics — merge incoming with the
        # instance's current values before validating the pair.
        has_scope = "delivery_scope" in attrs
        has_towns = "delivery_towns" in attrs

        if not has_scope and not has_towns:
            # Neither field touched → nothing to validate.
            return attrs

        instance = self.instance

        scope = (
            attrs["delivery_scope"]
            if has_scope
            else (instance.delivery_scope if instance else Products.DELIVERY_EVERYWHERE)
        )
        towns = (
            attrs["delivery_towns"]
            if has_towns
            else (instance.delivery_towns if instance else [])
        )

        clean_scope, clean_towns = _check_delivery_scope(scope, towns)
        attrs["delivery_scope"] = clean_scope
        attrs["delivery_towns"] = clean_towns

        return attrs

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