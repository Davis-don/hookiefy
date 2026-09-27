# subscription/views.py
from datetime import timedelta

from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Subscription


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

    human = (
        ", ".join(parts)
        if parts
        else "Less than a minute"
    )

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

    human = (
        ", ".join(parts)
        if parts
        else "just now"
    )

    return {
        "total_seconds": total_seconds,
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "seconds": secs,
        "human": human,
    }


# ============================================================
# SUBSCRIPTION STATUS
# ============================================================
#
# Single source of truth for the frontend.
#
# State is derived from the linked Payment (same pattern as
# Connection). `subscription.is_paid` reads
# `subscription.payment.status == "completed"`, and
# `subscription.is_active` requires both a completed payment
# AND `end_date > now`.
#
# Returns:
#
#   {
#     "has_subscription": true|false,
#     "is_free": true|false,
#     "is_premium": true|false,
#     "is_paid": true|false,
#     "is_active": true|false,
#     "is_expired": true|false,
#     "status": "active" | "expired" | "free" | "pending" | "no_subscription",
#     "plan": { "id", "name", "slug", "price" } | null,
#     "start_date": "...",
#     "end_date": "...",
#     "time_remaining": { ... } | null,
#     "elapsed_since_expiry": { ... } | null,
#     "role": "serviceprovider"
#   }
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
                "is_free": False,
                "is_premium": False,
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
    # Load the subscription
    # --------------------------------------------------------
    subscription = getattr(user, "subscription", None)

    # --------------------------------------------------------
    # No subscription on file at all
    # --------------------------------------------------------
    if not subscription:
        return Response(
            {
                "has_subscription": False,
                "is_free": False,
                "is_premium": False,
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

    plan_payload = None
    is_free_plan = False

    if plan:
        is_free_plan = (plan.slug or "").lower() == "free"
        plan_payload = {
            "id": plan.id,
            "name": plan.name,
            "slug": plan.slug,
            "price": str(plan.price),
        }

    # --------------------------------------------------------
    # Payment-derived status
    # --------------------------------------------------------
    #
    # `is_paid` comes straight from the linked payment.
    # `is_active` requires paid AND end_date in the future.
    # `is_expired` is true once the end_date has passed.
    # --------------------------------------------------------
    is_paid = subscription.is_paid
    is_active = subscription.is_active
    is_expired = subscription.is_expired
    payment_status = subscription.status  # "pending" / "completed" / etc.

    # --------------------------------------------------------
    # Status string
    # --------------------------------------------------------
    if is_active and is_free_plan:
        status_str = "free"
    elif is_active:
        status_str = "active"
    elif is_paid and is_expired:
        status_str = "expired"
    elif payment_status == "pending":
        status_str = "pending"
    elif is_expired:
        # Date passed but the payment was never completed
        status_str = "expired"
    else:
        status_str = "no_subscription"

    # --------------------------------------------------------
    # Time remaining (when active)
    # --------------------------------------------------------
    time_remaining = None

    if is_active and subscription.end_date:
        now = timezone.now()
        delta = subscription.end_date - now
        time_remaining = _build_time_remaining(
            delta.total_seconds()
        )

    # --------------------------------------------------------
    # Elapsed since expiry (when expired)
    # --------------------------------------------------------
    elapsed_since_expiry = None

    if is_expired and subscription.end_date:
        now = timezone.now()
        delta = now - subscription.end_date
        elapsed_since_expiry = _build_elapsed(
            delta.total_seconds()
        )

    return Response(
        {
            "has_subscription": True,
            "is_free": is_free_plan,
            "is_premium": is_active and not is_free_plan,
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
#
# Extends the end_date by N days. Useful for admin or manual
# adjustments. The proper paid flow goes through
# /payments/plan/initiate/ and creates a new Payment row.
#
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
            {
                "message": (
                    "You don't have a subscription to renew."
                ),
            },
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