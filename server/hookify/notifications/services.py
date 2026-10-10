# notifications/services.py

import logging
from datetime import timedelta

from django.utils import timezone

from .models import Notification


logger = logging.getLogger(__name__)


# ============================================================
# SINGLE
# ============================================================

def notify(
    *,
    recipient,
    title,
    body="",
    category=Notification.CATEGORY_SYSTEM,
    severity=Notification.SEVERITY_INFO,
    actor=None,
    action_label="",
    action_url="",
    metadata=None,
    expires_in_days=None,
):
    """
    Create a single notification.

    Returns the Notification instance.

    Example:
        notify(
            recipient=user,
            title="Payment received",
            body="Your subscription is now active.",
            category=Notification.CATEGORY_PAYMENT,
            severity=Notification.SEVERITY_SUCCESS,
            action_label="View billing",
            action_url="/useraccount/billing",
            metadata={"payment_id": str(payment.id)},
        )
    """

    if recipient is None:
        logger.warning(
            "notify() called with no recipient — skipping."
        )
        return None

    expires_at = None
    if expires_in_days is not None:
        expires_at = timezone.now() + timedelta(
            days=expires_in_days
        )

    notif = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        title=title,
        body=body,
        category=category,
        severity=severity,
        action_label=action_label,
        action_url=action_url,
        metadata=metadata,
        expires_at=expires_at,
    )

    logger.info(
        "Notification sent | recipient=%s | category=%s | title=%s",
        recipient.pk,
        category,
        title,
    )

    return notif


# ============================================================
# MANY
# ============================================================

def notify_many(
    *,
    recipients,
    title,
    body="",
    category=Notification.CATEGORY_SYSTEM,
    severity=Notification.SEVERITY_INFO,
    actor=None,
    action_label="",
    action_url="",
    metadata=None,
    expires_in_days=None,
):
    """
    Bulk-create the same notification for many recipients.

    Returns the list of created Notification rows.
    """

    expires_at = None
    if expires_in_days is not None:
        expires_at = timezone.now() + timedelta(
            days=expires_in_days
        )

    rows = [
        Notification(
            recipient=r,
            actor=actor,
            title=title,
            body=body,
            category=category,
            severity=severity,
            action_label=action_label,
            action_url=action_url,
            metadata=metadata,
            expires_at=expires_at,
        )
        for r in recipients
        if r is not None
    ]

    created = Notification.objects.bulk_create(rows)

    logger.info(
        "Bulk notification sent | count=%s | category=%s | title=%s",
        len(created),
        category,
        title,
    )

    return created