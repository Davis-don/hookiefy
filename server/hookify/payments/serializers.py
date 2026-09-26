# payments/serializers.py
from rest_framework import serializers

from .models import Payment
from connections.models import Connection


# ============================================================
# INPUT — CONNECTION / HOOKUP PAYMENT INITIATION
# ============================================================

class PaymentInitiationSerializer(serializers.Serializer):
    """
    Validates the body for POST /payments/initiate/

    Either `connection_id` or `receiver_id` must be provided.
    """

    connection_id = serializers.UUIDField(required=False, allow_null=True)
    receiver_id = serializers.IntegerField(
        required=False, allow_null=True
    )
    phone_number = serializers.CharField(max_length=20, required=True)

    def validate_phone_number(self, value):
        cleaned = (
            value
            .replace("+", "")
            .replace("-", "")
            .replace(" ", "")
        )
        if not cleaned.isdigit():
            raise serializers.ValidationError(
                "Invalid phone number format"
            )
        if len(cleaned) < 9 or len(cleaned) > 15:
            raise serializers.ValidationError(
                "Phone number must be 9–15 digits."
            )
        return value

    def validate(self, attrs):
        if not attrs.get("connection_id") and not attrs.get(
            "receiver_id"
        ):
            raise serializers.ValidationError(
                "Provide either connection_id or receiver_id."
            )
        return attrs


# ============================================================
# INPUT — SERVICE CONTACT-REVEAL PAYMENT INITIATION
# ============================================================

class ServicePaymentInitiationSerializer(serializers.Serializer):
    """
    Validates the body for POST /payments/service/initiate/
    """

    service_id = serializers.IntegerField(required=True)
    phone_number = serializers.CharField(max_length=20, required=True)

    def validate_service_id(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "service_id must be a positive integer."
            )
        return value

    def validate_phone_number(self, value):
        cleaned = (
            value
            .replace("+", "")
            .replace("-", "")
            .replace(" ", "")
        )
        if not cleaned.isdigit():
            raise serializers.ValidationError(
                "Invalid phone number format"
            )
        if len(cleaned) < 9 or len(cleaned) > 15:
            raise serializers.ValidationError(
                "Phone number must be 9–15 digits."
            )
        return value


# ============================================================
# OUTPUT — CONNECTION MINI
# ============================================================

class ConnectionMiniSerializer(serializers.ModelSerializer):
    """
    Compact read-only representation of a Connection, including
    its derived paid/pending state (which comes from the linked
    Payment, not from any field on Connection itself).
    """

    is_paid = serializers.BooleanField(read_only=True)
    is_pending = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    payment_status = serializers.CharField(
        read_only=True, allow_null=True
    )
    status_display = serializers.CharField(read_only=True)

    class Meta:
        model = Connection
        fields = [
            "connection_id",
            "sender",
            "receiver",
            "source",
            "service",
            "is_paid",
            "is_pending",
            "is_active",
            "payment_status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — PAYMENT
# ============================================================

class PaymentSerializer(serializers.ModelSerializer):
    """
    Full read-only payment representation.
    Used for status endpoints if you want DRF-serialized output.
    """

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    gateway_display = serializers.CharField(
        source="get_gateway_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    is_completed = serializers.BooleanField(read_only=True)
    is_terminal = serializers.BooleanField(read_only=True)
    connection_details = ConnectionMiniSerializer(
        source="connection",
        read_only=True,
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "merchant_reference",
            "order_tracking_id",
            "category",
            "category_display",
            "status",
            "status_display",
            "amount",
            "phone_number",
            "gateway",
            "gateway_display",
            "user",
            "connection",
            "connection_details",
            "service",
            "paid_at",
            "created_at",
            "updated_at",
            "is_completed",
            "is_terminal",
        ]
        read_only_fields = fields


class PaymentMiniSerializer(serializers.ModelSerializer):
    """
    Used when we want to embed the payment inside another
    serializer without exploding the payload.
    """

    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "merchant_reference",
            "category",
            "category_display",
            "status",
            "status_display",
            "amount",
            "paid_at",
            "created_at",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — RECONCILE / LIVE STATUS POLL
# ============================================================

class ReconcilePaymentSerializer(serializers.Serializer):
    """
    Response shape for GET /payments/reconcile/<payment_id>/
    and GET /payments/status/<payment_id>/
    """

    payment = PaymentSerializer(read_only=True)
    connection = ConnectionMiniSerializer(
        read_only=True, allow_null=True
    )
    is_terminal = serializers.BooleanField(read_only=True)