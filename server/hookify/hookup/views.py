from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import Hookup
from accounts.models import ClientProfile


# =========================
# CREATE HOOKUP 🔥
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_hookup(request):
    sender = request.user.client_profile
    receiver_id = request.data.get("receiver_id")

    if not receiver_id:
        return Response({"error": "receiver_id is required"}, status=400)

    try:
        receiver = ClientProfile.objects.get(id=receiver_id)
    except ClientProfile.DoesNotExist:
        return Response({"error": "Receiver not found"}, status=404)

    # ❌ Prevent self-request
    if sender == receiver:
        return Response({"error": "You cannot hookup with yourself"}, status=400)

    # ❌ Check for existing pending request
    existing = Hookup.objects.filter(
        sender=sender,
        receiver=receiver,
        status="pending"
    ).first()

    if existing:
        return Response(
            {"message": "You already requested this hookup"},
            status=400
        )

    # ✅ Create new request
    hookup = Hookup.objects.create(
        sender=sender,
        receiver=receiver
    )

    return Response({
        "message": "Hookup request sent",
        "hookup_id": hookup.id
    }, status=201)


# =========================
# MY HOOKUPS
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_hookups(request):
    client = request.user.client_profile

    sent = Hookup.objects.filter(sender=client)
    received = Hookup.objects.filter(receiver=client)

    return Response({
        "sent": [
            {
                "id": h.id,
                "receiver": h.receiver.user.email,
                "status": h.status,
                "payment_status": h.payment_status,
                "created_at": h.created_at
            } for h in sent
        ],
        "received": [
            {
                "id": h.id,
                "sender": h.sender.user.email,
                "status": h.status,
                "payment_status": h.payment_status,
                "created_at": h.created_at
            } for h in received
        ]
    })


# =========================
# ACCEPT ✅ (ONLY RECEIVER)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def accept_hookup(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # 🔒 Only receiver can accept
    if hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    if hookup.status != "pending":
        return Response({"error": "Hookup already processed"}, status=400)

    hookup.status = "accepted"
    hookup.responded_at = timezone.now()
    hookup.save()

    return Response({"message": "Hookup accepted"})


# =========================
# REJECT ❌ (ONLY RECEIVER)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_hookup(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # 🔒 Only receiver can reject
    if hookup.receiver != client:
        return Response({"error": "Not allowed"}, status=403)

    if hookup.status != "pending":
        return Response({"error": "Hookup already processed"}, status=400)

    hookup.status = "rejected"
    hookup.responded_at = timezone.now()
    hookup.save()

    return Response({"message": "Hookup rejected"})


# =========================
# CANCEL 🚫 (ONLY SENDER)
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_hookup(request, hookup_id):
    client = request.user.client_profile

    try:
        hookup = Hookup.objects.get(id=hookup_id)
    except Hookup.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # 🔒 Only sender can cancel
    if hookup.sender != client:
        return Response({"error": "Not allowed"}, status=403)

    if hookup.status != "pending":
        return Response({"error": "Cannot cancel this hookup"}, status=400)

    hookup.status = "cancelled"
    hookup.save()

    return Response({"message": "Hookup cancelled"})