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
    
    user = request.user
    
    print("=" * 60)
    print("📩 FETCHING PENDING CONNECTION REQUESTS")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    notifications = Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.CONNECTION_REQUEST,
        connection__status='PENDING'
    ).select_related('connection', 'connection__sender', 'connection__receiver')
    
    notifications = notifications.order_by('-created_at')
    
    total_count = notifications.count()
    unread_count = notifications.filter(is_read=False).count()
    
    print(f"📊 Total pending connection requests: {total_count}")
    print(f"📊 Unread pending connection requests: {unread_count}")
    print("=" * 60)
    
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
    
    paginator = Paginator(notifications, page_size)
    total_pages = paginator.num_pages
    total_count_paginated = paginator.count
    
    try:
        notifications_page = paginator.page(page)
    except PageNotAnInteger:
        notifications_page = paginator.page(1)
    except EmptyPage:
        notifications_page = paginator.page(paginator.num_pages)
    
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
# FETCH ALL CONNECTION NOTIFICATIONS (EXCLUDING PENDING AND REJECTED - ONLY OTHER USER'S ACTIONS)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_requests_all(request):
    """
    Fetch all connection notifications for the current authenticated user.
    Returns all connection-related notifications where the connection status is NOT 'PENDING' and NOT 'REJECTED'.
    
    CRITICAL: Only returns activities where the OTHER user took action.
    The current user's own actions (accepting/rejecting) are EXCLUDED.
    REJECTED connections are EXCLUDED from the response.
    
    CRITICAL FIX: connected_user_name ALWAYS shows the OTHER person in the connection,
    never the current logged-in user.
    """
    
    user = request.user
    
    print("=" * 60)
    print("📩 FETCHING ACTIVITY (OTHER USER'S ACTIONS ONLY - EXCLUDING REJECTED)")
    print("=" * 60)
    print(f"👤 Current User ID: {user.id}")
    print(f"👤 Current User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    connection_notification_types = [
        Notification.NotificationType.CONNECTION_REQUEST,
        Notification.NotificationType.CONNECTION_ACCEPTED,
        Notification.NotificationType.CONNECTION_COMPLETED,
    ]
    
    # Get notifications where the OTHER user took action
    notifications = Notification.objects.filter(
        user=user,
        notification_type__in=connection_notification_types,
        connection__isnull=False
    ).filter(
        Q(
            Q(connection__receiver=user) &
            ~Q(notification_type=Notification.NotificationType.CONNECTION_REQUEST)
        ) |
        Q(
            Q(connection__sender=user) &
            Q(
                Q(notification_type=Notification.NotificationType.CONNECTION_ACCEPTED) |
                Q(notification_type=Notification.NotificationType.CONNECTION_COMPLETED)
            )
        )
    ).exclude(
        connection__status='PENDING'
    ).exclude(
        connection__status='REJECTED'
    ).select_related('connection', 'connection__sender', 'connection__receiver')
    
    notifications = notifications.order_by('-created_at')
    
    total_count = notifications.count()
    unread_count = notifications.filter(is_read=False).count()
    
    print(f"📊 Total activities (other user's actions, excluding rejected): {total_count}")
    print(f"📊 Unread activities: {unread_count}")
    
    status_counts = {}
    for status_choice in Connection.Status.choices:
        status_key = status_choice[0]
        count = notifications.filter(connection__status=status_key).count()
        if count > 0:
            status_counts[status_key] = count
    
    print(f"📊 Status breakdown: {status_counts}")
    print("=" * 60)
    
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
    
    paginator = Paginator(notifications, page_size)
    total_pages = paginator.num_pages
    total_count_paginated = paginator.count
    
    try:
        notifications_page = paginator.page(page)
    except PageNotAnInteger:
        notifications_page = paginator.page(1)
    except EmptyPage:
        notifications_page = paginator.page(paginator.num_pages)
    
    response_data = []
    for notification in notifications_page:
        connection = notification.connection
        
        # Determine who the connected user is (the OTHER person in the connection)
        # This is the person the current user is connected with
        if connection.sender.id == user.id:
            # Current user is the sender - connected user is the receiver
            connected_user = connection.receiver
            action_taken_by = "receiver"
        elif connection.receiver.id == user.id:
            # Current user is the receiver - connected user is the sender
            connected_user = connection.sender
            action_taken_by = "sender"
        else:
            # Should not happen, but fallback
            connected_user = None
            action_taken_by = None
        
        # CRITICAL SAFETY CHECK: Ensure connected_user is never the current user
        if connected_user and connected_user.id == user.id:
            print(f"⚠️ WARNING: Connected user is the current user! Fixing...")
            # Swap to the other person
            if connection.sender.id == user.id:
                connected_user = connection.receiver
            elif connection.receiver.id == user.id:
                connected_user = connection.sender
        
        # Debug logging
        print(f"🔍 Processing notification: {notification.notification_id}")
        print(f"   Notification Type: {notification.notification_type}")
        print(f"   Connection Status: {connection.status}")
        print(f"   Current User: {user.full_name} (ID: {user.id})")
        print(f"   Sender: {connection.sender.full_name} (ID: {connection.sender.id})")
        print(f"   Receiver: {connection.receiver.full_name} (ID: {connection.receiver.id})")
        print(f"   Connected User: {connected_user.full_name if connected_user else 'None'} (ID: {connected_user.id if connected_user else 'None'})")
        print("=" * 40)
        
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
                "connection_id": str(connection.connection_id) if connection else None,
                "status": connection.status if connection else None,
                "status_display": connection.get_status_display() if connection else None,
                "created_at": connection.created_at if connection else None,
            },
            "sender": {
                "id": connection.sender.id if connection else None,
                "email": connection.sender.email if connection else None,
                "full_name": connection.sender.full_name if connection else None,
                "profile_image_url": connection.sender.profile_image_url if connection else None,
            },
            "receiver": {
                "id": connection.receiver.id if connection else None,
                "email": connection.receiver.email if connection else None,
                "full_name": connection.receiver.full_name if connection else None,
                "profile_image_url": connection.receiver.profile_image_url if connection else None,
            },
            # CRITICAL FIX: The connected_user should ALWAYS be the OTHER person in the connection
            # Never the current user
            "connected_user_name": connected_user.full_name if connected_user else None,
            "connected_user_avatar": connected_user.profile_image_url if connected_user else None,
            "connected_user_id": connected_user.id if connected_user else None,
            "action_taken_by": action_taken_by,
            "action_taker_name": connected_user.full_name if connected_user else None
        }
        response_data.append(notification_dict)
    
    return Response({
        "message": "All connection notifications (other user's actions only, excluding rejected) fetched successfully",
        "count": total_count_paginated,
        "total_count": total_count,
        "unread_count": unread_count,
        "status_breakdown": status_counts,
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
    
    unread_notifications = Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.CONNECTION_REQUEST,
        connection__status='PENDING',
        is_read=False
    )
    
    count = unread_notifications.count()
    
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
    REJECTED notifications are ALWAYS considered as read, even if marked unread.
    """
    
    user = request.user
    
    print("=" * 60)
    print("🔔 CHECKING UNREAD NOTIFICATIONS (REJECTED TREATED AS READ)")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print(f"📧 Email: {user.email}")
    print("=" * 60)
    
    has_unread = Notification.objects.filter(
        user=user,
        is_read=False
    ).exclude(
        connection__status='REJECTED'
    ).exists()
    
    print(f"📊 Has unread notifications (rejected excluded): {has_unread}")
    
    if has_unread:
        unread_count = Notification.objects.filter(
            user=user,
            is_read=False
        ).exclude(
            connection__status='REJECTED'
        ).count()
        print(f"📊 Total unread notifications (rejected excluded): {unread_count}")
    
    rejected_count = Notification.objects.filter(
        user=user,
        connection__status='REJECTED'
    ).count()
    print(f"📊 Total rejected notifications (treated as read): {rejected_count}")
    
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
    
    try:
        connection = Connection.objects.get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response({
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    if connection.sender.id != user.id and connection.receiver.id != user.id:
        return Response({
            "message": "Permission denied",
            "error": "You are not part of this connection",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    if connection.status != Connection.Status.COMPLETED:
        return Response({
            "message": "Connection not completed",
            "error": "Contact details are only available for completed connections",
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if connection.sender.id == user.id:
        connected_user = connection.receiver
        user_role = "sender"
    else:
        connected_user = connection.sender
        user_role = "receiver"
    
    print(f"📎 Connected User ID: {connected_user.id}")
    print(f"📎 Connected User: {connected_user.full_name}")
    print(f"👤 User Role in Connection: {user_role}")
    print("=" * 60)
    
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
    
    connections = Connection.objects.filter(
        Q(sender=user) | Q(receiver=user),
        status=Connection.Status.COMPLETED
    ).select_related('sender', 'receiver').order_by('-updated_at')
    
    total_count = connections.count()
    
    print(f"📊 Total completed connections: {total_count}")
    print("=" * 60)
    
    response_data = []
    for connection in connections:
        if connection.sender.id == user.id:
            connected_user = connection.receiver
            user_role = "sender"
        else:
            connected_user = connection.sender
            user_role = "receiver"
        
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


# ============================================
# CHECK UNREAD ACTIVITY NOTIFICATIONS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_unread_activity(request):
    """
    Check if the current authenticated user has any unread activity notifications.
    Returns True if at least one unread notification exists for non-pending connections.
    Excludes REJECTED connections.
    """
    
    user = request.user
    
    print("=" * 60)
    print("🔔 CHECKING UNREAD ACTIVITY NOTIFICATIONS")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print("=" * 60)
    
    connection_notification_types = [
        Notification.NotificationType.CONNECTION_REQUEST,
        Notification.NotificationType.CONNECTION_ACCEPTED,
        Notification.NotificationType.CONNECTION_COMPLETED,
    ]
    
    has_unread = Notification.objects.filter(
        user=user,
        notification_type__in=connection_notification_types,
        is_read=False
    ).exclude(
        connection__status='PENDING'
    ).exclude(
        connection__status='REJECTED'
    ).exists()
    
    print(f"📊 Has unread activity: {has_unread}")
    
    if has_unread:
        unread_count = Notification.objects.filter(
            user=user,
            notification_type__in=connection_notification_types,
            is_read=False
        ).exclude(
            connection__status='PENDING'
        ).exclude(
            connection__status='REJECTED'
        ).count()
        print(f"📊 Total unread activity notifications: {unread_count}")
    
    print("=" * 60)
    
    return Response({
        "has_unread_activity": has_unread
    }, status=status.HTTP_200_OK)


# ============================================
# CHECK UNREAD CONNECTION REQUEST NOTIFICATIONS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_unread_connection_requests(request):
    """
    Check if the current authenticated user has any unread connection request notifications.
    Returns True if at least one unread notification exists for PENDING connections.
    """
    
    user = request.user
    
    print("=" * 60)
    print("🔔 CHECKING UNREAD CONNECTION REQUESTS")
    print("=" * 60)
    print(f"👤 User ID: {user.id}")
    print(f"👤 User: {user.full_name}")
    print("=" * 60)
    
    has_unread = Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.CONNECTION_REQUEST,
        connection__status='PENDING',
        is_read=False
    ).exists()
    
    print(f"📊 Has unread connection requests: {has_unread}")
    
    if has_unread:
        unread_count = Notification.objects.filter(
            user=user,
            notification_type=Notification.NotificationType.CONNECTION_REQUEST,
            connection__status='PENDING',
            is_read=False
        ).count()
        print(f"📊 Total unread connection requests: {unread_count}")
    
    print("=" * 60)
    
    return Response({
        "has_unread_connection_requests": has_unread
    }, status=status.HTTP_200_OK)