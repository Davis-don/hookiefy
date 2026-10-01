# subscription/views.py
import logging
from datetime import timedelta

from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Subscription


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _build_time_remaining(seconds: int) -> dict:
    """
    Convert a total-seconds figure into a structured countdown.
    """

    total_seconds = max(0, int(seconds))

    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")

    human = ", ".join(parts) if parts else "Less than a minute"

    short_parts = []
    if days > 0:
        short_parts.append(f"{days}d")
    if hours > 0:
        short_parts.append(f"{hours}h")
    if minutes > 0:
        short_parts.append(f"{minutes}m")

    short = " ".join(short_parts) or "<1m"

    return {
        "total_seconds": total_seconds,
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": secs,
        "human": human,
        "short": short,
    }


def _build_elapsed(seconds: int) -> dict:
    """
    Convert a total-seconds-since-expiry figure into a
    structured "how long ago" object.
    """

    total_seconds = max(0, int(seconds))

    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")

    human = ", ".join(parts) if parts else "just now"

    return {
        "total_seconds": total_seconds,
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": secs,
        "human": human,
    }


def _is_free_plan(plan) -> bool:
    if not plan:
        return False
    return (
        (plan.name or "").strip().lower() == "free"
        or (plan.slug or "").strip().lower() == "free"
    )


# ============================================================
# SUBSCRIPTION STATUS
# ============================================================
#
# Single source of truth for the frontend.
#
# Returns everything the UI might need about the user's
# subscription, including a `state` string and three
# convenience booleans (`is_free`, `is_premium_active`,
# `is_premium_expired`).
#
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    Return the authenticated user's subscription state.
    """

    user = request.user

    # --------------------------------------------------------
    # Inactive account
    # --------------------------------------------------------
    if not user.is_active:
        return Response(
            {
                "has_subscription": False,
                "state": "free",
                "is_free": True,
                "is_premium": False,
                "is_premium_active": False,
                "is_premium_expired": False,
                "is_paid": False,
                "is_active": False,
                "is_expired": False,
                "status": "no_subscription",
                "plan": None,
                "start_date": None,
                "end_date": None,
                "time_remaining": None,
                "elapsed_since_expiry": None,
                "role": user.role,
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # --------------------------------------------------------
    # No subscription on file at all
    # --------------------------------------------------------
    subscription = getattr(user, "subscription", None)

    if not subscription:
        return Response(
            {
                "has_subscription": False,
                "state": "free",
                "is_free": True,
                "is_premium": False,
                "is_premium_active": False,
                "is_premium_expired": False,
                "is_paid": False,
                "is_active": False,
                "is_expired": False,
                "status": "no_subscription",
                "plan": None,
                "start_date": None,
                "end_date": None,
                "time_remaining": None,
                "elapsed_since_expiry": None,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # Plan payload
    # --------------------------------------------------------
    plan = subscription.plan
    is_free_plan = _is_free_plan(plan)

    plan_payload = None
    if plan:
        plan_payload = {
            "id": plan.id,
            "name": plan.name,
            "slug": plan.slug,
            "price": str(plan.price),
        }

    # --------------------------------------------------------
    # Derived flags
    # --------------------------------------------------------
    is_paid = subscription.is_paid
    is_active = subscription.is_active
    is_expired = subscription.is_expired
    payment_status = subscription.status

    # --------------------------------------------------------
    # 3-state model
    #
    #   free             → no subscription, or on Free plan
    #   premium_active   → paid plan, end_date in the future
    #   premium_expired  → paid plan, end_date in the past
    # --------------------------------------------------------
    if is_free_plan or not plan:
        state = "free"
        is_premium_active = False
        is_premium_expired = False
    elif is_active:
        state = "premium_active"
        is_premium_active = True
        is_premium_expired = False
    else:
        state = "premium_expired"
        is_premium_active = False
        is_premium_expired = True

    # --------------------------------------------------------
    # Status string (kept for backwards compatibility)
    # --------------------------------------------------------
    if state == "free":
        status_str = "free"
    elif state == "premium_active":
        status_str = "active"
    elif state == "premium_expired":
        status_str = "expired"
    elif payment_status == "pending":
        status_str = "pending"
    else:
        status_str = "no_subscription"

    # --------------------------------------------------------
    # Time remaining (when active)
    # --------------------------------------------------------
    time_remaining = None
    if is_premium_active and subscription.end_date:
        delta = subscription.end_date - timezone.now()
        time_remaining = _build_time_remaining(delta.total_seconds())

    # --------------------------------------------------------
    # Elapsed since expiry (when expired)
    # --------------------------------------------------------
    elapsed_since_expiry = None
    if is_premium_expired and subscription.end_date:
        delta = timezone.now() - subscription.end_date
        elapsed_since_expiry = _build_elapsed(delta.total_seconds())

    return Response(
        {
            "has_subscription": True,
            "state": state,
            "is_free": state == "free",
            "is_premium": is_premium_active,
            "is_premium_active": is_premium_active,
            "is_premium_expired": is_premium_expired,
            "is_paid": is_paid,
            "is_active": is_active,
            "is_expired": is_expired,
            "status": status_str,
            "payment_status": payment_status,
            "plan": plan_payload,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "time_remaining": time_remaining,
            "elapsed_since_expiry": elapsed_since_expiry,
            "role": user.role,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RENEW / EXTEND SUBSCRIPTION
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def renew_subscription(request):
    """
    Extend the current user's subscription by N days.

    Body:
        {
            "days": 30
        }

    Defaults to 30 days.
    """

    user = request.user

    if not user.is_active:
        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    subscription = getattr(user, "subscription", None)

    if not subscription:
        return Response(
            {"message": "You don't have a subscription to renew."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        days = int(request.data.get("days", 30))
    except (TypeError, ValueError):
        days = 30

    if days < 1 or days > 3650:
        return Response(
            {"message": "days must be between 1 and 3650."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    now = timezone.now()

    base = (
        subscription.end_date
        if subscription.end_date and subscription.end_date > now
        else now
    )

    subscription.end_date = base + timedelta(days=days)
    subscription.save(update_fields=["end_date", "updated_at"])

    return Response(
        {
            "message": f"Subscription extended by {days} days.",
            "end_date": subscription.end_date,
            "days_remaining": subscription.days_remaining,
            "is_active": subscription.is_active,
            "is_paid": subscription.is_paid,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# PREMIUM STATUS
# ============================================================
#
# Compact endpoint for the frontend PremiumBadge and any
# component that needs to gate premium-only features.
#
# 3-state model:
#
#   "free"             → no subscription, or on Free plan.
#   "premium_active"   → paid plan, end_date in the future.
#   "premium_expired"  → paid plan, end_date in the past.
#
# Frontend can:
#   - show the trophy badge only when state === "premium_active"
#   - allow premium actions only when state === "premium_active"
#   - prompt renewal when state === "premium_expired"
#
# Returns:
#
#   {
#     "state": "free" | "premium_active" | "premium_expired",
#     "is_free": true|false,
#     "is_premium": true|false,
#     "is_premium_active": true|false,
#     "is_premium_expired": true|false,
#     "role": "serviceprovider",
#     "expires_at": "2026-11-01T13:55:00Z" | null,
#     "is_expired": true|false
#   }
#
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def premium_status(request):
    """
    Return a compact premium-status payload.

    Uses a 3-state model so the frontend can distinguish
    between free, premium active, and premium expired.
    """

    user = request.user

    # --------------------------------------------------------
    # Inactive account
    # --------------------------------------------------------
    if not user.is_active:
        return Response(
            {
                "state": "free",
                "is_free": True,
                "is_premium": False,
                "is_premium_active": False,
                "is_premium_expired": False,
                "role": user.role,
                "expires_at": None,
                "is_expired": False,
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # --------------------------------------------------------
    # No subscription
    # --------------------------------------------------------
    subscription = getattr(user, "subscription", None)

    if not subscription:
        return Response(
            {
                "state": "free",
                "is_free": True,
                "is_premium": False,
                "is_premium_active": False,
                "is_premium_expired": False,
                "role": user.role,
                "expires_at": None,
                "is_expired": False,
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # Derive flags
    # --------------------------------------------------------
    plan = subscription.plan
    is_free_plan = _is_free_plan(plan)

    is_active = subscription.is_active
    is_expired = subscription.is_expired

    # --------------------------------------------------------
    # 3-state classification
    # --------------------------------------------------------
    if is_free_plan or not plan:
        state = "free"
        is_premium_active = False
        is_premium_expired = False

    elif is_active:
        state = "premium_active"
        is_premium_active = True
        is_premium_expired = False

    else:
        state = "premium_expired"
        is_premium_active = False
        is_premium_expired = True

    logger.debug(
        "premium_status | user=%s | plan=%s | state=%s | "
        "is_free=%s | is_active=%s | is_expired=%s",
        user.email,
        plan.name if plan else None,
        state,
        is_free_plan,
        is_active,
        is_expired,
    )

    return Response(
        {
            "state": state,
            "is_free": state == "free",
            "is_premium": is_premium_active,
            "is_premium_active": is_premium_active,
            "is_premium_expired": is_premium_expired,
            "role": user.role,
            "expires_at": (
                subscription.end_date
                if is_premium_active
                else None
            ),
            "is_expired": is_expired,
        },
        status=status.HTTP_200_OK,
    )