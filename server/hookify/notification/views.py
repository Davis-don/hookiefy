from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
from django.db.models import Q

from notification.models import Notification
from connections.models import Connection
from .serializers import NotificationSerializer

User = get_user_model()

# ============================================
# FETCH CONNECTION REQUEST NOTIFICATIONS (PENDING ONLY)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_requests(request):
    """
    Fetch all connection request notifications for the current authenticated user.
    Only returns notifications of type 'connection_request' where the connection status is 'PENDING'.
    """
    
    # Get the current authenticated user
    user = request.user
    
    print("=" * 60)
    print("📩 FETCHING PENDING CONNECTION REQUESTS")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    # Fetch all connection request notifications for this user
    # Only where connection status is PENDING
    notifications = Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.CONNECTION_REQUEST,
        connection__status='PENDING'  # Only get notifications with PENDING status
    ).select_related('connection', 'connection__sender', 'connection__receiver')
    
    # Order by created_at descending (newest first)
    notifications = notifications.order_by('-created_at')
    
    # Get count
    total_count = notifications.count()
    unread_count = notifications.filter(is_read=False).count()
    
    print(f"📊 Total pending connection requests: {total_count}")
    print(f"📊 Unread pending connection requests: {unread_count}")
    print("=" * 60)
    
    # Pagination parameters
    page = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 20)
    
    try:
        page = int(page)
        page_size = int(page_size)
        if page_size > 100:
            page_size = 100
    except ValueError:
        page = 1
        page_size = 20
    
    # Paginate
    paginator = Paginator(notifications, page_size)
    total_pages = paginator.num_pages
    total_count_paginated = paginator.count
    
    try:
        notifications_page = paginator.page(page)
    except PageNotAnInteger:
        notifications_page = paginator.page(1)
    except EmptyPage:
        notifications_page = paginator.page(paginator.num_pages)
    
    # Iterate and build response
    response_data = []
    for notification in notifications_page:
        notification_dict = {
            "notification_id": str(notification.notification_id),
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "notification_type_display": notification.get_notification_type_display(),
            "is_read": notification.is_read,
            "read_at": notification.read_at,
            "created_at": notification.created_at,
            "connection": {
                "connection_id": str(notification.connection.connection_id) if notification.connection else None,
                "status": notification.connection.status if notification.connection else None,
                "status_display": notification.connection.get_status_display() if notification.connection else None,
                "created_at": notification.connection.created_at if notification.connection else None,
            },
            "sender": {
                "id": notification.connection.sender.id if notification.connection else None,
                "email": notification.connection.sender.email if notification.connection else None,
                "full_name": notification.connection.sender.full_name if notification.connection else None,
                "profile_image_url": notification.connection.sender.profile_image_url if notification.connection else None,
            },
            "receiver": {
                "id": notification.connection.receiver.id if notification.connection else None,
                "email": notification.connection.receiver.email if notification.connection else None,
                "full_name": notification.connection.receiver.full_name if notification.connection else None,
                "profile_image_url": notification.connection.receiver.profile_image_url if notification.connection else None,
            }
        }
        response_data.append(notification_dict)
    
    return Response({
        "message": "Pending connection requests fetched successfully",
        "count": total_count_paginated,
        "total_count": total_count,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": notifications_page.has_next(),
        "has_previous": notifications_page.has_previous(),
        "data": response_data
    }, status=status.HTTP_200_OK)


# ============================================
# FETCH ALL CONNECTION NOTIFICATIONS (EXCLUDING PENDING - ONLY OTHER USER'S ACTIONS)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_requests_all(request):
    """
    Fetch all connection notifications for the current authenticated user.
    Returns all connection-related notifications (CONNECTION_REQUEST, CONNECTION_ACCEPTED, CONNECTION_REJECTED, CONNECTION_COMPLETED)
    where the connection status is NOT 'PENDING'.
    
    CRITICAL: Only returns activities where the OTHER user took action.
    The current user's own actions (accepting/rejecting) are EXCLUDED.
    """
    
    # Get the current authenticated user
    user = request.user
    
    print("=" * 60)
    print("📩 FETCHING ACTIVITY (OTHER USER'S ACTIONS ONLY)")
    print("=" * 60)
    print(f"👤 Current User ID: {user.id}")
    print(f"👤 Current User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    # Fetch ALL connection-related notification types
    connection_notification_types = [
        Notification.NotificationType.CONNECTION_REQUEST,
        Notification.NotificationType.CONNECTION_ACCEPTED,
        Notification.NotificationType.CONNECTION_REJECTED,
        Notification.NotificationType.CONNECTION_COMPLETED,
    ]
    
    # Get notifications where the OTHER user took action
    # This means:
    # 1. Current user is the receiver -> Other user (sender) sent/requested/accepted/rejected
    # 2. Current user is the sender -> Other user (receiver) accepted/rejected
    
    # For CONNECTION_ACCEPTED, CONNECTION_REJECTED, CONNECTION_COMPLETED:
    # The action_taker is the one who changed the status (not the current user)
    
    notifications = Notification.objects.filter(
        user=user,
        notification_type__in=connection_notification_types,
        connection__isnull=False
    ).filter(
        # Only include connections where the OTHER user took action
        # This is determined by checking who the notification is for (user=current user)
        # and the action was taken by the other party
        Q(
            # Scenario: Current user is the receiver
            # Other user (sender) sent a request or took action
            Q(connection__receiver=user) &
            ~Q(notification_type=Notification.NotificationType.CONNECTION_REQUEST)  # Exclude initial request sent by sender
        ) |
        Q(
            # Scenario: Current user is the sender
            # Other user (receiver) accepted or rejected
            Q(connection__sender=user) &
            Q(
                Q(notification_type=Notification.NotificationType.CONNECTION_ACCEPTED) |
                Q(notification_type=Notification.NotificationType.CONNECTION_REJECTED) |
                Q(notification_type=Notification.NotificationType.CONNECTION_COMPLETED)
            )
        )
    ).exclude(
        connection__status='PENDING'
    ).select_related('connection', 'connection__sender', 'connection__receiver')
    
    # Order by created_at descending (newest first)
    notifications = notifications.order_by('-created_at')
    
    # Get count
    total_count = notifications.count()
    unread_count = notifications.filter(is_read=False).count()
    
    print(f"📊 Total activities (other user's actions): {total_count}")
    print(f"📊 Unread activities: {unread_count}")
    
    # Log breakdown
    status_counts = {}
    for status_choice in Connection.Status.choices:
        status_key = status_choice[0]
        count = notifications.filter(connection__status=status_key).count()
        if count > 0:
            status_counts[status_key] = count
    
    print(f"📊 Status breakdown: {status_counts}")
    
    type_counts = {}
    for type_choice in Notification.NotificationType.choices:
        type_key = type_choice[0]
        count = notifications.filter(notification_type=type_key).count()
        if count > 0:
            type_counts[type_key] = count
    
    print(f"📊 Notification type breakdown: {type_counts}")
    
    # Log which users took action
    action_takers = set()
    for notification in notifications:
        if notification.connection:
            if notification.connection.sender.id != user.id:
                action_takers.add(notification.connection.sender.full_name)
            elif notification.connection.receiver.id != user.id:
                action_takers.add(notification.connection.receiver.full_name)
    
    print(f"📊 Action takers: {action_takers}")
    print("=" * 60)
    
    # Pagination parameters
    page = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 20)
    
    try:
        page = int(page)
        page_size = int(page_size)
        if page_size > 100:
            page_size = 100
    except ValueError:
        page = 1
        page_size = 20
    
    # Paginate
    paginator = Paginator(notifications, page_size)
    total_pages = paginator.num_pages
    total_count_paginated = paginator.count
    
    try:
        notifications_page = paginator.page(page)
    except PageNotAnInteger:
        notifications_page = paginator.page(1)
    except EmptyPage:
        notifications_page = paginator.page(paginator.num_pages)
    
    # Iterate and build response
    response_data = []
    for notification in notifications_page:
        # Determine who took the action (should always be the other user)
        action_taken_by = None
        action_taker_name = None
        
        if notification.connection:
            # If the sender is NOT the current user, the sender took action
            if notification.connection.sender.id != user.id:
                action_taken_by = "sender"
                action_taker_name = notification.connection.sender.full_name
            # If the receiver is NOT the current user, the receiver took action
            elif notification.connection.receiver.id != user.id:
                action_taken_by = "receiver"
                action_taker_name = notification.connection.receiver.full_name
        
        notification_dict = {
            "notification_id": str(notification.notification_id),
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "notification_type_display": notification.get_notification_type_display(),
            "is_read": notification.is_read,
            "read_at": notification.read_at,
            "created_at": notification.created_at,
            "connection": {
                "connection_id": str(notification.connection.connection_id) if notification.connection else None,
                "status": notification.connection.status if notification.connection else None,
                "status_display": notification.connection.get_status_display() if notification.connection else None,
                "created_at": notification.connection.created_at if notification.connection else None,
            },
            "sender": {
                "id": notification.connection.sender.id if notification.connection else None,
                "email": notification.connection.sender.email if notification.connection else None,
                "full_name": notification.connection.sender.full_name if notification.connection else None,
                "profile_image_url": notification.connection.sender.profile_image_url if notification.connection else None,
            },
            "receiver": {
                "id": notification.connection.receiver.id if notification.connection else None,
                "email": notification.connection.receiver.email if notification.connection else None,
                "full_name": notification.connection.receiver.full_name if notification.connection else None,
                "profile_image_url": notification.connection.receiver.profile_image_url if notification.connection else None,
            },
            "action_taken_by": action_taken_by,
            "action_taker_name": action_taker_name
        }
        response_data.append(notification_dict)
    
    return Response({
        "message": "All connection notifications (other user's actions only) fetched successfully",
        "count": total_count_paginated,
        "total_count": total_count,
        "unread_count": unread_count,
        "status_breakdown": status_counts,
        "type_breakdown": type_counts,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": notifications_page.has_next(),
        "has_previous": notifications_page.has_previous(),
        "data": response_data
    }, status=status.HTTP_200_OK)


# ============================================
# MARK NOTIFICATION AS READ
# ============================================

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Mark a specific notification as read for the current user.
    """
    
    user = request.user
    
    try:
        notification = Notification.objects.get(
            notification_id=notification_id,
            user=user
        )
    except Notification.DoesNotExist:
        return Response({
            "message": "Notification not found",
            "error": "The specified notification does not exist or does not belong to you."
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Mark as read
    notification.is_read = True
    notification.read_at = timezone.now()
    notification.save()
    
    return Response({
        "message": "Notification marked as read",
        "notification_id": str(notification.notification_id),
        "is_read": notification.is_read,
        "read_at": notification.read_at
    }, status=status.HTTP_200_OK)


# ============================================
# MARK ALL NOTIFICATIONS AS READ (PENDING ONLY)
# ============================================

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """
    Mark all connection request notifications as read for the current user.
    Only marks notifications with PENDING connection status.
    """
    
    user = request.user
    
    # Get all unread connection request notifications with PENDING status
    unread_notifications = Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.CONNECTION_REQUEST,
        connection__status='PENDING',
        is_read=False
    )
    
    count = unread_notifications.count()
    
    # Update all to read
    updated_count = unread_notifications.update(
        is_read=True,
        read_at=timezone.now()
    )
    
    return Response({
        "message": f"{updated_count} notifications marked as read",
        "updated_count": updated_count
    }, status=status.HTTP_200_OK)


# ============================================
# MARK ALL NOTIFICATIONS AS READ (ALL INCLUDING NON-PENDING)
# ============================================

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read_all(request):
    """
    Mark all connection notifications as read for the current user.
    Includes ALL connection notification types regardless of status.
    """
    
    user = request.user
    
    # Get all unread connection notifications (all types)
    connection_notification_types = [
        Notification.NotificationType.CONNECTION_REQUEST,
        Notification.NotificationType.CONNECTION_ACCEPTED,
        Notification.NotificationType.CONNECTION_REJECTED,
        Notification.NotificationType.CONNECTION_COMPLETED,
    ]
    
    unread_notifications = Notification.objects.filter(
        user=user,
        notification_type__in=connection_notification_types,
        is_read=False
    )
    
    count = unread_notifications.count()
    
    # Update all to read
    updated_count = unread_notifications.update(
        is_read=True,
        read_at=timezone.now()
    )
    
    return Response({
        "message": f"{updated_count} notifications marked as read",
        "updated_count": updated_count
    }, status=status.HTTP_200_OK)


# ============================================
# CHECK IF USER HAS UNREAD NOTIFICATIONS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_unread_notifications(request):
    """
    Check if the current authenticated user has any unread notifications.
    Returns True if at least one unread notification exists, False otherwise.
    """
    
    user = request.user
    
    print("=" * 60)
    print("🔔 CHECKING UNREAD NOTIFICATIONS")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    # Check if there's at least one unread notification
    has_unread = Notification.objects.filter(
        user=user,
        is_read=False
    ).exists()
    
    print(f"📊 Has unread notifications: {has_unread}")
    
    # Get count for logging purposes
    if has_unread:
        unread_count = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        print(f"📊 Total unread notifications: {unread_count}")
    
    print("=" * 60)
    
    return Response({
        "has_unread": has_unread
    }, status=status.HTTP_200_OK)


# ============================================
# FETCH PAID/CONNECTED USER CONTACT DETAILS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connected_user_contact(request, connection_id):
    """
    Fetch contact details of the connected user for a specific completed connection.
    If the current user is the sender, returns receiver's contact details.
    If the current user is the receiver, returns sender's contact details.
    Only works for COMPLETED connections.
    """
    
    user = request.user
    
    print("=" * 60)
    print("📞 FETCHING CONNECTED USER CONTACT DETAILS")
    print("=" * 60)
    print(f"👤 Current User ID: {user.id}")
    print(f"👤 Current User: {user.full_name}")
    print(f"🔗 Connection ID: {connection_id}")
    print("=" * 60)
    
    # Try to find the connection
    try:
        connection = Connection.objects.get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response({
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if the user is part of this connection
    if connection.sender.id != user.id and connection.receiver.id != user.id:
        return Response({
            "message": "Permission denied",
            "error": "You are not part of this connection",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if connection is completed
    if connection.status != Connection.Status.COMPLETED:
        return Response({
            "message": "Connection not completed",
            "error": "Contact details are only available for completed connections",
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Determine the connected user (the other person)
    if connection.sender.id == user.id:
        # Current user is the sender, get receiver's details
        connected_user = connection.receiver
        user_role = "sender"
    else:
        # Current user is the receiver, get sender's details
        connected_user = connection.sender
        user_role = "receiver"
    
    print(f"📎 Connected User ID: {connected_user.id}")
    print(f"📎 Connected User: {connected_user.full_name}")
    print(f"👤 User Role in Connection: {user_role}")
    print("=" * 60)
    
    # Build response
    response_data = {
        "connection_id": str(connection.connection_id),
        "status": connection.status,
        "status_display": connection.get_status_display(),
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
            "gender": connected_user.gender,
            "profile_image_url": connected_user.profile_image_url,
            "has_profile_image": connected_user.has_profile_image,
        },
        "contact_details": {
            "phone_number": connected_user.phone_number,
            "email": connected_user.email,
            "full_name": connected_user.full_name,
        }
    }
    
    return Response({
        "message": "Contact details fetched successfully",
        "data": response_data
    }, status=status.HTTP_200_OK)


# ============================================
# FETCH ALL COMPLETED CONNECTIONS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_paid_connections(request):
    """
    Fetch all completed connections for the authenticated user.
    Returns a list of connections where status is COMPLETED.
    Each connection includes the connected user's contact details.
    """
    
    user = request.user
    
    print("=" * 60)
    print("🔗 FETCHING ALL COMPLETED CONNECTIONS")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    # Get all connections where user is either sender or receiver and status is COMPLETED
    connections = Connection.objects.filter(
        Q(sender=user) | Q(receiver=user),
        status=Connection.Status.COMPLETED
    ).select_related('sender', 'receiver').order_by('-updated_at')
    
    total_count = connections.count()
    
    print(f"📊 Total completed connections: {total_count}")
    print("=" * 60)
    
    # Build response data
    response_data = []
    for connection in connections:
        # Determine the connected user (the other person)
        if connection.sender.id == user.id:
            connected_user = connection.receiver
            user_role = "sender"
        else:
            connected_user = connection.sender
            user_role = "receiver"
        
        # Create preview message with instruction to view contact details
        preview_message = f"✅ Connection completed! View contact details for {connected_user.full_name}"
        
        connection_dict = {
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display(),
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
                "gender": connected_user.gender,
                "profile_image_url": connected_user.profile_image_url,
                "has_profile_image": connected_user.has_profile_image,
            },
            "preview_message": preview_message,
            "contact_details": {
                "phone_number": connected_user.phone_number,
                "email": connected_user.email,
                "full_name": connected_user.full_name,
            }
        }
        response_data.append(connection_dict)
    
    return Response({
        "message": "Completed connections fetched successfully",
        "count": total_count,
        "total_count": total_count,
        "data": response_data
    }, status=status.HTTP_200_OK)