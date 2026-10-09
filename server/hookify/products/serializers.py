# products/serializers.py
# ============================================================

from rest_framework import serializers

from .models import Products, ProductImage, ProductProperty


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


# ============================================================
# READ
# ============================================================

class ProductSerializer(serializers.ModelSerializer):
    """
    Read serializer — returns the full product shape,
    including nested images and properties.
    """

    business_name = serializers.CharField(
        source="business.business_name",
        read_only=True,
    )

    # Explicitly nest the many-images relation.
    images = ProductImageSerializer(many=True, read_only=True)

    # `primary_image` is a @property on the model that returns a
    # single ProductImage (or None). Use SerializerMethodField so
    # DRF runs it through the nested serializer instead of trying
    # to JSON-encode the model instance directly.
    primary_image = serializers.SerializerMethodField()

    # Same story for properties — the model exposes a list of
    # dicts via @property `properties`, but we want the full
    # property items so we serialize the related manager directly.
    properties = ProductPropertySerializer(
        source="property_items",
        many=True,
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
            "images",
            "primary_image",
            "has_images",
            "image_urls",
            "has_price",
            "properties",
            "has_properties",
            "views",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

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
    Validate text fields + optional properties.
    Images are handled separately (uploaded to Cloudinary in the view).
    Properties can be passed as a list of {name, value} dicts.
    """

    properties = ProductPropertySerializer(many=True, required=False)

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "properties",
        )
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "price":       {"required": False, "allow_null": True},
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
    Properties, if provided, replace the existing set entirely.
    """

    properties = ProductPropertySerializer(many=True, required=False)

    class Meta:
        model = Products
        fields = (
            "name",
            "description",
            "price",
            "properties",
        )
        extra_kwargs = {
            "name":        {"required": False},
            "description": {"required": False, "allow_blank": True},
            "price":       {"required": False, "allow_null": True},
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