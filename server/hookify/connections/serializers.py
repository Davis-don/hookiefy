# connections/serializers.py
from rest_framework import serializers

from account.models import Accounts
from .models import Connection


# ============================================================
# CONNECTED USER (the OTHER party)
# ============================================================

class ConnectedUserSerializer(serializers.ModelSerializer):
    """
    Mini serializer used to expose the OTHER party's contact
    details once a connection is paid (i.e. its linked payment
    is completed).
    """

    full_name = serializers.CharField(read_only=True)
    has_profile_image = serializers.BooleanField(read_only=True)

    class Meta:
        model = Accounts
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "gender",
            "profile_image_url",
            "has_profile_image",
            "role",
        ]
        read_only_fields = fields


# ============================================================
# CONNECTION MINI (embedded shape)
# ============================================================

class ConnectionMiniSerializer(serializers.ModelSerializer):
    """
    Compact read-only representation of a Connection. Status
    fields are derived from the linked Payment.
    """

    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(read_only=True)
    is_paid = serializers.BooleanField(read_only=True)
    is_pending = serializers.BooleanField(read_only=True)

    payment_id = serializers.IntegerField(
        source="payment.id", read_only=True, allow_null=True
    )
    payment_status = serializers.CharField(
        source="payment.status",
        read_only=True,
        allow_null=True,
    )
    merchant_reference = serializers.CharField(
        source="payment.merchant_reference",
        read_only=True,
        allow_null=True,
    )
    amount = serializers.DecimalField(
        source="payment.amount",
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Connection
        fields = [
            "connection_id",
            "sender",
            "receiver",
            "source",
            "service",
            "payment_id",
            "payment_status",
            "merchant_reference",
            "amount",
            "status",
            "status_display",
            "is_paid",
            "is_pending",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ============================================================
# CONNECTION CONTACT (payload for /connections/contact/<id>/)
# ============================================================

class ConnectionContactSerializer(serializers.Serializer):
    """
    Read-only payload returned by the connection-contact endpoint.

    Shape (matches what the React modal / connections page expects):

    {
      "success": true,
      "message": "...",
      "data": {
        "connection_id": "...",
        "source": "hookup" | "service" | "advert",
        "status": "completed",
        "status_display": "Completed",
        "is_paid": true,
        "created_at": "...",
        "updated_at": "...",
        "user_role": "sender" | "receiver",
        "connected_user": { ... },
        "contact_details": {
          "phone_number": "...",
          "email": "...",
          "full_name": "..."
        }
      }
    }
    """

    connection_id = serializers.UUIDField()
    source = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()

    # Derived from the linked payment
    status = serializers.CharField()
    status_display = serializers.CharField()
    is_paid = serializers.BooleanField()

    # Caller context
    user_role = serializers.ChoiceField(
        choices=["sender", "receiver"]
    )

    # Payloads
    connected_user = ConnectedUserSerializer()
    contact_details = serializers.DictField(
        child=serializers.CharField(allow_blank=True)
    )