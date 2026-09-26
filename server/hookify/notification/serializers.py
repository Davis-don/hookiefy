# notification/serializers.py
from rest_framework import serializers

from .models import Notification
from account.serializers import UserSerializer


class ConnectionMiniSerializer(serializers.Serializer):
    """
    Tiny subset of Connection used inside notifications.

    NOTE: Connection no longer has a `status` field — status and
    status_display are derived properties that read from the linked
    payment. Do NOT call `get_status_display()` — that method only
    exists on model fields with `choices=`, which `status` is not.
    """

    connection_id = serializers.UUIDField()
    source = serializers.CharField()
    status = serializers.CharField()
    status_display = serializers.CharField()   # ← property, not source=
    is_paid = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class NotificationSerializer(serializers.ModelSerializer):
    """
    Notification serializer used for all read endpoints.

    Produces the shape React expects:
      - nested `sender` / `receiver`
      - nested `connection` (with status + status_display)
      - `connected_user_*` context fields (the OTHER party)
      - `action_taken_by` context field
    """

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )

    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)

    connection = serializers.SerializerMethodField()

    # Context-only fields (not model fields)
    connected_user_name = serializers.SerializerMethodField()
    connected_user_avatar = serializers.SerializerMethodField()
    connected_user_id = serializers.SerializerMethodField()
    action_taken_by = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "notification_id",
            "title",
            "message",
            "category",
            "category_display",
            "is_read",
            "read_at",
            "created_at",
            "sender",
            "receiver",
            "connection",
            "connected_user_name",
            "connected_user_avatar",
            "connected_user_id",
            "action_taken_by",
        ]
        read_only_fields = fields  # everything read-only for fetch

    # --------------------------------------------------------
    # CONNECTION
    # --------------------------------------------------------

    def get_connection(self, obj):
        conn = obj.connection
        if not conn:
            return None

        return {
            "connection_id": str(conn.connection_id),
            "source": conn.source,
            "status": conn.status,                  # ← property
            "status_display": conn.status_display,  # ← property (NOT a method)
            "is_paid": conn.is_paid,                # ← property
            "created_at": conn.created_at,
        }

    # --------------------------------------------------------
    # CONNECTED USER (the OTHER party in the connection)
    # --------------------------------------------------------

    def _get_connected_user(self, obj):
        request = self.context.get("request")
        current_user = getattr(request, "user", None)
        conn = obj.connection

        if not conn or not current_user or not current_user.is_authenticated:
            return None, None

        if conn.sender_id == current_user.id:
            return conn.receiver, "receiver"
        if conn.receiver_id == current_user.id:
            return conn.sender, "sender"
        return None, None

    def get_connected_user_name(self, obj):
        user, _ = self._get_connected_user(obj)
        return getattr(user, "full_name", None) if user else None

    def get_connected_user_avatar(self, obj):
        user, _ = self._get_connected_user(obj)
        return getattr(user, "profile_image_url", None) if user else None

    def get_connected_user_id(self, obj):
        user, _ = self._get_connected_user(obj)
        return user.id if user else None

    def get_action_taken_by(self, obj):
        _, role = self._get_connected_user(obj)
        return role


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Used when creating notifications programmatically from other apps
    (payments, connections, etc.).

    Optional — the codebase currently uses Notification.objects.create()
    directly in payments/views.py, which is also fine.
    """

    class Meta:
        model = Notification
        fields = [
            "receiver",
            "category",
            "title",
            "message",
            "connection",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            attrs["sender"] = request.user
        return attrs