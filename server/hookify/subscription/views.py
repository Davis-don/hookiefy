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
    Response:
        {
            "subscription": { ... } | null,
            "effective_plan": { ...plan... } | null,
            "has_active_subscription": bool,
        }
    """

    now = timezone.now()

    sub = (
        Subscription.objects
        .filter(user=request.user)
        .filter(status__in=[
            Subscription.STATUS_ACTIVE,
            Subscription.STATUS_TRIALING,
        ])
        .filter(Q(end_date__isnull=True) | Q(end_date__gt=now))
        .select_related("plan")
        .prefetch_related("plan__properties")
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
            "has_active_subscription": sub is not None,
        },
        status=status.HTTP_200_OK,
    )