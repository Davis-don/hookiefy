# notifications/serializers.py

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Read serializer for a single notification.
    """

    is_read = serializers.BooleanField(read_only=True)
    is_unread = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    has_action = serializers.BooleanField(read_only=True)

    # Render the choices as their human-readable labels too,
    # so the frontend doesn't need a lookup table.
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    severity_display = serializers.CharField(
        source="get_severity_display",
        read_only=True,
    )

    # Who sent it (may be null for system notifications).
    actor_name = serializers.SerializerMethodField()
    actor_image = serializers.URLField(
        source="actor.profile_image_url",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "title",
            "body",
            "category",
            "category_display",
            "severity",
            "severity_display",
            "actor",
            "actor_name",
            "actor_image",
            "action_label",
            "action_url",
            "has_action",
            "metadata",
            "is_read",
            "is_unread",
            "is_expired",
            "read_at",
            "expires_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_actor_name(self, obj):
        if not obj.actor_id:
            return None
        return obj.actor.full_name or obj.actor.email