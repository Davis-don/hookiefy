# notification/urls.py
from django.urls import path
from . import views

app_name = "notification"

urlpatterns = [
    # ============================================
    # FETCH NOTIFICATIONS
    # ============================================

    # All notifications for the current user (every category)
    # Supports ?category=hookup|payment|system|service
    #          ?is_read=true|false
    path(
        "all/",
        views.get_all_notifications,
        name="get_all_notifications",
    ),

    # Pending connection-request notifications only
    path(
        "connection-requests/",
        views.get_connection_requests,
        name="get_connection_requests",
    ),

    # Non-pending, non-rejected connection notifications
    path(
        "connection-requests-all/",
        views.get_connection_requests_all,
        name="get_connection_requests_all",
    ),

    # ============================================
    # MARK AS READ
    # ============================================

    # Mark a single notification as read (receiver only)
    path(
        "mark-read/<uuid:notification_id>/",
        views.mark_notification_read,
        name="mark_notification_read",
    ),

    # Mark every unread notification linked to a connection as read
    # Called when the user reveals the contact of a paid connection.
    path(
        "mark-connection-read/<uuid:connection_id>/",
        views.mark_connection_notifications_read,
        name="mark_connection_notifications_read",
    ),

    # Mark all PENDING connection notifications as read
    path(
        "mark-all-read/",
        views.mark_all_notifications_read,
        name="mark_all_notifications_read",
    ),

    # Mark ALL unread notifications as read (every category)
    path(
        "mark-all-read-all/",
        views.mark_all_notifications_read_all,
        name="mark_all_notifications_read_all",
    ),

    # ============================================
    # UNREAD FLAGS
    # ============================================

    # Has ANY unread notification
    path(
        "has-unread/",
        views.has_unread_notifications,
        name="has_unread_notifications",
    ),

    # Has unread activity (non-pending, non-rejected)
    path(
        "has-unread-activity/",
        views.has_unread_activity,
        name="has_unread_activity",
    ),

    # Has unread pending connection requests
    path(
        "has-unread-requests/",
        views.has_unread_connection_requests,
        name="has_unread_connection_requests",
    ),

    # Has unread notifications for PAID connections
    # → used to show the red dot on the Connections nav item
    path(
        "has-unread-paid-connections/",
        views.has_unread_paid_connections,
        name="has_unread_paid_connections",
    ),

    # ============================================
    # CONNECTIONS (COMPLETED / PAID)
    # ============================================

    # All completed/paid connections for the user
    path(
        "connections-paid/",
        views.get_paid_connections,
        name="get_paid_connections",
    ),

    # Contact details of the other party in a completed connection
    path(
        "connected-user/<uuid:connection_id>/",
        views.get_connected_user_contact,
        name="get_connected_user_contact",
    ),
]