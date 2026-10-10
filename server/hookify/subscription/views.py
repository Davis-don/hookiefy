# subscription/views.py

from django.db.models import Q
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from plans.serializers import PlanSerializer

from .models import Subscription
from .serializers import SubscriptionSerializer


# ============================================================
# CURRENT SUBSCRIPTION — GET /subscription/current/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_subscription(request):
    """
    Return the user's current subscription — INCLUDING an
    expired one. The Billing tab needs to see expired
    subscriptions so it can show the "Expired — Renew" state.

    Priority:
        1. Active subscription (status=active, not expired)
        2. Trialing subscription (status=trialing, not expired)
        3. Most recent expired subscription
        4. Most recent cancelled subscription
        5. None → fall back to the default plan

    Response:
        {
            "subscription": { ... } | null,
            "effective_plan": { ...plan... } | null,
            "has_active_subscription": bool,
            "is_expired": bool,
        }
    """

    now = timezone.now()

    qs = (
        Subscription.objects
        .filter(user=request.user)
        .select_related("plan")
        .prefetch_related("plan__properties")
        .order_by("-created_at")
    )

    # 1. Try to find an active one.
    active = (
        qs.filter(
            status__in=[
                Subscription.STATUS_ACTIVE,
                Subscription.STATUS_TRIALING,
            ],
        )
        .filter(Q(end_date__isnull=True) | Q(end_date__gt=now))
        .first()
    )

    sub = active

    # 2. If nothing active, fall back to the most recent
    #    expired/cancelled row so the UI can show its state.
    if sub is None:
        sub = (
            qs.filter(
                status__in=[
                    Subscription.STATUS_EXPIRED,
                    Subscription.STATUS_CANCELLED,
                ],
            )
            .first()
        )

    effective_plan = request.user.effective_plan

    return Response(
        {
            "subscription": (
                SubscriptionSerializer(sub).data if sub else None
            ),
            "effective_plan": (
                PlanSerializer(effective_plan).data
                if effective_plan else None
            ),
            "has_active_subscription": active is not None,
            "is_expired": bool(sub and sub.is_expired),
        },
        status=status.HTTP_200_OK,
    )