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
    #
    # `delivered_by_is_youpata_managed` tells the frontend
    # to render "Youpata" instead of an email. When the
    # courier account is Youpata-managed, `delivered_by_email`
    # is suppressed at the source so the internal address
    # never reaches the client (defence in depth — the
    # frontend can't un-mask it via devtools).
    #
    # Both fields are SerializerMethodFields rather than
    # `source="delivered_by.<attr>"` because `delivered_by`
    # is nullable — a plain source traversal would crash
    # when the delivery has no courier assigned yet.
    # --------------------------------------------------
    delivered_by_id = serializers.IntegerField(
        source="delivered_by.id",
        read_only=True,
        allow_null=True,
    )
    delivered_by_email = serializers.SerializerMethodField()
    delivered_by_is_youpata_managed = serializers.SerializerMethodField()

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
            "delivered_by_is_youpata_managed",

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

    # ── Field resolvers ────────────────────────────────

    def get_product_image_url(self, obj):
        """Primary image URL for the product, or None."""
        if obj.product is None:
            return None
        image = obj.product.primary_image
        return image.image_url if image else None

    def get_delivered_by_email(self, obj):
        """
        Courier email — suppressed for Youpata-managed
        couriers so the internal address never leaves the
        server. Returns None when no courier is assigned.
        """
        if obj.delivered_by_id is None:
            return None
        if obj.delivered_by.is_youpata_managed:
            return None
        return obj.delivered_by.email

    def get_delivered_by_is_youpata_managed(self, obj):
        """
        True if the courier is a Youpata-managed account,
        False if a normal user, None if no courier assigned.
        """
        if obj.delivered_by_id is None:
            return None
        return obj.delivered_by.is_youpata_managed


# ============================================================
# READ — SUPERADMIN DETAIL VIEW
# ============================================================
#
# GET /deliveries/all/<id>/
#
# Returns one delivery plus expanded account info for
# everyone involved (buyer / courier / recipient) and the
# seller (via product.business). Only served to superadmins
# — enforced at the view layer.
# ============================================================

class AccountSummarySerializer(serializers.Serializer):
    """
    Compact account shape used inside the superadmin
    delivery detail response. Read-only; not tied to a
    model instance directly — the caller passes an
    `Accounts` instance.
    """
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone_number = serializers.CharField(read_only=True, allow_null=True)
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_youpata_managed = serializers.BooleanField(read_only=True)
    profile_image_url = serializers.CharField(
        read_only=True, allow_null=True
    )


class DeliveryAdminDetailSerializer(DeliverySerializer):
    """
    Delivery detail for the superadmin dashboard.

    Extends the standard DeliverySerializer (so every field
    the regular UI consumes is present) and adds:
      • buyer      — full buyer account summary
      • courier    — full courier account summary (or null)
      • recipient  — full recipient account summary (or null)
      • business   — seller account summary (or null),
                     taken from product.business

    Note: unlike the public serializer, this one does NOT
    mask `delivered_by_email` — superadmins need the real
    address for ops. The masking in DeliverySerializer
    overrides `get_delivered_by_email`, so we override it
    again here to restore the real value.
    """

    buyer = serializers.SerializerMethodField()
    courier = serializers.SerializerMethodField()
    recipient = serializers.SerializerMethodField()
    business = serializers.SerializerMethodField()

    # Restore the raw courier email — superadmins need it.
    delivered_by_email = serializers.SerializerMethodField()

    class Meta(DeliverySerializer.Meta):
        fields = DeliverySerializer.Meta.fields + (
            "buyer",
            "courier",
            "recipient",
            "business",
        )
        read_only_fields = fields

    # ── Resolvers ──────────────────────────────────────

    def get_delivered_by_email(self, obj):
        """Always return the real courier email for superadmins."""
        if obj.delivered_by_id is None:
            return None
        return obj.delivered_by.email

    def get_buyer(self, obj):
        if obj.client_id is None:
            return None
        return AccountSummarySerializer(obj.client).data

    def get_courier(self, obj):
        if obj.delivered_by_id is None:
            return None
        return AccountSummarySerializer(obj.delivered_by).data

    def get_recipient(self, obj):
        if obj.delivered_to_id is None:
            return None
        return AccountSummarySerializer(obj.delivered_to).data

    def get_business(self, obj):
        """
        Seller account — `product.business` is presumably an
        FK to Accounts. Adjust the attribute path if your
        Product model names it differently (e.g. `owner`,
        `seller`, `business_account`).
        """
        if obj.product_id is None:
            return None
        business = getattr(obj.product, "business", None)
        if business is None:
            return None
        return AccountSummarySerializer(business).data


# ============================================================
# WRITE — STATUS TRANSITION
# ============================================================
#
# Accepts only the two values a client can trigger from the
# /deliveries/<id>/status/ endpoint. `pending` is excluded on
# purpose — deliveries start pending and never return to it,
# so the endpoint can't be used to "un-deliver" a delivery.
# `cancelled` has been removed from the status model.
# ============================================================

class DeliveryStatusUpdateSerializer(serializers.Serializer):
    """
    Input for POST /deliveries/<id>/status/

    Only the two terminal statuses a caller can trigger.
    """

    status = serializers.ChoiceField(
        choices=(
            Deliveries.STATUS_DELIVERED,
            Deliveries.STATUS_FAILED,
        ),
    )


# ============================================================
# WRITE — SUPERADMIN STATUS UPDATE
# ============================================================
#
# PATCH /deliveries/all/<id>/status/
#
# Superadmins can move a delivery to any of the remaining
# states. The transitions below are the only ones we allow —
# anything else returns 400 with a human-readable message, so
# an admin can't accidentally un-deliver a delivered row.
#
# Transition rules:
#   pending   → delivered | failed
#   delivered → (terminal — no moves)
#   failed    → pending
# ============================================================

class DeliveryAdminStatusUpdateSerializer(serializers.Serializer):
    """
    Input for PATCH /deliveries/all/<id>/status/
    """

    status = serializers.ChoiceField(
        choices=(
            Deliveries.STATUS_PENDING,
            Deliveries.STATUS_DELIVERED,
            Deliveries.STATUS_FAILED,
        ),
    )

    # Allowed source → target transitions.
    _ALLOWED = {
        Deliveries.STATUS_PENDING: {
            Deliveries.STATUS_DELIVERED,
            Deliveries.STATUS_FAILED,
        },
        Deliveries.STATUS_DELIVERED: set(),          # terminal
        Deliveries.STATUS_FAILED:    {Deliveries.STATUS_PENDING},
    }

    def validate(self, attrs):
        delivery: Deliveries = self.context["delivery"]
        new_status = attrs["status"]
        old_status = delivery.status

        if new_status == old_status:
            raise serializers.ValidationError(
                {
                    "status": (
                        f"Delivery is already '{old_status}'."
                    )
                }
            )

        if new_status not in self._ALLOWED.get(old_status, set()):
            raise serializers.ValidationError(
                {
                    "status": (
                        f"Cannot move delivery from "
                        f"'{old_status}' to '{new_status}'."
                    )
                }
            )

        return attrs