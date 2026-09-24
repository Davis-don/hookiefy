# plans/serializers.py
from rest_framework import serializers

from .models import Plan


# ============================================================
# PLAN — READ
# ============================================================

class PlanReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",

            # usage limits
            "services_limit",
            "images_per_service",
            "stories_per_month",

            # profile / visibility
            "profile_images_limit",
            "featured_listing",
            "verified_premium_badge",
            "priority_visibility",

            # analytics
            "analytics_level",

            # connection fee
            "connection_fee_type",

            # status / ordering
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# PLAN — CREATE
# ============================================================

class PlanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = (
            "name",
            "slug",
            "description",
            "price",

            "services_limit",
            "images_per_service",
            "stories_per_month",

            "profile_images_limit",
            "featured_listing",
            "verified_premium_badge",
            "priority_visibility",

            "analytics_level",
            "connection_fee_type",

            "is_active",
            "display_order",
        )

    # ── Validation ────────────────────────────────────────

    def validate_name(self, value):
        value = (value or "").strip()

        if not value:
            raise serializers.ValidationError(
                "Plan name is required."
            )

        if len(value) < 2:
            raise serializers.ValidationError(
                "Plan name must be at least 2 characters."
            )

        if Plan.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError(
                "A plan with this name already exists."
            )

        return value

    def validate_slug(self, value):
        value = (value or "").strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Slug is required."
            )

        if Plan.objects.filter(slug__iexact=value).exists():
            raise serializers.ValidationError(
                "A plan with this slug already exists."
            )

        return value

    def validate_price(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError(
                "Price cannot be negative."
            )
        return value

    def validate_profile_images_limit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Profile images limit cannot be negative."
            )
        return value

    def validate(self, attrs):
        """
        Any cross-field rules go here.
        """
        analytics_level = attrs.get("analytics_level")
        if analytics_level and analytics_level not in dict(
            Plan.ANALYTICS_CHOICES
        ):
            raise serializers.ValidationError(
                {"analytics_level": "Invalid analytics level."}
            )

        return attrs


# ============================================================
# PLAN — UPDATE
# ============================================================

class PlanUpdateSerializer(serializers.ModelSerializer):
    """
    Supports both PUT (full update) and PATCH (partial update).
    """

    class Meta:
        model = Plan
        fields = (
            "name",
            "slug",
            "description",
            "price",

            "services_limit",
            "images_per_service",
            "stories_per_month",

            "profile_images_limit",
            "featured_listing",
            "verified_premium_badge",
            "priority_visibility",

            "analytics_level",
            "connection_fee_type",

            "is_active",
            "display_order",
        )

    def validate_name(self, value):
        value = (value or "").strip()

        if not value:
            raise serializers.ValidationError(
                "Plan name is required."
            )

        if len(value) < 2:
            raise serializers.ValidationError(
                "Plan name must be at least 2 characters."
            )

        # Skip the uniqueness check against itself
        qs = Plan.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "A plan with this name already exists."
            )

        return value

    def validate_slug(self, value):
        value = (value or "").strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Slug is required."
            )

        qs = Plan.objects.filter(slug__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "A plan with this slug already exists."
            )

        return value

    def validate_price(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError(
                "Price cannot be negative."
            )
        return value

    def validate_profile_images_limit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Profile images limit cannot be negative."
            )
        return value

    def validate(self, attrs):
        analytics_level = attrs.get(
            "analytics_level",
            getattr(self.instance, "analytics_level", None),
        )
        if analytics_level and analytics_level not in dict(
            Plan.ANALYTICS_CHOICES
        ):
            raise serializers.ValidationError(
                {"analytics_level": "Invalid analytics level."}
            )

        return attrs