# subscription_payment/serializers.py

from rest_framework import serializers

from plans.models import Plan
from .models import SubscriptionPayment


# ============================================================
# INPUT — INITIATE PAYMENT
# ============================================================

class InitiatePaymentSerializer(serializers.Serializer):
    """
    Input for POST /subscription_payments/initiate/

    - plan_slug: which plan the user is buying
    - phone:    optional, for the PesaPal billing block
    """

    plan_slug = serializers.SlugField()

    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )

    def validate_plan_slug(self, value):
        try:
            plan = Plan.objects.get(slug=value, is_active=True)
        except Plan.DoesNotExist:
            raise serializers.ValidationError(
                "Plan not found or inactive."
            )
        self._plan = plan
        return value

    @property
    def plan(self):
        return getattr(self, "_plan", None)


# ============================================================
# OUTPUT — PAYMENT ROW
# ============================================================

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    """
    Read serializer for a payment row.
    """

    plan_name = serializers.CharField(
        source="plan.plan_name",
        read_only=True,
        allow_null=True,
    )

    plan_slug = serializers.CharField(
        source="plan.slug",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = SubscriptionPayment
        fields = (
            "id",
            "merchant_reference",
            "order_tracking_id",
            "gateway",
            "status",
            "amount",
            "currency",
            "phone_number",
            "email",
            "plan",
            "plan_name",
            "plan_slug",
            "confirmation_code",
            "payment_method",
            "payment_account",
            "error_message",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# OUTPUT — INITIATE RESPONSE
# ============================================================

class InitiatePaymentResponseSerializer(serializers.Serializer):
    """
    Response returned by the initiate endpoint.
    """

    message = serializers.CharField()
    payment = SubscriptionPaymentSerializer()
    redirect_url = serializers.URLField()