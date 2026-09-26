# connections/views.py
from django.db import models
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Connection
from .serializers import (
    ConnectionContactSerializer,
    ConnectionMiniSerializer,
)
from notification.models import Notification
from assignments.models import ClientAssignment
from account.models import Accounts

import logging

logger = logging.getLogger(__name__)


# ============================================
# INITIATE CONNECTION
# (the "Get Contact" / "Connect" button hits this)
# ============================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_connection_view(request, id):
    """
    Called when the current user clicks "Get Contact" / "Connect".

    The current user becomes the `sender` (initiator) and the
    target user (`id`) becomes the `receiver`.

    Body (optional):
        service_id (int) — when the connection comes from a
                           service listing (source="service").

    NOTE: The Connection is created WITHOUT a payment here.
    The frontend then calls /payments/initiate/ or
    /payments/service/initiate/ which creates the Payment and
    links it back to this connection. Once that happens, the
    connection's status mirrors the payment's status.
    """

    sender = request.user
    receiver_id = id
    service_id = request.data.get("service_id")

    logger.info(
        f"🔍 INITIATE CONNECTION - sender={sender.email} "
        f"(role={sender.role}) | receiver_id={receiver_id} | "
        f"service_id={service_id}"
    )

    # ---------- Only regular users can initiate ----------
    if sender.role not in ("user", "serviceseeker", "serviceprovider"):
        logger.warning(
            f"❌ Blocked - role '{sender.role}' cannot initiate."
        )
        role_display = dict(Accounts.ROLE_CHOICES).get(
            sender.role, sender.role
        )
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": (
                "Only regular users can initiate connections. "
                f"You are logged in as '{role_display}'."
            ),
            "status": "failed",
            "your_role": sender.role,
        }, status=status.HTTP_403_FORBIDDEN)

    # ---------- Find receiver ----------
    try:
        receiver = Accounts.objects.get(id=receiver_id)
    except Accounts.DoesNotExist:
        logger.warning(f"❌ Receiver not found: ID {receiver_id}")
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": "User not found",
            "status": "failed",
        }, status=status.HTTP_404_NOT_FOUND)

    # ---------- Block admin / superadmin ----------
    if receiver.role in ("admin", "superadmin"):
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": (
                "You cannot connect with an admin or super admin user."
            ),
            "status": "failed",
        }, status=status.HTTP_403_FORBIDDEN)

    # ---------- Block self ----------
    if sender.id == receiver.id:
        return Response({
            "success": False,
            "message": "Connection request failed",
            "error": "You cannot connect with yourself",
            "status": "failed",
        }, status=status.HTTP_400_BAD_REQUEST)

    # ---------- Existing active connection? ----------
    # Active = the linked payment is still pending (or no payment yet).
    existing = (
        Connection.objects
        .filter(
            models.Q(sender=sender, receiver=receiver) |
            models.Q(sender=receiver, receiver=sender),
        )
        .select_related("payment")
    )

    active_connection = None
    for conn in existing:
        if conn.is_pending:
            active_connection = conn
            break

    if active_connection:
        logger.info(
            f"ℹ️ Active connection exists: "
            f"{active_connection.connection_id} "
            f"(status={active_connection.status})"
        )
        return Response({
            "success": False,
            "message": "Cannot create connection",
            "error": (
                "An active connection already exists with status: "
                f"{active_connection.status_display}"
            ),
            "connection_id": str(active_connection.connection_id),
            "status": active_connection.status,
            "status_display": active_connection.status_display,
        }, status=status.HTTP_400_BAD_REQUEST)

    # ---------- Resolve optional service ----------
    service_obj = None
    if service_id:
        try:
            from services.models import ClientService
            service_obj = ClientService.objects.get(id=service_id)
        except Exception:
            logger.warning(f"Service not found: {service_id}")
            return Response({
                "success": False,
                "message": "Connection request failed",
                "error": "Service listing not found",
                "status": "failed",
            }, status=status.HTTP_404_NOT_FOUND)

        if getattr(service_obj, "provider_id", None) != receiver.id:
            return Response({
                "success": False,
                "message": "Connection request failed",
                "error": (
                    "The receiver does not own this service listing."
                ),
                "status": "failed",
            }, status=status.HTTP_400_BAD_REQUEST)

    # ---------- Create the connection (no payment yet) ----------
    try:
        connection = Connection.objects.create(
            sender=sender,
            receiver=receiver,
            source=(
                Connection.Source.SERVICE
                if service_obj else Connection.Source.HOOKUP
            ),
            service=service_obj,
        )

        if service_obj is None:
            Notification.objects.create(
                sender=sender,
                receiver=receiver,
                connection=connection,
                category=Notification.CATEGORY_HOOKUP,
                title="New Connection Request",
                message=(
                    f"{sender.full_name} wants to connect with you."
                ),
            )

        logger.info(
            f"✅ Connection created: {connection.connection_id} | "
            f"{sender.email} -> {receiver.email} | "
            f"source={connection.source}"
        )

        return Response({
            "success": True,
            "message": (
                f"Connection request sent to "
                f"{receiver.full_name} successfully!"
            ),
            "connection_id": str(connection.connection_id),
            "sender_id": sender.id,
            "sender_name": sender.full_name,
            "receiver_id": receiver.id,
            "receiver_name": receiver.full_name,
            "source": connection.source,
            "service_id": service_obj.id if service_obj else None,
            "status": connection.status,
            "status_display": connection.status_display,
            "created_at": connection.created_at,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"❌ Error creating connection: {str(e)}")
        return Response({
            "success": False,
            "message": "Failed to create connection",
            "error": str(e),
            "status": "failed",
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# GET CONNECTED USER CONTACT (ONLY IF PAID)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_connection_contact(request, connection_id):
    """
    Return the OTHER party's contact details for a specific
    connection, ONLY when the linked payment is completed.
    """

    user = request.user

    try:
        connection = Connection.objects.select_related(
            "sender",
            "receiver",
            "service",
            "payment",
        ).get(connection_id=connection_id)
    except Connection.DoesNotExist:
        return Response({
            "success": False,
            "message": "Connection not found",
            "error": "Invalid connection ID",
            "status": "failed",
        }, status=status.HTTP_404_NOT_FOUND)

    is_sender = connection.sender_id == user.id
    is_receiver = connection.receiver_id == user.id

    if not (is_sender or is_receiver):
        return Response({
            "success": False,
            "message": "Permission denied",
            "error": "You are not part of this connection",
            "status": "failed",
        }, status=status.HTTP_403_FORBIDDEN)

    if is_sender:
        connected_user = connection.receiver
        user_role = "sender"
    else:
        connected_user = connection.sender
        user_role = "receiver"

    # ---------- Gate on payment status ----------
    if not connection.is_paid:
        return Response({
            "success": False,
            "message": "Connection not completed",
            "error": (
                "Contact details are only available after the "
                "connection is paid and completed."
            ),
            "status": connection.status,
            "status_display": connection.status_display,
            "is_paid": False,
            "connection_id": str(connection.connection_id),
            "user_role": user_role,
        }, status=status.HTTP_402_PAYMENT_REQUIRED)

    payload = {
        "connection_id": str(connection.connection_id),
        "source": connection.source,
        "created_at": connection.created_at,
        "updated_at": connection.updated_at,
        "status": connection.status,
        "status_display": connection.status_display,
        "is_paid": connection.is_paid,
        "user_role": user_role,
        "connected_user": connected_user,
        "contact_details": {
            "phone_number": connected_user.phone_number or "",
            "email": connected_user.email or "",
            "full_name": connected_user.full_name or "",
        },
    }

    serializer = ConnectionContactSerializer(payload)

    return Response({
        "success": True,
        "message": "Contact details fetched successfully",
        "data": serializer.data,
    }, status=status.HTTP_200_OK)


# ============================================
# LIST MY CONNECTIONS
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_my_connections(request):
    """
    List every connection the current user is part of (as sender
    or receiver). Status comes from the linked payment.
    """

    user = request.user

    qs = (
        Connection.objects
        .filter(models.Q(sender=user) | models.Q(receiver=user))
        .select_related("sender", "receiver", "service", "payment")
        .order_by("-created_at")
    )

    return Response({
        "success": True,
        "message": "Connections fetched successfully",
        "count": qs.count(),
        "data": ConnectionMiniSerializer(qs, many=True).data,
    }, status=status.HTTP_200_OK)


# ============================================
# GET ADMIN HOOKUPS (For Admin Dashboard)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_admin_hookups(request):
    """Admin/superadmin: list connections for their clients."""
    user = request.user

    if user.role not in ("admin", "superadmin"):
        return Response({
            "message": "Access denied.",
            "status": "failed",
        }, status=status.HTTP_403_FORBIDDEN)

    if user.role == "superadmin":
        client_user_ids = Accounts.objects.filter(
            role="user"
        ).values_list("id", flat=True)
    else:
        client_user_ids = ClientAssignment.objects.filter(
            assigned_admin=user
        ).values_list("user_id", flat=True)

    if not client_user_ids:
        return Response({
            "message": "No clients found",
            "data": [],
            "count": 0,
            "status": "success",
        }, status=status.HTTP_200_OK)

    connections = (
        Connection.objects
        .filter(
            models.Q(sender_id__in=client_user_ids) |
            models.Q(receiver_id__in=client_user_ids) |
            models.Q(sender=user) |
            models.Q(receiver=user)
        )
        .select_related("sender", "receiver", "service", "payment")
        .order_by("-created_at")
    )

    data = []
    for conn in connections:
        data.append({
            "hookup_id": str(conn.connection_id),
            "sender_id": conn.sender.id,
            "sender_name": conn.sender.full_name,
            "sender_email": conn.sender.email,
            "sender_profile_image": conn.sender.profile_image_url,
            "receiver_id": conn.receiver.id,
            "receiver_name": conn.receiver.full_name,
            "receiver_email": conn.receiver.email,
            "receiver_profile_image": conn.receiver.profile_image_url,
            "source": conn.source,
            "status": conn.status,
            "status_display": conn.status_display,
            "payment_status": (
                conn.payment.status if conn.payment else None
            ),
            "amount_paid": (
                str(conn.payment.amount) if conn.payment else "0.00"
            ),
            "created_at": conn.created_at,
            "updated_at": conn.updated_at,
        })

    return Response({
        "message": f"Found {len(data)} hookups",
        "data": data,
        "count": len(data),
        "status": "success",
    }, status=status.HTTP_200_OK)