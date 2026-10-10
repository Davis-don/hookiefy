# subscription/services.py

from django.db import models as dj_models
from django.db import transaction
from django.utils import timezone

from plans.models import Plan

from .models import Subscription


def get_active_subscription(user):
    if not user or not user.is_authenticated:
        return None

    now = timezone.now()
    return (
        Subscription.objects
        .filter(user=user)
        .filter(
            dj_models.Q(status=Subscription.STATUS_ACTIVE)
            | dj_models.Q(status=Subscription.STATUS_TRIALING)
        )
        .filter(
            dj_models.Q(end_date__isnull=True)
            | dj_models.Q(end_date__gt=now)
        )
        .select_related("plan")
        .first()
    )


def get_effective_plan(user):
    sub = get_active_subscription(user)
    if sub and sub.plan_id:
        return sub.plan
    return Plan.get_default()


@transaction.atomic
def subscribe(user, plan, *, note="", auto_renew=True):
    Subscription.objects.filter(
        user=user,
        status__in=[
            Subscription.STATUS_ACTIVE,
            Subscription.STATUS_TRIALING,
        ],
    ).update(
        status=Subscription.STATUS_CANCELLED,
        updated_at=timezone.now(),
    )

    return Subscription.objects.create(
        user=user,
        plan=plan,
        status=Subscription.STATUS_ACTIVE,
        start_date=timezone.now(),
        end_date=None,
        auto_renew=auto_renew,
        note=note or "",
    )


@transaction.atomic
def cancel_subscription(subscription, *, note=""):
    subscription.status = Subscription.STATUS_CANCELLED
    if note:
        subscription.note = note
    subscription.save(update_fields=["status", "note", "updated_at"])
    return subscription


def expire_due_subscriptions():
    now = timezone.now()
    return (
        Subscription.objects
        .filter(status=Subscription.STATUS_ACTIVE, end_date__lte=now)
        .update(status=Subscription.STATUS_EXPIRED, updated_at=now)
    )