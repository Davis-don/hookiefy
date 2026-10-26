# deliveries/serializers.py

from rest_framework import serializers

from .models import Deliveries


# ============================================================
# READ — FULL DELIVERY SHAPE
# ============================================================
#
# Relational expansion is inline (rather than nested serializers)
# so the frontend receives flat fields like `client_email`
# without having to drill into `client.email`. Same pattern used
# by ProductPaymentSerializer and other read serializers in the
# project.
# ============================================================

class DeliverySerializer(serializers.ModelSerializer):
    """
    Full delivery shape with relational expansion.

    Read-only — deliveries are created by the payment flow,
    not by client POSTs. The only write endpoint is
    `POST /deliveries/<id>/status/`, which uses
    `DeliveryStatusUpdateSerializer` instead.
    """

    # ── Payment reference ──────────────────────────────
    payment_reference = serializers.CharField(
        source="payment.merchant_reference",
        read_only=True,
    )

    # ── Client ─────────────────────────────────────────
    client_id = serializers.IntegerField(
        source="client.id",
        read_only=True,
    )
    client_email = serializers.EmailField(
        source="client.email",
        read_only=True,
    )
    client_name = serializers.CharField(
        source="client.full_name",
        read_only=True,
    )

    # ── Product ────────────────────────────────────────
    product_id = serializers.IntegerField(
        source="product.id",
        read_only=True,
        allow_null=True,
    )
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
        allow_null=True,
    )
    product_image_url = serializers.SerializerMethodField()

    # ── Courier ────────────────────────────────────────
    delivered_by_id = serializers.IntegerField(
        source="delivered_by.id",
        read_only=True,
        allow_null=True,
    )
    delivered_by_email = serializers.EmailField(
        source="delivered_by.email",
        read_only=True,
        allow_null=True,
    )

    # ── Recipient ──────────────────────────────────────
    delivered_to_id = serializers.IntegerField(
        source="delivered_to.id",
        read_only=True,
        allow_null=True,
    )
    delivered_to_email = serializers.EmailField(
        source="delivered_to.email",
        read_only=True,
        allow_null=True,
    )

    # ── Model properties ───────────────────────────────
    is_terminal = serializers.BooleanField(read_only=True)
    time_since_created = serializers.CharField(read_only=True)

    class Meta:
        model = Deliveries
        fields = (
            "id",
            "payment",
            "payment_reference",

            "client_id",
            "client_email",
            "client_name",

            "product_id",
            "product_name",
            "product_image_url",
            "quantity",

            "delivered_by_id",
            "delivered_by_email",

            "delivered_to_id",
            "delivered_to_email",

            "town",
            "status",
            "delivered_at",

            "is_terminal",
            "time_since_created",

            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_product_image_url(self, obj):
        """Primary image URL for the product, or None."""
        if obj.product is None:
            return None
        image = obj.product.primary_image
        return image.image_url if image else None


# ============================================================
# WRITE — STATUS TRANSITION
# ============================================================
#
# Accepts only the three values a client can trigger from the
# /deliveries/<id>/status/ endpoint. `pending` is excluded on
# purpose — deliveries start pending and never return to it,
# so the endpoint can't be used to "un-deliver" a delivery.
# ============================================================

class DeliveryStatusUpdateSerializer(serializers.Serializer):
    """
    Input for POST /deliveries/<id>/status/

    Only the three terminal statuses a caller can trigger.
    """

    status = serializers.ChoiceField(
        choices=(
            Deliveries.STATUS_DELIVERED,
            Deliveries.STATUS_CANCELLED,
            Deliveries.STATUS_FAILED,
        ),
    )