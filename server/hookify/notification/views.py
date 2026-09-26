# notification/views.py
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
from django.db.models import Q

from notification.models import Notification
from notification.serializers import NotificationSerializer
from connections.models import Connection

User = get_user_model()


# ============================================
# INTERNAL HELPERS
# ============================================

def _paginate(request, queryset, default_size=20):
    """Shared pagination helper."""
    page = request.GET.get("page", 1)
    page_size = request.GET.get("page_size", default_size)

    try:
        page = int(page)
        page_size = int(page_size)
        if page_size > 100:
            page_size = 100
    except (TypeError, ValueError):
        page = 1
        page_size = default_size

    paginator = Paginator(queryset, page_size)
    try:
        page_obj = paginator.page(page)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)

    return page_obj, paginator, page, page_size


def _serialize_list(request, queryset_page):
    """
    Serialize a page of notifications via NotificationSerializer,
    passing request so `connected_user_*` can be computed.
    """
    return NotificationSerializer(
        queryset_page,
        many=True,
        context={"request": request},
    ).data


# ============================================
# FETCH CONNECTION REQUEST NOTIFICATIONS (PENDING ONLY)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_connection_requests(request):
    """
    Fetch pending connection-request notifications for the current
    user. A connection is "pending" when its linked payment is
    pending or when no payment has been linked yet.
    """

    user = request.user

    notifications = (
        Notification.objects.filter(
            receiver=user,
            category=Notification.CATEGORY_HOOKUP,
        )
        .filter(
            Q(connection__payment__status="pending") |
            Q(connection__payment__isnull=True)
        )
        .select_related(
            "sender",
            "receiver",
            "connection",
            "connection__sender",
            "connection__receiver",
            "connection__payment",
        )
        .order_by("-created_at")
    )

    total_count = notifications.count()
    unread_count = notifications.filter(is_read=False).count()

    page_obj, paginator, page, page_size = _paginate(request, notifications)

    return Response(
        {
            "message": "Pending connection requests fetched successfully",
            "count": paginator.count,
            "total_count": total_count,
            "unread_count": unread_count,
            "page": page,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "data": _serialize_list(request, page_obj),
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# FETCH ALL CONNECTION NOTIFICATIONS (NON-PENDING)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_connection_requests_all(request):
    """
    Fetch all hookup-related notifications for the current user
    where the linked payment has moved past pending (i.e. it is
    either completed, failed, or cancelled).
    """

    user = request.user

    notifications = (
        Notification.objects.filter(
            receiver=user,
            category=Notification.CATEGORY_HOOKUP,
            connection__isnull=False,
            connection__payment__isnull=False,
        )
        .exclude(connection__payment__status="pending")
        .select_related(
            "sender",
            "receiver",
            "connection",
            "connection__sender",
            "connection__receiver",
            "connection__payment",
        )
        .order_by("-created_at")
    )

    total_count = notifications.count()
    unread_count = notifications.filter(is_read=False).count()

    status_counts = {}
    for key in ("completed", "failed", "cancelled"):
        count = notifications.filter(
            connection__payment__status=key
        ).count()
        if count > 0:
            status_counts[key] = count

    page_obj, paginator, page, page_size = _paginate(request, notifications)

    return Response(
        {
            "message": "All connection notifications fetched successfully",
            "count": paginator.count,
            "total_count": total_count,
            "unread_count": unread_count,
            "status_breakdown": status_counts,
            "page": page,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "data": _serialize_list(request, page_obj),
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# FETCH ALL NOTIFICATIONS (EVERY CATEGORY)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_notifications(request):
    """
    Fetch ALL notifications belonging to the current authenticated user.

    Optional query params:
        ?category=hookup|payment|system|service
        ?is_read=true|false
    """

    user = request.user

    qs = Notification.objects.filter(receiver=user).select_related(
        "sender",
        "receiver",
        "connection",
        "connection__sender",
        "connection__receiver",
        "connection__payment",
    )

    category = request.GET.get("category")
    if category:
        qs = qs.filter(category=category)

    is_read = request.GET.get("is_read")
    if is_read is not None:
        qs = qs.filter(is_read=is_read.lower() == "true")

    qs = qs.order_by("-created_at")

    total_count = qs.count()
    unread_count = qs.filter(is_read=False).count()

    page_obj, paginator, page, page_size = _paginate(request, qs)

    return Response(
        {
            "message": "Notifications fetched successfully",
            "count": paginator.count,
            "total_count": total_count,
            "unread_count": unread_count,
            "page": page,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
            "data": _serialize_list(request, page_obj),
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# MARK A SINGLE NOTIFICATION AS READ
# ============================================

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Mark a specific notification as read.
    Only the receiver can mark their own notification.
    """

    user = request.user

    try:
        notification = Notification.objects.get(
            notification_id=notification_id,
            receiver=user,
        )
    except Notification.DoesNotExist:
        return Response(
            {
                "message": "Notification not found",
                "error": (
                    "The specified notification does not exist "
                    "or does not belong to you."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    notification.mark_as_read()

    return Response(
        {
            "message": "Notification marked as read",
            "notification_id": str(notification.notification_id),
            "is_read": notification.is_read,
            "read_at": notification.read_at,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# MARK A NOTIFICATION AS READ BY CONNECTION
# ============================================
#
# Used by the frontend: when the user actually opens (reveals) the
# contact for a paid connection, we mark the corresponding
# notification(s) as read.
#
# This is the endpoint the "Reveal contact" flow calls.

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def mark_connection_notifications_read(request, connection_id):
    """
    Mark every unread notification for the current user that is
    linked to the given connection as read.

    Called by the frontend when the user reveals the contact of a
    paid connection.
    """

    user = request.user

    # ---------- Make sure the connection exists ----------
    try:
        connection = Connection.objects.get(
            connection_id=connection_id
        )
    except Connection.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Connection not found",
                "error": "Invalid connection ID",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # ---------- The caller must be part of the connection ----------
    if (
        connection.sender_id != user.id
        and connection.receiver_id != user.id
    ):
        return Response(
            {
                "success": False,
                "message": "Permission denied",
                "error": "You are not part of this connection",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ---------- Mark all unread notifications for this connection ----------
    updated_count = Notification.objects.filter(
        receiver=user,
        connection=connection,
        is_read=False,
    ).update(is_read=True, read_at=timezone.now())

    return Response(
        {
            "success": True,
            "message": f"{updated_count} notification(s) marked as read",
            "updated_count": updated_count,
            "connection_id": str(connection.connection_id),
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# MARK ALL PENDING CONNECTION NOTIFICATIONS AS READ
# ============================================

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """
    Mark all PENDING connection notifications as read for the
    current user.
    """

    user = request.user

    updated_count = (
        Notification.objects.filter(
            receiver=user,
            category=Notification.CATEGORY_HOOKUP,
            is_read=False,
        )
        .filter(
            Q(connection__payment__status="pending") |
            Q(connection__payment__isnull=True)
        )
        .update(is_read=True, read_at=timezone.now())
    )

    return Response(
        {
            "message": f"{updated_count} notifications marked as read",
            "updated_count": updated_count,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# MARK ALL NOTIFICATIONS AS READ (EVERY CATEGORY)
# ============================================

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read_all(request):
    """
    Mark ALL unread notifications as read for the current user.
    """

    user = request.user

    updated_count = Notification.objects.filter(
        receiver=user,
        is_read=False,
    ).update(is_read=True, read_at=timezone.now())

    return Response(
        {
            "message": f"{updated_count} notifications marked as read",
            "updated_count": updated_count,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# HAS UNREAD NOTIFICATIONS (ANY CATEGORY)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def has_unread_notifications(request):
    """
    Check if the current user has ANY unread notifications.
    Connections whose payment was cancelled or failed are excluded.
    """

    user = request.user

    qs = (
        Notification.objects.filter(
            receiver=user,
            is_read=False,
        )
        .exclude(connection__payment__status__in=["cancelled", "failed"])
    )

    has_unread = qs.exists()
    unread_count = qs.count() if has_unread else 0

    return Response(
        {
            "has_unread": has_unread,
            "unread_count": unread_count,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# HAS UNREAD ACTIVITY (NON-PENDING)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def has_unread_activity(request):
    """
    Check if the user has any unread hookup notifications whose
    payment is no longer pending.
    """

    user = request.user

    qs = (
        Notification.objects.filter(
            receiver=user,
            category=Notification.CATEGORY_HOOKUP,
            is_read=False,
            connection__payment__isnull=False,
        )
        .exclude(connection__payment__status="pending")
        .exclude(
            connection__payment__status__in=["cancelled", "failed"]
        )
    )

    has_unread = qs.exists()
    unread_count = qs.count() if has_unread else 0

    return Response(
        {
            "has_unread_activity": has_unread,
            "unread_count": unread_count,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# HAS UNREAD CONNECTION REQUESTS
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def has_unread_connection_requests(request):
    """
    Check if the user has any unread PENDING connection-request
    notifications (linked payment is pending, or no payment yet).
    """

    user = request.user

    qs = (
        Notification.objects.filter(
            receiver=user,
            category=Notification.CATEGORY_HOOKUP,
            is_read=False,
        )
        .filter(
            Q(connection__payment__status="pending") |
            Q(connection__payment__isnull=True)
        )
    )

    has_unread = qs.exists()
    unread_count = qs.count() if has_unread else 0

    return Response(
        {
            "has_unread_connection_requests": has_unread,
            "unread_count": unread_count,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# HAS UNREAD PAID-CONNECTION NOTIFICATIONS  ← NEW
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def has_unread_paid_connections(request):
    """
    Returns True when the current user has at least one unread
    notification whose linked connection's payment is COMPLETED.

    This is what the frontend uses to show a red dot on the
    "Connections" nav item — telling the user there is a paid
    contact they haven't opened yet.

    Also returns the list of connection ids so the UI can
    optionally deep-link.
    """

    user = request.user

    qs = Notification.objects.filter(
        receiver=user,
        is_read=False,
        connection__isnull=False,
        connection__payment__status="completed",
    )

    unread_count = qs.count()

    # Distinct connection ids for the unread paid notifications
    connection_ids = list(
        qs.values_list(
            "connection__connection_id", flat=True
        ).distinct()
    )

    return Response(
        {
            "has_unread": unread_count > 0,
            "unread_count": unread_count,
            "connection_ids": [str(cid) for cid in connection_ids],
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# FETCH PAID/CONNECTED USER CONTACT DETAILS
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_connected_user_contact(request, connection_id):
    """
    Fetch the OTHER party's contact details for a COMPLETED
    connection (i.e. its linked payment is completed).
    """

    user = request.user

    try:
        connection = Connection.objects.select_related(
            "sender",
            "receiver",
            "payment",
            "service",
        ).get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response(
            {
                "message": "Connection not found",
                "error": "Invalid connection ID",
                "status": "failed",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    if (
        connection.sender_id != user.id
        and connection.receiver_id != user.id
    ):
        return Response(
            {
                "message": "Permission denied",
                "error": "You are not part of this connection",
                "status": "failed",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if not connection.is_paid:
        return Response(
            {
                "message": "Connection not completed",
                "error": (
                    "Contact details are only available for "
                    "completed connections"
                ),
                "status": connection.status,
                "status_display": connection.status_display,
                "is_paid": False,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    if connection.sender_id == user.id:
        connected_user = connection.receiver
        user_role = "sender"
    else:
        connected_user = connection.sender
        user_role = "receiver"

    response_data = {
        "connection_id": str(connection.connection_id),
        "source": connection.source,
        "status": connection.status,
        "status_display": connection.status_display,
        "is_paid": connection.is_paid,
        "created_at": connection.created_at,
        "updated_at": connection.updated_at,
        "user_role": user_role,
        "connected_user": {
            "id": connected_user.id,
            "email": connected_user.email,
            "full_name": connected_user.full_name,
            "first_name": connected_user.first_name,
            "last_name": connected_user.last_name,
            "phone_number": connected_user.phone_number,
            "gender": getattr(connected_user, "gender", None),
            "profile_image_url": connected_user.profile_image_url,
            "has_profile_image": getattr(
                connected_user, "has_profile_image", None
            ),
        },
        "contact_details": {
            "phone_number": connected_user.phone_number,
            "email": connected_user.email,
            "full_name": connected_user.full_name,
        },
    }

    return Response(
        {
            "message": "Contact details fetched successfully",
            "data": response_data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================
# FETCH ALL COMPLETED CONNECTIONS
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_paid_connections(request):
    """
    Fetch all COMPLETED connections for the current user.
    Each includes the connected user's contact details.
    """

    user = request.user

    connections = (
        Connection.objects.filter(
            Q(sender=user) | Q(receiver=user),
            payment__status="completed",
        )
        .select_related("sender", "receiver", "payment", "service")
        .order_by("-updated_at")
    )

    response_data = []
    for connection in connections:
        if connection.sender_id == user.id:
            connected_user = connection.receiver
            user_role = "sender"
        else:
            connected_user = connection.sender
            user_role = "receiver"

        response_data.append(
            {
                "connection_id": str(connection.connection_id),
                "source": connection.source,
                "status": connection.status,
                "status_display": connection.status_display,
                "is_paid": connection.is_paid,
                "created_at": connection.created_at,
                "updated_at": connection.updated_at,
                "user_role": user_role,
                "connected_user": {
                    "id": connected_user.id,
                    "email": connected_user.email,
                    "full_name": connected_user.full_name,
                    "first_name": connected_user.first_name,
                    "last_name": connected_user.last_name,
                    "phone_number": connected_user.phone_number,
                    "gender": getattr(connected_user, "gender", None),
                    "profile_image_url": connected_user.profile_image_url,
                    "has_profile_image": getattr(
                        connected_user, "has_profile_image", None
                    ),
                },
                "preview_message": (
                    "✅ Connection completed! View contact details "
                    f"for {connected_user.full_name}"
                ),
                "contact_details": {
                    "phone_number": connected_user.phone_number,
                    "email": connected_user.email,
                    "full_name": connected_user.full_name,
                },
            }
        )

    return Response(
        {
            "message": "Completed connections fetched successfully",
            "count": len(response_data),
            "total_count": len(response_data),
            "data": response_data,
        },
        status=status.HTTP_200_OK,
    )