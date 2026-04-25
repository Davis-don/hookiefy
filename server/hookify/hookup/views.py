from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Q
from django.utils import timezone

from .models import Hookup
from .serializers import CreateHookupSerializer, HookupResponseSerializer


# =========================
# 🔐 CUSTOM PERMISSION (🔥 FIX)
# =========================
class IsClientUser(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "client_profile")


def get_client(request):
    return request.user.client_profile


# =========================
# CREATE HOOKUP
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClientUser])
def create_hookup(request):
    sender = get_client(request)

    serializer = CreateHookupSerializer(
        data=request.data,
        context={"sender": sender}
    )

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
    }, status=status.HTTP_201_CREATED)


# =========================
# MY HOOKUPS (🔥 FIXED)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClientUser])
def my_hookups(request):
    client = get_client(request)

    sent_queryset = Hookup.objects.filter(
        sender=client,
        is_deleted_by_sender=False,
        is_deleted_by_receiver=False
    ).select_related(
        "sender__user",
        "receiver__user"
    ).prefetch_related(
        "sender__bio",
        "receiver__bio"
    ).order_by("-created_at")

    received_queryset = Hookup.objects.filter(
        receiver=client,
        is_deleted_by_receiver=False,
        is_deleted_by_sender=False
    ).select_related(
        "sender__user",
        "receiver__user"
    ).prefetch_related(
        "sender__bio",
        "receiver__bio"
    ).order_by("-created_at")

    def serialize_hookup(hookup, role):
        is_sender = hookup.sender == client

        return {
            "id": hookup.id,
            "message": hookup.message,
            "location": hookup.location,
            "scheduled_time": hookup.scheduled_time,
            "payment_status": hookup.payment_status,
            "approval_status": hookup.approval_status,
            "is_paid": hookup.payment_status == "paid",
            "is_read_by_current_user": (
                hookup.is_read_by_sender if is_sender else hookup.is_read_by_receiver
            ),
            "created_at": hookup.created_at,
            "approved_at": hookup.approved_at,
            "rejected_at": hookup.rejected_at,
            "paid_at": hookup.paid_at,
            "sender_id": hookup.sender.id,
            "receiver_id": hookup.receiver.id,
            "sender_name": hookup.sender.user.get_full_name() or hookup.sender.user.email,
            "receiver_name": hookup.receiver.user.get_full_name() or hookup.receiver.user.email,
            "sender_image": getattr(hookup.sender.bio, "uploaded_img", None),
            "receiver_image": getattr(hookup.receiver.bio, "uploaded_img", None),
            "role": role
        }

    return Response({
        "sent": [serialize_hookup(h, "sent") for h in sent_queryset],
        "received": [serialize_hookup(h, "received") for h in received_queryset],
        "total_sent": sent_queryset.count(),
        "total_received": received_queryset.count(),
    })


# =========================
# PARTNER DETAILS
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClientUser])
def get_hookup_partner_details(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found"}, status=404)

    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)

    if hookup.is_deleted_by_sender or hookup.is_deleted_by_receiver:
        return Response({"error": "Hookup has been deleted"}, status=404)

    partner = hookup.receiver if hookup.sender == client else hookup.sender

    return Response({
        "full_name": partner.user.get_full_name() or partner.user.email,
        "email": partner.user.email,
        "phone_number": getattr(partner.bio, "phone_number", "Not provided"),
        "hookup_status": hookup.approval_status,
        "payment_status": hookup.payment_status,
        "hookup_id": hookup.id
    })


# =========================
# UNREAD COUNT
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClientUser])
def get_unread_count(request):
    client = get_client(request)

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

    return Response({
        "unread_count": sent_unread + received_unread,
        "sent_unread": sent_unread,
        "received_unread": received_unread
    })


# =========================
# MARK AS READ
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClientUser])
def mark_hookup_as_read(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Hookup not found"}, status=404)

    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)

    if hookup.sender == client:
        hookup.is_read_by_sender = True
        hookup.save(update_fields=["is_read_by_sender"])
    else:
        hookup.is_read_by_receiver = True
        hookup.save(update_fields=["is_read_by_receiver"])

    return Response({"message": "Marked as read"})


# =========================
# APPROVE
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClientUser])
def approve_hookup(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id, receiver=client)
    except Hookup.DoesNotExist:
        return Response({"error": "Not allowed"}, status=404)

    if hookup.approval_status != "pending":
        return Response({"error": "Invalid state"}, status=400)

    hookup.approval_status = "approved"
    hookup.approved_at = timezone.now()
    hookup.save()

    return Response({"message": "Approved"})


# =========================
# REJECT
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClientUser])
def reject_hookup(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id, receiver=client)
    except Hookup.DoesNotExist:
        return Response({"error": "Not allowed"}, status=404)

    hookup.approval_status = "rejected"
    hookup.rejected_at = timezone.now()
    hookup.save()

    return Response({"message": "Rejected"})


# =========================
# MARK PAID
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated, IsClientUser])
def mark_hookup_as_paid(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id, sender=client)
    except Hookup.DoesNotExist:
        return Response({"error": "Not allowed"}, status=404)

    hookup.payment_status = "paid"
    hookup.paid_at = timezone.now()
    hookup.save()

    return Response({"message": "Payment successful"})


# =========================
# DELETE
# =========================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsClientUser])
def delete_hookup(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hookup.sender == client:
        hookup.is_deleted_by_sender = True
    elif hookup.receiver == client:
        hookup.is_deleted_by_receiver = True
    else:
        return Response({"error": "Not authorized"}, status=403)

    hookup.save()
    return Response({"message": "Deleted"})


# =========================
# DETAIL
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClientUser])
def get_hookup_detail(request, hookup_id):
    client = get_client(request)

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hookup.sender != client and hookup.receiver != client:
        return Response({"error": "Not authorized"}, status=403)

    data = HookupResponseSerializer(hookup, context={"request": request}).data
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsClientUser])
def pending_hookup_count(request):
    client = get_client(request)

    pending_count = Hookup.objects.filter(
        receiver=client,
        approval_status="pending",
        is_deleted_by_receiver=False,
        is_deleted_by_sender=False
    ).count()

    return Response({
        "pending_count": pending_count
    })