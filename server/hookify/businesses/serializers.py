# businesses/serializers.py

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


# ============================================================
# FULL DETAILS — business + all posts + all products
# ============================================================
# No owner / account details are exposed here.

class BusinessPostDetailSerializer(serializers.ModelSerializer):
    """
    One post inside the business-details payload.
    """

    class Meta:
        from posts.models import Posts
        model = Posts
        fields = (
            "id",
            "title",
            "body",
            "image_url",
            "image_public_id",
            "views",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class BusinessProductImageSerializer(serializers.ModelSerializer):
    """
    One product image inside the business-details payload.
    """

    class Meta:
        from products.models import ProductImage
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


class BusinessProductPropertySerializer(serializers.ModelSerializer):
    """
    One product property inside the business-details payload.
    """

    class Meta:
        from products.models import ProductProperty
        model = ProductProperty
        fields = (
            "id",
            "name",
            "value",
            "sort_order",
        )
        read_only_fields = fields


class BusinessProductDetailSerializer(serializers.ModelSerializer):
    """
    One product inside the business-details payload,
    with its images and properties nested.
    """

    images = BusinessProductImageSerializer(many=True, read_only=True)
    properties = BusinessProductPropertySerializer(
        source="property_items",
        many=True,
        read_only=True,
    )
    primary_image = serializers.SerializerMethodField()

    class Meta:
        from products.models import Products
        model = Products
        fields = (
            "id",
            "name",
            "description",
            "price",
            "views",
            "images",
            "primary_image",
            "properties",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_primary_image(self, obj):
        image = obj.primary_image
        if image is None:
            return None
        return BusinessProductImageSerializer(image).data


class BusinessDetailSerializer(serializers.ModelSerializer):
    """
    Full details of a business:

        - Business fields
        - Every post
        - Every product (with images + properties)
        - Counts

    Deliberately excludes owner / account details.
    """

    business_category_display = serializers.CharField(
        source="get_business_category_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    posts = serializers.SerializerMethodField()
    products = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Businesses
        fields = (
            "id",
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
            "post_count",
            "product_count",
            "posts",
            "products",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_posts(self, obj):
        qs = obj.posts.all().order_by("-created_at")
        return BusinessPostDetailSerializer(qs, many=True).data

    def get_products(self, obj):
        qs = (
            obj.products
            .all()
            .order_by("-created_at")
            .prefetch_related("images", "property_items")
        )
        return BusinessProductDetailSerializer(qs, many=True).data

    def get_post_count(self, obj):
        return obj.posts.count()

    def get_product_count(self, obj):
        return obj.products.count()