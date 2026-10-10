# subscription/serializers.py

from rest_framework import serializers

from plans.serializers import PlanSerializer

from .models import Subscription


# ============================================================
# SUBSCRIPTION — READ
# ============================================================

class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Read serializer for the current user's subscription.
    Includes nested plan info + derived time fields.
    """

    plan = PlanSerializer(read_only=True)
    plan_name = serializers.CharField(
        source="plan.plan_name",
        read_only=True,
    )

    is_current = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    effective_status = serializers.CharField(read_only=True)
    days_remaining = serializers.IntegerField(
        read_only=True,
        allow_null=True,
    )
    months_remaining = serializers.FloatField(
        read_only=True,
        allow_null=True,
    )
    duration_display = serializers.CharField(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id",
            "plan",
            "plan_name",
            "status",
            "effective_status",
            "start_date",
            "end_date",
            "is_current",
            "is_expired",
            "is_expiring_soon",
            "days_remaining",
            "months_remaining",
            "duration_display",
            "auto_renew",
            "payment_reference",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields