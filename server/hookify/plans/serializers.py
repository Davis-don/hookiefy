# plans/serializers.py

from rest_framework import serializers

from .models import Plan, PlanProperty


# ============================================================
# PLAN PROPERTY
# ============================================================

class PlanPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanProperty
        fields = (
            "id",
            "name",
            "value",
            "is_highlighted",
            "sort_order",
        )


# ============================================================
# PLAN — READ
# ============================================================

class PlanSerializer(serializers.ModelSerializer):
    properties = PlanPropertySerializer(many=True, read_only=True)
    price_display = serializers.CharField(read_only=True)
    is_free = serializers.BooleanField(read_only=True)
    has_unlimited_businesses = serializers.BooleanField(read_only=True)
    has_unlimited_posts = serializers.BooleanField(read_only=True)
    has_unlimited_products = serializers.BooleanField(read_only=True)
    has_unlimited_images_per_product = serializers.BooleanField(read_only=True)
    has_unlimited_stories = serializers.BooleanField(read_only=True)

    class Meta:
        model = Plan
        fields = (
            "id",
            "plan_name",
            "slug",
            "description",
            "price",
            "price_display",
            "is_free",
            "billing_cycle",

            # Fixed limits
            "businesses_limit",
            "posts_limit",
            "products_limit",
            "images_per_product",
            "stories_per_month",
            "profile_images_limit",

            # Flags
            "featured_listing",
            "verified_premium_badge",
            "priority_visibility",
            "analytics_level",
            "connection_fee_type",

            # State
            "is_active",
            "is_default",
            "display_order",
            "created_at",
            "updated_at",

            # Computed
            "has_unlimited_businesses",
            "has_unlimited_posts",
            "has_unlimited_products",
            "has_unlimited_images_per_product",
            "has_unlimited_stories",

            # Nested
            "properties",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "is_default",
        )


# ============================================================
# PLAN — CREATE
# ============================================================

class PlanCreateSerializer(serializers.ModelSerializer):
    """
    Create a plan.

    Optionally accepts `properties` — a list of {name, value}
    dicts — which are created inline with the plan.

    `is_default` is intentionally NOT writable here. Default
    assignment is done through the dedicated set-default
    endpoint, except that when the database has zero plans,
    the first created plan is automatically promoted to
    default.
    """

    properties = PlanPropertySerializer(many=True, required=False)

    class Meta:
        model = Plan
        fields = (
            "plan_name",
            "slug",
            "description",
            "price",
            "billing_cycle",
            "businesses_limit",
            "posts_limit",
            "products_limit",
            "images_per_product",
            "stories_per_month",
            "profile_images_limit",
            "featured_listing",
            "verified_premium_badge",
            "priority_visibility",
            "analytics_level",
            "connection_fee_type",
            "is_active",
            "display_order",
            "properties",
        )
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "price": {"required": False},
            "billing_cycle": {"required": False},
            "is_active": {"required": False},
            "display_order": {"required": False},
            "properties": {"required": False},
        }

    def validate_plan_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Plan name cannot be empty.")
        if Plan.objects.filter(plan_name__iexact=value).exists():
            raise serializers.ValidationError(
                "A plan with this name already exists."
            )
        return value

    def validate_slug(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Slug cannot be empty.")
        if Plan.objects.filter(slug__iexact=value).exists():
            raise serializers.ValidationError(
                "A plan with this slug already exists."
            )
        return value

    def validate_price(self, value):
        if value is None:
            return 0
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def create(self, validated_data):
        from django.db import transaction

        properties_data = validated_data.pop("properties", [])

        with transaction.atomic():
            plan = Plan.objects.create(**validated_data)

            # First plan ever → automatically make it the default.
            if not Plan.objects.exclude(pk=plan.pk).exists():
                plan.is_default = True
                plan.save(update_fields=["is_default", "updated_at"])

            for index, prop in enumerate(properties_data):
                PlanProperty.objects.create(
                    plan=plan,
                    name=prop["name"],
                    value=prop["value"],
                    is_highlighted=prop.get("is_highlighted", False),
                    sort_order=prop.get("sort_order", index),
                )

        return plan


# ============================================================
# PLAN — UPDATE
# ============================================================

class PlanUpdateSerializer(serializers.ModelSerializer):
    """
    Partial update of a plan.

    Properties, if provided, replace the existing set entirely.
    `is_default` cannot be changed through this serializer —
    use the dedicated set-default / clear-default endpoints.
    """

    properties = PlanPropertySerializer(many=True, required=False)

    class Meta:
        model = Plan
        fields = (
            "plan_name",
            "slug",
            "description",
            "price",
            "billing_cycle",
            "businesses_limit",
            "posts_limit",
            "products_limit",
            "images_per_product",
            "stories_per_month",
            "profile_images_limit",
            "featured_listing",
            "verified_premium_badge",
            "priority_visibility",
            "analytics_level",
            "connection_fee_type",
            "is_active",
            "display_order",
            "properties",
        )
        extra_kwargs = {
            "plan_name": {"required": False},
            "slug": {"required": False},
            "description": {"required": False, "allow_blank": True},
            "properties": {"required": False},
        }

    def validate_plan_name(self, value):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Plan name cannot be empty.")
        if Plan.objects.filter(plan_name__iexact=value).exclude(
            pk=self.instance.pk
        ).exists():
            raise serializers.ValidationError(
                "A plan with this name already exists."
            )
        return value

    def validate_slug(self, value):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Slug cannot be empty.")
        if Plan.objects.filter(slug__iexact=value).exclude(
            pk=self.instance.pk
        ).exists():
            raise serializers.ValidationError(
                "A plan with this slug already exists."
            )
        return value

    def validate_price(self, value):
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def update(self, instance, validated_data):
        from django.db import transaction

        properties_data = validated_data.pop("properties", None)

        with transaction.atomic():
            for attr, val in validated_data.items():
                setattr(instance, attr, val)
            instance.save()

            if properties_data is not None:
                instance.properties.all().delete()
                for index, prop in enumerate(properties_data):
                    PlanProperty.objects.create(
                        plan=instance,
                        name=prop["name"],
                        value=prop["value"],
                        is_highlighted=prop.get("is_highlighted", False),
                        sort_order=prop.get("sort_order", index),
                    )

        return instance