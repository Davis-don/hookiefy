from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import Hookup
from .serializers import CreateHookupSerializer, HookupResponseSerializer


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
        payment_status="not_paid",
        approval_status="pending",
        is_read_by_sender=False,
        is_read_by_receiver=False,
        is_deleted_by_sender=False,
        is_deleted_by_receiver=False,
    )

    return Response({
        "message": "Hookup request sent",
        "data": HookupResponseSerializer(
            hookup,
            context={"request": request}
        ).data
    }, status=201)


# =========================
# FETCH ALL HOOKUPS - HIDE IF DELETED BY EITHER PARTY
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_hookups(request):
    client = request.user.client_profile

    sent_queryset = Hookup.objects.filter(
        sender=client,
        is_deleted_by_sender=False,
        is_deleted_by_receiver=False
    ).select_related(
        "sender__user", 
        "receiver__user",
        "sender__bio", 
        "receiver__bio"
    ).order_by("-created_at")

    received_queryset = Hookup.objects.filter(
        receiver=client,
        is_deleted_by_receiver=False,
        is_deleted_by_sender=False
    ).select_related(
        "sender__user", 
        "receiver__user",
        "sender__bio", 
        "receiver__bio"
    ).order_by("-created_at")

    def serialize_hookup(hookup, role):
        is_current_user_sender = hookup.sender == client
        
        return {
            "id": hookup.id,
            "message": hookup.message,
            "location": hookup.location,
            "scheduled_time": hookup.scheduled_time,
            "payment_status": hookup.payment_status,
            "approval_status": hookup.approval_status,
            "is_paid": hookup.payment_status == "paid",
            "is_read_by_sender": hookup.is_read_by_sender,
            "is_read_by_receiver": hookup.is_read_by_receiver,
            "is_deleted_by_sender": hookup.is_deleted_by_sender,
            "is_deleted_by_receiver": hookup.is_deleted_by_receiver,
            "is_read_by_current_user": (
                hookup.is_read_by_sender if is_current_user_sender else hookup.is_read_by_receiver
            ),
            "created_at": hookup.created_at,
            "approved_at": hookup.approved_at,
            "rejected_at": hookup.rejected_at,
            "paid_at": hookup.paid_at,
            "sender_id": hookup.sender.id,
            "receiver_id": hookup.receiver.id,
            "sender_name": f"{hookup.sender.user.first_name} {hookup.sender.user.last_name}".strip() or hookup.sender.user.email,
            "receiver_name": f"{hookup.receiver.user.first_name} {hookup.receiver.user.last_name}".strip() or hookup.receiver.user.email,
            "sender_image": hookup.sender.bio.uploaded_img if hasattr(hookup.sender, "bio") and hookup.sender.bio else None,
            "receiver_image": hookup.receiver.bio.uploaded_img if hasattr(hookup.receiver, "bio") and hookup.receiver.bio else None,
            "role": role
        }

    sent_data = [serialize_hookup(h, "sent") for h in sent_queryset]
    received_data = [serialize_hookup(h, "received") for h in received_queryset]

    return Response({
        "sent": sent_data,
        "received": received_data,
        "total_sent": len(sent_data),
        "total_received": len(received_data),
    })


# =========================
# GET HOOKUP PARTNER DETAILS (Full name, email, phone only)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_hookup_partner_details(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found"}, status=404)
    
    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)
    
    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)
    
    # Determine the partner based on current user's role
    if hookup.sender == client:
        partner = hookup.receiver
        role = "sender"
    else:
        partner = hookup.sender
        role = "receiver"
    
    # Get partner details - only full name, email, and phone number
    partner_data = {
        "full_name": f"{partner.user.first_name} {partner.user.last_name}".strip() or partner.user.email,
        "email": partner.user.email,
        "phone_number": partner.bio.phone_number if hasattr(partner, "bio") and partner.bio else "Not provided",
        "role": role,
        "hookup_status": hookup.approval_status,
        "payment_status": hookup.payment_status,
        "hookup_id": hookup.id
    }
    
    return Response(partner_data)


# =========================
# GET UNREAD COUNT
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    client = request.user.client_profile
    
    # Count unread hookups for current user
    sent_unread = Hookup.objects.filter(
        sender=client,
        is_read_by_sender=False,
        is_deleted_by_sender=False,
        is_deleted_by_receiver=False
    ).count()
    
    received_unread = Hookup.objects.filter(
        receiver=client,
        is_read_by_receiver=False,
        is_deleted_by_receiver=False,
        is_deleted_by_sender=False
    ).count()
    
    total_unread = sent_unread + received_unread
    
    return Response({
        "unread_count": total_unread,
        "sent_unread": sent_unread,
        "received_unread": received_unread
    })


# =========================
# MARK HOOKUP AS READ
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_hookup_as_read(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found"}, status=404)

    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)

    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)

    if hookup.sender == client:
        hookup.is_read_by_sender = True
        hookup.save(update_fields=["is_read_by_sender"])
    elif hookup.receiver == client:
        hookup.is_read_by_receiver = True
        hookup.save(update_fields=["is_read_by_receiver"])

    return Response({"message": "Hookup marked as read"})


# =========================
# GET PENDING COUNT
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pending_hookup_count(request):
    client = request.user.client_profile
    
    pending_count = Hookup.objects.filter(
        receiver=client,
        approval_status="pending",
        is_deleted_by_receiver=False,
        is_deleted_by_sender=False
    ).count()
    
    return Response({
        "pending_count": pending_count
    })


# =========================
# APPROVE HOOKUP (with read status reset)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_hookup(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id, receiver=client)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found or you are not the receiver"}, status=404)
    
    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)
    
    if hookup.approval_status != "pending":
        return Response({"error": "Only pending requests can be approved"}, status=400)
    
    hookup.approval_status = "approved"
    hookup.approved_at = timezone.now()
    hookup.is_read_by_sender = False
    hookup.is_read_by_receiver = False
    
    hookup.save(update_fields=["approval_status", "approved_at", "is_read_by_sender", "is_read_by_receiver"])
    
    return Response({"message": "Hookup approved successfully"})


# =========================
# REJECT HOOKUP (with read status reset)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_hookup(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id, receiver=client)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found or you are not the receiver"}, status=404)
    
    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)
    
    if hookup.approval_status != "pending":
        return Response({"error": "Only pending requests can be rejected"}, status=400)
    
    hookup.approval_status = "rejected"
    hookup.rejected_at = timezone.now()
    hookup.is_read_by_sender = False
    hookup.is_read_by_receiver = False
    
    hookup.save(update_fields=["approval_status", "rejected_at", "is_read_by_sender", "is_read_by_receiver"])
    
    return Response({"message": "Hookup rejected successfully"})


# =========================
# MARK AS PAID (when payment is completed)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_hookup_as_paid(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id, sender=client)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found or you are not the sender"}, status=404)
    
    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)
    
    if hookup.approval_status != "approved":
        return Response({"error": "Only approved hookups can be paid"}, status=400)
    
    if hookup.payment_status == "paid":
        return Response({"error": "Hookup already paid"}, status=400)
    
    hookup.payment_status = "paid"
    hookup.paid_at = timezone.now()
    hookup.is_read_by_sender = False
    hookup.is_read_by_receiver = False
    
    hookup.save(update_fields=["payment_status", "paid_at", "is_read_by_sender", "is_read_by_receiver"])
    
    return Response({"message": "Payment completed successfully"})


# =========================
# DELETE HOOKUP - HIDE FROM EVERYONE
# =========================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_hookup(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found"}, status=404)
    
    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)
    
    if hookup.sender == client:
        if hookup.is_deleted_by_sender:
            return Response({"error": "Hookup already deleted"}, status=400)
        hookup.is_deleted_by_sender = True
    else:
        if hookup.is_deleted_by_receiver:
            return Response({"error": "Hookup already deleted"}, status=400)
        hookup.is_deleted_by_receiver = True
    
    hookup.save()
    
    return Response({"message": "Hookup deleted successfully"})


# =========================
# GET HOOKUP DETAILS
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_hookup_detail(request, hookup_id):
    client = request.user.client_profile
    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found"}, status=404)
    
    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)
    
    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)
    
    is_current_user_sender = hookup.sender == client
    
    serializer = HookupResponseSerializer(hookup, context={"request": request})
    data = serializer.data
    data["is_read_by_current_user"] = (
        hookup.is_read_by_sender if is_current_user_sender else hookup.is_read_by_receiver
    )
    
    return Response(data)