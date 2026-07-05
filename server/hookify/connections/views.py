from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import Connection
from notification.models import Notification

User = get_user_model()

# ============================================
# HOOKUP VIEW - Create connection request
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hookup_view(request, id):
    """
    Hookup view that takes authenticated user and an ID parameter.
    Creates a connection request and notifies the receiver.
    """

    # Get the authenticated user (sender)
    sender = request.user

    # Try to find the target user (receiver)
    try:
        receiver = User.objects.get(id=id)
        receiver_name = f"{receiver.first_name} {receiver.last_name}"
    except User.DoesNotExist:
        return Response({
            "message": "Connection failed",
            "error": "User not found",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)

    # Print both IDs to console
    print("=" * 60)
    print("🔌 HOOKUP VIEW TRIGGERED")
    print("=" * 60)
    print(f"👤 Sender ID: {sender.id}")
    print(f"👤 Sender: {sender.full_name}")
    print(f"📎 Receiver ID: {receiver.id}")
    print(f"📎 Receiver: {receiver_name}")
    print("=" * 60)

    # Check if user is trying to connect with themselves
    if sender.id == receiver.id:
        return Response({
            "message": "Connection failed",
            "error": "You cannot connect with yourself",
            "status": "failed"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if connection already exists
    try:
        existing_connection = Connection.objects.get(
            sender=sender,
            receiver=receiver
        )

        return Response({
            "message": "Connection request already sent",
            "connection_id": str(existing_connection.connection_id),
            "status": existing_connection.status,
            "sender_id": sender.id,
            "receiver_id": receiver.id,
            "receiver_name": receiver_name,
            "created_at": existing_connection.created_at
        }, status=status.HTTP_200_OK)

    except Connection.DoesNotExist:
        pass

    # Check if receiver already sent a request to sender
    try:
        existing_connection = Connection.objects.get(
            sender=receiver,
            receiver=sender
        )

        return Response({
            "message": "This user has already sent you a connection request",
            "connection_id": str(existing_connection.connection_id),
            "status": existing_connection.status,
            "sender_id": receiver.id,
            "receiver_id": sender.id,
            "sender_name": receiver_name,
            "created_at": existing_connection.created_at
        }, status=status.HTTP_200_OK)

    except Connection.DoesNotExist:
        pass

    # Create the connection and notification
    try:
        connection = Connection.objects.create(
            sender=sender,
            receiver=receiver,
            status=Connection.Status.PENDING
        )

        # Create notification for the receiver with type CONNECTION_REQUEST
        Notification.objects.create(
            user=receiver,
            connection=connection,
            title="New Connection Request",
            message=f"{sender.full_name} sent you a connection request.",
            notification_type=Notification.NotificationType.CONNECTION_REQUEST
        )

        print(f"✅ Connection created with ID: {connection.connection_id}")
        print(f"✅ Notification created for User ID: {receiver.id}")
        print(f"📩 Notification sent to: {receiver_name}")
        print(f"📝 Notification Type: {Notification.NotificationType.CONNECTION_REQUEST}")
        print("=" * 60)

        return Response({
            "message": f"Connection request sent to {receiver_name} successfully!",
            "success": True,
            "connection_id": str(connection.connection_id),
            "sender_id": sender.id,
            "sender_name": sender.full_name,
            "receiver_id": receiver.id,
            "receiver_name": receiver_name,
            "connection_status": connection.status,
            "status_display": connection.get_status_display(),
            "notification": {
                "type": Notification.NotificationType.CONNECTION_REQUEST,
                "title": "New Connection Request",
                "message": f"{sender.full_name} sent you a connection request."
            },
            "created_at": connection.created_at
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"❌ Error creating connection: {str(e)}")

        return Response({
            "message": "Failed to create connection",
            "error": str(e),
            "status": "failed"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# ACCEPT CONNECTION REQUEST
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_connection(request, connection_id):
    """
    Accept a pending connection request.
    Only the receiver can accept the connection.
    """
    
    user = request.user
    
    # Try to find the connection
    try:
        connection = Connection.objects.get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response({
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if the user is the receiver of this connection
    if connection.receiver.id != user.id:
        return Response({
            "message": "Permission denied",
            "error": "You are not the receiver of this connection request",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if connection is already accepted or rejected
    if connection.status == Connection.Status.ACCEPTED:
        return Response({
            "message": "Connection already accepted",
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_200_OK)
    
    if connection.status == Connection.Status.REJECTED:
        return Response({
            "message": "Connection already rejected",
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update connection status to ACCEPTED
    try:
        connection.status = Connection.Status.ACCEPTED
        connection.save()
        
        print(f"✅ Connection {connection.connection_id} accepted by {user.full_name}")
        print(f"   Sender: {connection.sender.full_name}")
        print(f"   Receiver: {connection.receiver.full_name}")
        print("=" * 60)
        
        # Create notification for the sender
        Notification.objects.create(
            user=connection.sender,
            connection=connection,
            title="Connection Request Accepted",
            message=f"{connection.receiver.full_name} accepted your connection request.",
            notification_type=Notification.NotificationType.CONNECTION_ACCEPTED
        )
        
        print(f"📩 Notification sent to sender: {connection.sender.full_name}")
        print(f"📝 Notification Type: {Notification.NotificationType.CONNECTION_ACCEPTED}")
        print("=" * 60)
        
        return Response({
            "message": f"Connection request accepted successfully!",
            "success": True,
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display(),
            "sender_id": connection.sender.id,
            "sender_name": connection.sender.full_name,
            "receiver_id": connection.receiver.id,
            "receiver_name": connection.receiver.full_name,
            "updated_at": connection.updated_at,
            "user_action_message": f"You accepted the connection request from {connection.sender.full_name}.",
            "notification": {
                "type": Notification.NotificationType.CONNECTION_ACCEPTED,
                "title": "Connection Request Accepted",
                "message": f"{connection.receiver.full_name} accepted your connection request."
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error accepting connection: {str(e)}")
        return Response({
            "message": "Failed to accept connection",
            "error": str(e),
            "status": "failed"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# REJECT CONNECTION REQUEST
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_connection(request, connection_id):
    """
    Reject a connection request.
    Only the receiver can reject the connection.
    Can reject both PENDING and ACCEPTED statuses.
    """
    
    user = request.user
    
    # Try to find the connection
    try:
        connection = Connection.objects.get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response({
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if the user is the receiver of this connection
    if connection.receiver.id != user.id:
        return Response({
            "message": "Permission denied",
            "error": "You are not the receiver of this connection request",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if connection is already rejected
    if connection.status == Connection.Status.REJECTED:
        return Response({
            "message": "Connection already rejected",
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_200_OK)
    
    # Check if connection is completed (cannot reject completed)
    if connection.status == Connection.Status.COMPLETED:
        return Response({
            "message": "Cannot reject a completed connection",
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update connection status to REJECTED (works for both PENDING and ACCEPTED)
    try:
        connection.status = Connection.Status.REJECTED
        connection.save()
        
        print(f"❌ Connection {connection.connection_id} rejected by {user.full_name}")
        print(f"   Sender: {connection.sender.full_name}")
        print(f"   Receiver: {connection.receiver.full_name}")
        print(f"   Previous Status: {connection.get_status_display()}")
        print("=" * 60)
        
        # Create notification for the sender
        Notification.objects.create(
            user=connection.sender,
            connection=connection,
            title="Connection Request Rejected",
            message=f"{connection.receiver.full_name} has rejected your connection request.",
            notification_type=Notification.NotificationType.CONNECTION_REJECTED
        )
        
        print(f"📩 Notification sent to sender: {connection.sender.full_name}")
        print(f"📝 Notification Type: {Notification.NotificationType.CONNECTION_REJECTED}")
        print("=" * 60)
        
        return Response({
            "message": f"Connection request rejected successfully.",
            "success": True,
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display(),
            "sender_id": connection.sender.id,
            "sender_name": connection.sender.full_name,
            "receiver_id": connection.receiver.id,
            "receiver_name": connection.receiver.full_name,
            "updated_at": connection.updated_at,
            "user_action_message": f"You rejected the connection request from {connection.sender.full_name}.",
            "notification": {
                "type": Notification.NotificationType.CONNECTION_REJECTED,
                "title": "Connection Request Rejected",
                "message": f"{connection.receiver.full_name} has rejected your connection request."
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error rejecting connection: {str(e)}")
        return Response({
            "message": "Failed to reject connection",
            "error": str(e),
            "status": "failed"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# CANCEL/CLEAR CONNECTION REQUEST (Both sender and receiver can cancel)
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_connection(request, connection_id):
    """
    Cancel/clear a connection request.
    Can override ANY status (PENDING, ACCEPTED, REJECTED, COMPLETED) to REJECTED.
    Both sender and receiver can cancel/clear the connection.
    """
    
    user = request.user
    
    # Try to find the connection
    try:
        connection = Connection.objects.get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response({
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Debug logging
    print(f"🔍 Connection found:")
    print(f"   Connection ID: {connection.connection_id}")
    print(f"   Sender: {connection.sender.full_name} (ID: {connection.sender.id})")
    print(f"   Receiver: {connection.receiver.full_name} (ID: {connection.receiver.id})")
    print(f"   Current User: {user.full_name} (ID: {user.id})")
    print(f"   Status: {connection.status}")
    print("=" * 60)
    
    # Check if the user is either the sender OR the receiver of this connection
    if connection.sender.id != user.id and connection.receiver.id != user.id:
        return Response({
            "message": "Permission denied",
            "error": "You are not involved in this connection",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get the previous status for logging
    previous_status = connection.get_status_display()
    
    # Determine who is the other party
    other_user = connection.sender if connection.sender.id != user.id else connection.receiver
    
    # Determine the user's role in this connection
    user_role = "sender" if connection.sender.id == user.id else "receiver"
    other_role = "receiver" if user_role == "sender" else "sender"
    
    # Create appropriate notification messages
    if user_role == "sender":
        # Sender is cancelling - notification to receiver
        notification_title = "Connection Cancelled by Sender"
        notification_message = f"{user.full_name} (sender) has cancelled the connection with you."
        user_action_message = f"You cancelled the connection with {other_user.full_name} (receiver)."
    else:
        # Receiver is cancelling - notification to sender
        notification_title = "Connection Cancelled by Receiver"
        notification_message = f"{user.full_name} (receiver) has cancelled the connection with you."
        user_action_message = f"You cancelled the connection with {other_user.full_name} (sender)."
    
    # Update connection status to REJECTED (overrides ANY status)
    try:
        connection.status = Connection.Status.REJECTED
        connection.save()
        
        print(f"🗑️ Connection {connection.connection_id} cancelled/cleared by {user.full_name}")
        print(f"   Sender: {connection.sender.full_name}")
        print(f"   Receiver: {connection.receiver.full_name}")
        print(f"   User Role: {user_role}")
        print(f"   Previous Status: {previous_status}")
        print(f"   New Status: {connection.get_status_display()}")
        print("=" * 60)
        
        # Create notification for the other party
        Notification.objects.create(
            user=other_user,
            connection=connection,
            title=notification_title,
            message=notification_message,
            notification_type=Notification.NotificationType.CONNECTION_REJECTED
        )
        
        print(f"📩 Notification sent to: {other_user.full_name}")
        print(f"📝 Notification Type: {Notification.NotificationType.CONNECTION_REJECTED}")
        print("=" * 60)
        
        return Response({
            "message": f"Connection cancelled successfully.",
            "success": True,
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display(),
            "previous_status": previous_status,
            "sender_id": connection.sender.id,
            "sender_name": connection.sender.full_name,
            "receiver_id": connection.receiver.id,
            "receiver_name": connection.receiver.full_name,
            "cancelled_by": user.full_name,
            "cancelled_by_id": user.id,
            "cancelled_by_role": user_role,
            "user_action_message": user_action_message,
            "updated_at": connection.updated_at,
            "notification": {
                "type": Notification.NotificationType.CONNECTION_REJECTED,
                "title": notification_title,
                "message": notification_message,
                "sent_to": other_user.full_name
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error cancelling connection: {str(e)}")
        return Response({
            "message": "Failed to cancel connection",
            "error": str(e),
            "status": "failed"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)