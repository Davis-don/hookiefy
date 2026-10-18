# subscription/views.py

from django.db.models import Q
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from plans.models import Plan
from plans.serializers import PlanSerializer

from .models import Subscription
from .serializers import SubscriptionSerializer
from .usage_audit import (
    audit_plan_change,
    prune_to_plan,
    verify_confirmation_token,
)


# ============================================================
# CURRENT SUBSCRIPTION — GET /subscription/current/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_subscription(request):
    now = timezone.now()

    qs = (
        Subscription.objects
        .filter(user=request.user)
        .select_related("plan")
        .prefetch_related("plan__properties")
        .order_by("-created_at")
    )

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

    sub = active or (
        qs.filter(
            status__in=[
                Subscription.STATUS_EXPIRED,
                Subscription.STATUS_CANCELLED,
            ],
        ).first()
    )

    effective_plan = request.user.effective_plan

    return Response(
        {
            "subscription": SubscriptionSerializer(sub).data if sub else None,
            "effective_plan": (
                PlanSerializer(effective_plan).data
                if effective_plan else None
            ),
            "has_active_subscription": active is not None,
            "is_expired": bool(sub and sub.is_expired),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DOWNGRADE PRE-CHECK — POST /subscription/pre-check-downgrade/
# ============================================================
#
# Called by the frontend BEFORE initiating payment when the
# user has chosen a plan with lower limits than their current
# usage. Two modes:
#
#   1. No `confirmation_token` → returns an audit report.
#      - If usage fits → 200 with `ok: true`.
#      - If usage exceeds → 409 Conflict with a token + a
#        detailed breakdown of what would be deleted.
#
#   2. `confirmation_token` present → prunes overflow, then
#      returns `ok: true`. On success, the frontend then
#      calls the payment-init endpoint as normal.
#
# The view intentionally does NOT touch SubscriptionPayment.
# It's purely a content gate. Payment happens after.

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pre_check_downgrade(request):
    plan_slug = request.data.get("plan_slug")
    token = request.data.get("confirmation_token")

    if not plan_slug:
        return Response(
            {"message": "plan_slug is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_plan = Plan.objects.filter(slug=plan_slug, is_active=True).first()
    if not target_plan:
        return Response(
            {"message": f"No active plan with slug '{plan_slug}'."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # ── Mode 1: no token → audit only ──────────────────────
    if not token:
        report = audit_plan_change(request.user, target_plan)

        if report["ok"]:
            return Response(
                {**report, "requires_confirmation": False},
                status=status.HTTP_200_OK,
            )

        return Response(
            {**report, "requires_confirmation": True},
            status=status.HTTP_409_CONFLICT,
        )

    # ── Mode 2: token present → verify + prune ────────────
    if not verify_confirmation_token(request.user, target_plan, token):
        return Response(
            {
                "message": (
                    "Your content has changed since the downgrade "
                    "check. Please start over to see the updated "
                    "deletion report."
                ),
                "code": "confirmation_stale",
            },
            status=status.HTTP_409_CONFLICT,
        )

    prune_summary = prune_to_plan(request.user, target_plan)

    return Response(
        {
            "ok": True,
            "message": (
                f"Your content now fits the "
                f"{target_plan.plan_name} plan. You can "
                f"proceed to payment."
            ),
            "target_plan_slug": target_plan.slug,
            "target_plan_name": target_plan.plan_name,
            "prune_summary": prune_summary,
        },
        status=status.HTTP_200_OK,
    )