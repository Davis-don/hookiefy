from django.shortcuts import render
from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import Connection
from notification.models import Notification
from assignments.models import ClientAssignment
from account.models import Accounts

# ============================================
# HOOKUP VIEW - Create connection request (with enhanced logging)
# ============================================

import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hookup_view(request, id):
    """
    Hookup view that takes authenticated user and an ID parameter.
    Creates a connection request and notifies the receiver.
    
    Rules:
    - Only 'user' role can send connection requests (not 'admin' or 'superadmin')
    - Can create if NO previous connection exists
    - Can create if previous connection status is REJECTED
    - Can create if previous connection status is COMPLETED
    - CANNOT create if previous connection status is PENDING
    - CANNOT create if previous connection status is ACCEPTED
    - CANNOT create if receiver is 'admin' or 'superadmin'
    """

    # Get the authenticated user (sender)
    sender = request.user
    
    # LOG THE USER DETAILS
    logger.info(f"🔍 HOOKUP ATTEMPT - User: {sender.email}, ID: {sender.id}, Role: {sender.role}")

    # Check if sender is a 'user' role (not 'admin' or 'superadmin')
    if sender.role != 'user':
        logger.warning(f"❌ Blocked - User {sender.email} has role '{sender.role}', not 'user'")
        # Get role display name
        role_display = dict(Accounts.ROLE_CHOICES).get(sender.role, sender.role)
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": f"Only regular users can send connection requests. You are logged in as '{role_display}'. Please use a regular user account.",
            "status": "failed",
            "your_role": sender.role,
            "allowed_roles": ['user']
        }, status=status.HTTP_403_FORBIDDEN)

    # Try to find the target user (receiver)
    try:
        receiver = Accounts.objects.get(id=id)
        receiver_name = f"{receiver.first_name} {receiver.last_name}"
        logger.info(f"📎 Receiver found: {receiver.email}, Role: {receiver.role}")
    except Accounts.DoesNotExist:
        logger.warning(f"❌ Receiver not found: ID {id}")
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": "User not found",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)

    # Check if receiver is 'admin' or 'superadmin'
    if receiver.role in ['admin', 'superadmin']:
        logger.warning(f"❌ Blocked - Cannot send to admin/superadmin: {receiver.email} (role: {receiver.role})")
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": "You cannot send a connection request to an admin or super admin user.",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)

    # Check if user is trying to connect with themselves
    if sender.id == receiver.id:
        logger.warning(f"❌ Blocked - User tried to connect with themselves: {sender.email}")
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": "You cannot send a connection request to yourself",
            "status": "failed"
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check for any existing connections between these two users
    existing_connections = Connection.objects.filter(
        models.Q(sender=sender, receiver=receiver) |
        models.Q(sender=receiver, receiver=sender)
    )

    # Check if there's an ACTIVE connection (PENDING or ACCEPTED)
    active_connection = existing_connections.filter(
        status__in=[Connection.Status.PENDING, Connection.Status.ACCEPTED]
    ).first()

    if active_connection:
        logger.info(f"ℹ️ Active connection exists: {active_connection.connection_id} (status: {active_connection.get_status_display()})")
        return Response({
            "success": False,
            "message": "Cannot create connection request",
            "error": f"An active connection already exists with status: {active_connection.get_status_display()}",
            "connection_id": str(active_connection.connection_id),
            "status": active_connection.status,
            "status_display": active_connection.get_status_display()
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if there's a previous connection (REJECTED or COMPLETED)
    previous_connection = existing_connections.filter(
        status__in=[Connection.Status.REJECTED, Connection.Status.COMPLETED]
    ).first()

    if previous_connection:
        logger.info(f"ℹ️ Previous connection found: {previous_connection.connection_id} (status: {previous_connection.get_status_display()})")

    # Create the connection and notification
    try:
        connection = Connection.objects.create(
            sender=sender,
            receiver=receiver,
            status=Connection.Status.PENDING
        )

        # Create notification for the receiver
        Notification.objects.create(
            user=receiver,
            connection=connection,
            title="New Connection Request",
            message=f"{sender.full_name} sent you a connection request.",
            notification_type=Notification.NotificationType.CONNECTION_REQUEST
        )

        logger.info(f"✅ Connection created: {connection.connection_id} | Sender: {sender.email} | Receiver: {receiver.email}")

        return Response({
            "success": True,
            "message": f"Connection request sent to {receiver_name} successfully!",
            "connection_id": str(connection.connection_id),
            "sender_id": sender.id,
            "sender_name": sender.full_name,
            "sender_role": sender.role,
            "receiver_id": receiver.id,
            "receiver_name": receiver_name,
            "receiver_role": receiver.role,
            "connection_status": connection.status,
            "status_display": connection.get_status_display(),
            "previous_connection": {
                "exists": previous_connection is not None,
                "connection_id": str(previous_connection.connection_id) if previous_connection else None,
                "status": previous_connection.status if previous_connection else None,
                "status_display": previous_connection.get_status_display() if previous_connection else None
            } if previous_connection else None,
            "created_at": connection.created_at
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"❌ Error creating connection: {str(e)}")
        return Response({
            "success": False,
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
            "success": False,
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if the user is the receiver of this connection
    if connection.receiver.id != user.id:
        return Response({
            "success": False,
            "message": "Permission denied",
            "error": "You are not the receiver of this connection request",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if connection is already accepted or rejected
    if connection.status == Connection.Status.ACCEPTED:
        return Response({
            "success": True,
            "message": "Connection already accepted",
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_200_OK)
    
    if connection.status == Connection.Status.REJECTED:
        return Response({
            "success": False,
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
            "success": True,
            "message": f"Connection request accepted successfully!",
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
            "success": False,
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
            "success": False,
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed"
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if the user is the receiver of this connection
    if connection.receiver.id != user.id:
        return Response({
            "success": False,
            "message": "Permission denied",
            "error": "You are not the receiver of this connection request",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check if connection is already rejected
    if connection.status == Connection.Status.REJECTED:
        return Response({
            "success": True,
            "message": "Connection already rejected",
            "connection_id": str(connection.connection_id),
            "status": connection.status,
            "status_display": connection.get_status_display()
        }, status=status.HTTP_200_OK)
    
    # Check if connection is completed (cannot reject completed)
    if connection.status == Connection.Status.COMPLETED:
        return Response({
            "success": False,
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
            "success": True,
            "message": f"Connection request rejected successfully.",
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
            "success": False,
            "message": "Failed to reject connection",
            "error": str(e),
            "status": "failed"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# GET ADMIN HOOKUPS (For Admin Dashboard)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_hookups(request):
    """
    Get all hookups (connections) for clients assigned to the current admin.
    Only accessible by admin and superadmin.
    Returns the most recent hookups first.
    """
    user = request.user
    
    # Check if user is admin or superadmin
    if user.role not in ['admin', 'superadmin']:
        return Response({
            "message": "Access denied. Only admin and superadmin can view hookups.",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get all client IDs assigned to this admin
    if user.role == 'superadmin':
        # Superadmin: get all users with role 'user'
        client_user_ids = Accounts.objects.filter(role='user').values_list('id', flat=True)
    else:
        # Admin: get only assigned clients
        client_user_ids = ClientAssignment.objects.filter(
            assigned_admin=user
        ).values_list('user_id', flat=True)
    
    # If no clients, return empty list
    if not client_user_ids:
        return Response({
            "message": "No clients found",
            "data": [],
            "count": 0,
            "status": "success"
        }, status=status.HTTP_200_OK)
    
    # Get all connections where sender OR receiver is one of the clients
    # Also include connections where the admin themselves is involved
    connections = Connection.objects.filter(
        models.Q(sender_id__in=client_user_ids) |
        models.Q(receiver_id__in=client_user_ids) |
        models.Q(sender=user) |
        models.Q(receiver=user)
    ).select_related('sender', 'receiver').order_by('-created_at')
    
    # Build response data
    hookup_data = []
    for conn in connections:
        # Determine if this is a completed payment (check if connection has payment)
        # You can add payment check here if you have a Payment model
        payment_status = "pending"  # Default
        amount_paid = "0.00"
        
        # If connection is ACCEPTED or COMPLETED, consider it as completed
        if conn.status == Connection.Status.COMPLETED:
            payment_status = "completed"
        elif conn.status == Connection.Status.ACCEPTED:
            payment_status = "accepted"
        else:
            payment_status = conn.status
        
        hookup_data.append({
            "hookup_id": str(conn.connection_id),
            "sender_id": conn.sender.id,
            "sender_name": conn.sender.full_name,
            "sender_email": conn.sender.email,
            "sender_profile_image": conn.sender.profile_image_url,
            "receiver_id": conn.receiver.id,
            "receiver_name": conn.receiver.full_name,
            "receiver_email": conn.receiver.email,
            "receiver_profile_image": conn.receiver.profile_image_url,
            "status": conn.status,
            "status_display": conn.get_status_display(),
            "payment_status": payment_status,
            "amount_paid": amount_paid,
            "created_at": conn.created_at,
            "updated_at": conn.updated_at,
        })
    
    return Response({
        "message": f"Found {len(hookup_data)} hookups",
        "data": hookup_data,
        "count": len(hookup_data),
        "status": "success"
    }, status=status.HTTP_200_OK)


# ============================================
# GET REVENUE BY LOCATION
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_revenue_by_location(request):
    """
    Get revenue breakdown by location (city, county, country) for the current admin's clients.
    Only accessible by admin and superadmin.
    Returns top locations with highest revenue.
    """
    user = request.user
    
    # Check if user is admin or superadmin
    if user.role not in ['admin', 'superadmin']:
        return Response({
            "message": "Access denied. Only admin and superadmin can view revenue by location.",
            "status": "failed"
        }, status=status.HTTP_403_FORBIDDEN)
    
    from django.db.models import Sum, Q, F, Value, CharField
    from django.db.models.functions import Coalesce, Concat
    
    # Get all client IDs assigned to this admin
    if user.role == 'superadmin':
        # Superadmin: get all users with role 'user'
        client_user_ids = list(Accounts.objects.filter(role='user').values_list('id', flat=True))
    else:
        # Admin: get only assigned clients
        client_user_ids = list(ClientAssignment.objects.filter(
            assigned_admin=user
        ).values_list('user_id', flat=True))
    
    # If no clients, return empty list
    if not client_user_ids:
        return Response({
            "message": "No clients found",
            "data": [],
            "status": "success"
        }, status=status.HTTP_200_OK)
    
    # Get all connections that are COMPLETED (paid) involving these clients
    # Include both sender and receiver roles
    completed_connections = Connection.objects.filter(
        models.Q(sender_id__in=client_user_ids) | 
        models.Q(receiver_id__in=client_user_ids)
    ).filter(
        status=Connection.Status.COMPLETED
    ).select_related('sender', 'receiver')
    
    # If no completed connections, return empty
    if not completed_connections.exists():
        return Response({
            "message": "No completed connections found",
            "data": [],
            "status": "success"
        }, status=status.HTTP_200_OK)
    
    # Get UserBalance for each user involved in completed connections
    # We need to get the total_earned for each user
    user_ids = set()
    for conn in completed_connections:
        user_ids.add(conn.sender_id)
        user_ids.add(conn.receiver_id)
    
    # Get balances for these users
    from userbalance.models import UserBalance
    balances = UserBalance.objects.filter(
        user_id__in=user_ids
    ).select_related('user')
    
    # Create a map of user_id -> total_earned
    user_earnings = {}
    for balance in balances:
        user_earnings[balance.user_id] = float(balance.total_earned)
    
    # Now we need to get location data for each user
    # We'll use the profile data from the UserProfile model
    from userprofile.models import UserProfile
    
    # Get all profiles for these users
    profiles = UserProfile.objects.filter(
        user_id__in=user_ids
    ).select_related('user')
    
    # Create a map of user_id -> location string
    user_locations = {}
    for profile in profiles:
        location_parts = []
        if profile.city:
            location_parts.append(profile.city)
        if profile.county:
            location_parts.append(profile.county)
        if profile.country:
            location_parts.append(profile.country)
        
        # Use city if available, otherwise county, otherwise country
        if profile.city:
            location_key = profile.city
        elif profile.county:
            location_key = profile.county
        elif profile.country:
            location_key = profile.country
        else:
            location_key = "Unknown"
        
        user_locations[profile.user_id] = {
            'location': location_key,
            'full_location': ', '.join(location_parts) if location_parts else "Unknown"
        }
    
    # Aggregate revenue by location
    location_revenue = {}
    
    for user_id, earnings in user_earnings.items():
        if user_id in user_locations:
            location = user_locations[user_id]['location']
            location_revenue[location] = location_revenue.get(location, 0) + earnings
    
    # If no revenue data, return empty
    if not location_revenue:
        return Response({
            "message": "No revenue data found",
            "data": [],
            "status": "success"
        }, status=status.HTTP_200_OK)
    
    # Find the maximum revenue for percentage calculation
    max_revenue = max(location_revenue.values()) if location_revenue else 1
    
    # Sort locations by revenue (highest first) and get top 5
    sorted_locations = sorted(
        location_revenue.items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    # Build response data
    result = []
    for location, revenue in sorted_locations:
        percentage = round((revenue / max_revenue) * 100)
        result.append({
            "location": location,
            "revenue": int(revenue),
            "percentage": percentage,
        })
    
    return Response({
        "message": f"Found revenue data for {len(result)} locations",
        "data": result,
        "count": len(result),
        "status": "success"
    }, status=status.HTTP_200_OK)