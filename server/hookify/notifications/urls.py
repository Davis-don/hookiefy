# notifications/urls.py

from django.urls import path

from . import views


urlpatterns = [
    # ── List / count ──────────────────────────────────────
    path(
        "",
        views.list_notifications,
        name="list-notifications",
    ),
    path(
        "unread-count/",
        views.unread_count,
        name="unread-count",
    ),

    # ── Bulk actions ──────────────────────────────────────
    path(
        "read-all/",
        views.mark_all_read,
        name="mark-all-read",
    ),

    # ── Single ────────────────────────────────────────────
    path(
        "<uuid:notification_id>/",
        views.retrieve_notification,
        name="retrieve-notification",
    ),
    path(
        "<uuid:notification_id>/read/",
        views.mark_notification_read,
        name="mark-notification-read",
    ),
    path(
        "<uuid:notification_id>/unread/",
        views.mark_notification_unread,
        name="mark-notification-unread",
    ),
    path(
        "<uuid:notification_id>/delete/",
        views.delete_notification,
        name="delete-notification",
    ),
    path(
    "clear-all/",
    views.clear_all_notifications,
    name="clear-all-notifications",
),
]