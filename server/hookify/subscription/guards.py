# subscription/guards.py

from functools import wraps

from django.utils import timezone

from rest_framework import status
from rest_framework.response import Response


def _get_effective_plan(user):
    try:
        return user.effective_plan
    except Exception:
        return None


def user_has_expired_subscription(user):
    """
    True when the user has a subscription row AND its
    effective status is 'expired'.
    """
    from subscription.models import Subscription

    if not user or not user.is_authenticated:
        return False

    sub = (
        Subscription.objects
        .filter(user=user)
        .order_by("-created_at")
        .first()
    )

    if not sub:
        return False

    return sub.effective_status == Subscription.STATUS_EXPIRED


def user_is_blocked(user):
    return user_has_expired_subscription(user)


def requires_active_subscription(view_func):
    """
    Refuse with 403 when the caller's subscription is expired.

    Apply directly under @permission_classes so `request.user`
    is populated:

        @api_view(["POST"])
        @permission_classes([IsAuthenticated])
        @requires_active_subscription
        def my_write_view(request):
            ...
    """

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = getattr(request, "user", None)

        if user_is_blocked(user):
            return Response(
                {
                    "message": (
                        "Your subscription has expired. "
                        "Renew your plan to continue."
                    ),
                    "code": "subscription_expired",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return view_func(request, *args, **kwargs)

    return wrapper