from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Hookup
from .serializers import CreateHookupSerializer, HookupResponseSerializer

logger = logging.getLogger(__name__)


# =========================
# CREATE HOOKUP
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_hookup(request):
    sender = request.user.client_profile

    serializer = CreateHookupSerializer(
        data=request.data,
        context={"sender": sender}
    )

    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    receiver = serializer.validated_data["receiver_id"]

    hookup = Hookup.objects.create(
        sender=sender,
        receiver=receiver,
        message=serializer.validated_data.get("message"),
        location=serializer.validated_data.get("location"),
        scheduled_time=serializer.validated_data.get("scheduled_time"),
        is_read_by_sender=True,
        is_read_by_receiver=False,
    )

    return Response({
        "message": "Hookup request sent",
        "data": HookupResponseSerializer(hookup, context={"request": request}).data
    }, status=201)


# =========================
# MY HOOKUPS (SENT ONLY)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_sent_hookups(request):
    """Get only hookups sent by the authenticated user (excluding soft-deleted)"""
    client = request.user.client_profile
    
    sent = Hookup.objects.filter(sender=client, is_deleted=False)
    
    # Serialize data
    serializer_data = HookupResponseSerializer(sent, many=True, context={"request": request}).data
    
    # Add profile image for each receiver from their Bio
    for idx, hookup in enumerate(sent):
        try:
            bio = hookup.receiver.bio
            serializer_data[idx]['receiver_profile_img'] = bio.uploaded_img if bio.uploaded_img else None
        except:
            serializer_data[idx]['receiver_profile_img'] = None
    
    return Response({
        "sent": serializer_data,
    })


# =========================
# MY HOOKUPS (RECEIVED ONLY)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_received_hookups(request):
    """Get only hookups received by the authenticated user with profile images (excluding soft-deleted)"""
    client = request.user.client_profile
    
    received = Hookup.objects.filter(receiver=client, is_deleted=False)
    
    # Serialize with profile image from Bio model
    serializer_data = HookupResponseSerializer(received, many=True, context={"request": request}).data
    
    # Add profile image for each sender from their Bio
    for idx, hookup in enumerate(received):
        try:
            bio = hookup.sender.bio
            serializer_data[idx]['sender_profile_img'] = bio.uploaded_img if bio.uploaded_img else None
        except:
            serializer_data[idx]['sender_profile_img'] = None
    
    return Response({
        "received": serializer_data,
    })


# =========================
# GET SINGLE HOOKUP DETAILS
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_hookup_detail(request, hookup_id):
    client = request.user.client_profile
    
    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    
    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)
    
    # Get profile images from Bio
    sender_profile_img = None
    receiver_profile_img = None
    
    try:
        if hookup.sender.bio:
            sender_profile_img = hookup.sender.bio.uploaded_img
    except:
        pass
    
    try:
        if hookup.receiver.bio:
            receiver_profile_img = hookup.receiver.bio.uploaded_img
    except:
        pass
    
    serializer_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    # Add profile images to response
    serializer_data['sender_profile_img'] = sender_profile_img
    serializer_data['receiver_profile_img'] = receiver_profile_img
    
    return Response(serializer_data)


# =========================
# ACCEPT
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_hookup(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    try:
        hookup.accept()
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    serializer_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    return Response({
        "message": "Hookup accepted",
        "data": serializer_data
    })


# =========================
# REJECT - DELETE THE HOOKUP
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_hookup(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    # Store hookup data for response before soft deletion
    hookup_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    # Soft delete the hookup from database
    hookup.soft_delete()
    
    return Response({
        "message": "Hookup rejected and removed",
        "deleted_hookup_id": hookup_id,
        "data": hookup_data
    }, status=200)


# =========================
# CANCEL - UPDATED: Allow both sender AND receiver to cancel
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_hookup(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # Allow both sender AND receiver to cancel
    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    # Store hookup data for response before soft deletion
    hookup_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    # Determine who is cancelling
    canceller_role = "sender" if hookup.sender == client else "receiver"
    
    # Soft delete the hookup from database
    hookup.soft_delete()
    
    logger.info(f"Hookup {hookup_id} cancelled by {canceller_role}: {client.user.email}")
    
    return Response({
        "message": "Hookup cancelled and removed",
        "deleted_hookup_id": hookup_id,
        "cancelled_by": canceller_role,
        "data": hookup_data
    }, status=200)


# =========================
# COMPLETE HOOKUP
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_hookup(request, hookup_id):
    """Mark hookup as completed (can be called by either party)"""
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    try:
        hookup.mark_as_completed()
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    serializer_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    return Response({
        "message": "Hookup marked as completed",
        "data": serializer_data
    })


# =========================
# CONFIRM HOOKUP - PERMANENT DELETE
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_hookup(request, hookup_id):
    """
    Confirm hookup - permanently deletes the hookup record
    This removes all traces of the hookup from the system
    """
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # Allow both sender and receiver to confirm
    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    # Store data for response
    hookup_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    # Permanently delete from database (hard delete)
    hookup.delete()
    
    logger.info(f"Hookup {hookup_id} permanently deleted by user {client.user.email}")
    
    return Response({
        "message": "Hookup confirmed and permanently removed",
        "deleted_hookup_id": hookup_id,
        "data": hookup_data
    }, status=200)


# =========================
# MARK AS PAID
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_hookup_as_paid(request, hookup_id):
    """Mark hookup as paid (admin only)"""
    user = request.user
    
    # Only admins or superadmins can mark as paid
    if user.role not in ['admin', 'superadmin']:
        return Response({"error": "Only admins can mark hookups as paid"}, status=403)

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    try:
        hookup.mark_as_paid()
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    serializer_data = HookupResponseSerializer(hookup, context={"request": request}).data
    
    return Response({
        "message": "Hookup marked as paid",
        "data": serializer_data
    })


# =========================
# UNREAD COUNT 🔔 - UPDATED to include sender unread
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_hookup_count(request):
    client = request.user.client_profile

    # Count unread hookups for the current user
    # As receiver: not read by receiver
    # As sender: not read by sender
    count = Hookup.objects.filter(
        Q(receiver=client, is_read_by_receiver=False) |
        Q(sender=client, is_read_by_sender=False),
        is_deleted=False
    ).count()

    # Optional: Break down by type
    unread_as_receiver = Hookup.objects.filter(
        receiver=client, 
        is_read_by_receiver=False,
        is_deleted=False
    ).count()
    
    unread_as_sender = Hookup.objects.filter(
        sender=client, 
        is_read_by_sender=False,
        is_deleted=False
    ).count()

    return Response({
        "unread_count": count,
        "unread_as_receiver": unread_as_receiver,  # Hookups you received but haven't read
        "unread_as_sender": unread_as_sender       # Hookups you sent that haven't been read by receiver
    })


# =========================
# MARK AS READ
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_hookup_as_read(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id, is_deleted=False)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hookup.sender == client:
        hookup.mark_read_by_sender()
    elif hookup.receiver == client:
        hookup.mark_read_by_receiver()
    else:
        return Response({"error": "Not allowed"}, status=403)

    return Response({"message": "Marked as read"})


# =========================
# GET HOOKUP BY STATUS (For debugging)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_hookup_by_status(request, status):
    """Get hookups by status for debugging"""
    client = request.user.client_profile
    
    hookups = Hookup.objects.filter(
        Q(sender=client) | Q(receiver=client),
        status=status,
        is_deleted=False
    )
    
    serializer_data = HookupResponseSerializer(hookups, many=True, context={"request": request}).data
    
    return Response({
        "status": status,
        "count": hookups.count(),
        "hookups": serializer_data
    })


# =========================
# AUTO-DELETE EXPIRED HOOKUPS (Management Command)
# =========================
def delete_expired_hookups():
    """
    Function to delete hookups that have passed their scheduled deletion time.
    This should be called by a management command or Celery task.
    """
    now = timezone.now()
    
    # Find hookups scheduled for deletion
    expired_hookups = Hookup.objects.filter(
        scheduled_deletion_at__lte=now,
        is_deleted=False
    )
    
    count = expired_hookups.count()
    
    for hookup in expired_hookups:
        hookup.soft_delete()
        logger.info(f"Auto-deleted hookup {hookup.id} (Status: {hookup.status})")
    
    return count