# services/serializers.py
from rest_framework import serializers

from .models import ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    """
    Full serializer for ServiceCategory — supports
    list, retrieve, create, update, and partial update.
    """

    class Meta:
        model = ServiceCategory
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "image_url",
            "is_active",
            "is_featured",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "created_at",
            "updated_at",
        )

    # ── Validation ────────────────────────────────────────

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Name must be at least 2 characters long."
            )

        # Case-insensitive uniqueness — prevents "Teaching"
        # and "teaching" from both existing.
        qs = ServiceCategory.objects.filter(name__iexact=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "A category with this name already exists."
            )

        return value

    def validate_image_url(self, value):
        # Allow null/blank
        if value in (None, ""):
            return None

        # Enforce http/https scheme
        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "Image URL must start with http:// or https://"
            )

        return value.strip()