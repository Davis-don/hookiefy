# subscription_payment/serializers.py
from rest_framework import serializers

from account.models import Accounts
from plans.models import Plan
from subscription.models import Subscription

from .models import SubscriptionPayment


# ============================================================
# INPUT — PLAN PAYMENT INITIATION
# ============================================================

class PlanPaymentInitiationSerializer(serializers.Serializer):
    """
    Validates the body for POST /subscription_payments/plan/initiate/
    """

    plan_id = serializers.IntegerField(required=True)
    phone_number = serializers.CharField(
        max_length=20,
        required=True,
    )

    def validate_plan_id(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "plan_id must be a positive integer."
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
                "Invalid phone number format."
            )
        if len(cleaned) < 9 or len(cleaned) > 15:
            raise serializers.ValidationError(
                "Phone number must be 9–15 digits."
            )
        return value


# ============================================================
# OUTPUT — PLAN MINI
# ============================================================

class PlanMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "slug",
            "price",
            "description",
            "is_active",
            "display_order",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — USER MINI
# ============================================================

class UserMiniSerializer(serializers.ModelSerializer):

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
            "profile_image_url",
            "has_profile_image",
            "role",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — SUBSCRIPTION PAYMENT MINI (for use inside Subscription)
# ============================================================

class SubscriptionPaymentMiniSerializer(serializers.ModelSerializer):
    """
    Compact shape used to embed the *linked* SubscriptionPayment
    inside the Subscription payload.
    """

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    gateway_display = serializers.CharField(
        source="get_gateway_display",
        read_only=True,
    )

    class Meta:
        model = SubscriptionPayment
        fields = [
            "id",
            "subscription_payment_id",
            "merchant_reference",
            "order_tracking_id",
            "status",
            "status_display",
            "amount",
            "gateway",
            "gateway_display",
            "paid_at",
            "created_at",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — SUBSCRIPTION MINI
# ============================================================

class SubscriptionMiniSerializer(serializers.ModelSerializer):
    """
    Compact representation of a Subscription.

    All status booleans are DERIVED from the linked
    SubscriptionPayment via the model's properties.
    """

    plan = PlanMiniSerializer(read_only=True)

    # Derived from the linked SubscriptionPayment
    payment = SubscriptionPaymentMiniSerializer(read_only=True)

    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(read_only=True)

    is_paid = serializers.BooleanField(read_only=True)
    is_pending = serializers.BooleanField(read_only=True)
    is_failed = serializers.BooleanField(read_only=True)
    is_cancelled = serializers.BooleanField(read_only=True)

    is_active = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    days_remaining = serializers.IntegerField(read_only=True)
    seconds_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "plan",
            "payment",
            "start_date",
            "end_date",
            "status",
            "status_display",
            "is_paid",
            "is_pending",
            "is_failed",
            "is_cancelled",
            "is_active",
            "is_expired",
            "days_remaining",
            "seconds_remaining",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — SUBSCRIPTION PAYMENT (FULL)
# ============================================================

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    """
    Full representation of a SubscriptionPayment.

    Nested:
      - user_details          (the payer)
      - plan_details          (the plan being purchased)
      - subscription_details  (the subscription this payment is for)
    """

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    gateway_display = serializers.CharField(
        source="get_gateway_display",
        read_only=True,
    )

    user_details = UserMiniSerializer(
        source="user",
        read_only=True,
    )
    plan_details = PlanMiniSerializer(
        source="plan",
        read_only=True,
    )
    subscription_details = SubscriptionMiniSerializer(
        source="subscription",
        read_only=True,
    )

    is_completed = serializers.BooleanField(read_only=True)
    is_pending = serializers.BooleanField(read_only=True)
    is_failed = serializers.BooleanField(read_only=True)
    is_cancelled = serializers.BooleanField(read_only=True)
    is_terminal = serializers.BooleanField(read_only=True)

    class Meta:
        model = SubscriptionPayment
        fields = [
            # Identifiers
            "id",
            "subscription_payment_id",
            "merchant_reference",
            "order_tracking_id",

            # Core payment state
            "status",
            "status_display",
            "amount",
            "phone_number",
            "gateway",
            "gateway_display",

            # Raw FK ids
            "user",
            "plan",
            "subscription",

            # Nested details
            "user_details",
            "plan_details",
            "subscription_details",

            # Timestamps
            "paid_at",
            "created_at",
            "updated_at",

            # Derived booleans
            "is_completed",
            "is_pending",
            "is_failed",
            "is_cancelled",
            "is_terminal",
        ]
        read_only_fields = fields


# ============================================================
# OUTPUT — RECONCILE / LIVE STATUS POLL
# ============================================================

class ReconcileSubscriptionPaymentSerializer(serializers.Serializer):
    """
    Response shape for:
      GET /subscription_payments/reconcile/<id>/
      GET /subscription_payments/status/<id>/
    """

    payment = SubscriptionPaymentSerializer(read_only=True)
    subscription = SubscriptionMiniSerializer(
        read_only=True,
        allow_null=True,
    )
    is_terminal = serializers.BooleanField(read_only=True)