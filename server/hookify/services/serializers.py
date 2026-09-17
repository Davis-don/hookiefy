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