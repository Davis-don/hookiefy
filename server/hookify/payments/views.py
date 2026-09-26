# payments/views.py
# ============================================================
# COMPLETE PAYMENT VIEWS
# ============================================================

from decimal import Decimal
import uuid
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone
from django.shortcuts import redirect
from django.conf import settings
from django.db import connection as db_connection, close_old_connections
from django.db.utils import OperationalError, InterfaceError
from django.db import models

from assignments.models import ClientAssignment
from administration.models import PlatformConfig
from paymentconfigurations.models import PaymentConfiguration
from connections.models import Connection
from payments.models import Payment
from notification.models import Notification
from account.models import Accounts

from UserBalance.models import UserBalance

from .services.register_ipn import register_ipn_url
from .services.submit_order import submit_order
from .services.get_transaction_status import get_transaction_status
from .services.check_superadmin import SuperAdminValidator
from .services.commission_service import (
    CommissionService,
    CommissionDistributionError,
)

from services.models import ClientService


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# NOTIFICATION HELPERS
# ============================================================

def notify(
    receiver,
    title,
    message,
    category=Notification.CATEGORY_PAYMENT,
    sender=None,
    connection=None,
):
    """
    Safe notification creator. Never breaks the payment flow.
    """
    try:
        return Notification.objects.create(
            sender=sender,
            receiver=receiver,
            category=category,
            connection=connection,
            title=title,
            message=message,
            is_read=False,
        )
    except Exception as e:
        logger.error(
            f"❌ Failed to create notification "
            f"(receiver={getattr(receiver, 'id', receiver)}, "
            f"title='{title}'): {str(e)}",
            exc_info=True,
        )
        return None


def get_superadmin():
    """Return the first active superadmin, or None."""
    try:
        return (
            Accounts.objects
            .filter(role="superadmin", is_active=True)
            .first()
        )
    except Exception as e:
        logger.error(f"❌ Failed to fetch superadmin: {str(e)}")
        return None


# ============================================================
# FRONTEND URL HELPER
# ============================================================

def get_frontend_url(path):
    frontend_url = getattr(settings, "FRONTEND_URL", None)
    if not frontend_url:
        logger.error(
            "❌ FRONTEND_URL is not configured in Django settings."
        )
        raise ValueError(
            "FRONTEND_URL is not configured in Django settings."
        )
    frontend_url = frontend_url.rstrip("/")
    return f"{frontend_url}/{path.lstrip('/')}"


# ============================================================
# PESAPAL CONFIGURATION HELPER
# ============================================================

def get_pesapal_configuration():
    try:
        config = PaymentConfiguration.objects.filter(
            gateway_name__iexact="Pesapal",
            is_active=True,
        ).first()

        if config:
            logger.info(
                "✅ Pesapal configuration found | "
                f"ID={config.id} | "
                f"Gateway={config.gateway_name} | "
                f"Active={config.is_active}"
            )
            return config

        available_configs = list(
            PaymentConfiguration.objects.values(
                "id", "gateway_name", "is_active"
            )
        )
        logger.error(
            "❌ No active Pesapal configuration found. "
            f"Available configurations: {available_configs}"
        )
        return None

    except Exception as e:
        logger.error(
            f"❌ Error loading Pesapal configuration: {str(e)}",
            exc_info=True,
        )
        return None


# ============================================================
# DATABASE CONNECTION HELPER
# ============================================================

def ensure_db_connection():
    try:
        close_old_connections()
        db_connection.ensure_connection()

        with db_connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        return True

    except (OperationalError, InterfaceError) as e:
        logger.warning(
            f"⚠️ Database connection error detected: {str(e)}"
        )
        try:
            db_connection.close()
            db_connection.ensure_connection()

            with db_connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            logger.info("✅ Database reconnected successfully")
            return True
        except Exception as reconnect_error:
            logger.error(
                "❌ Failed to reconnect to database: "
                f"{str(reconnect_error)}"
            )
            return False

    except Exception as e:
        logger.error(f"❌ Unexpected database error: {str(e)}")
        return False


# ============================================================
# DATABASE HEALTH CHECK
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def database_health_check(request):

    try:
        close_old_connections()

        health_status = {
            "status": "ok",
            "database": "connected",
            "timestamp": timezone.now().isoformat(),
            "details": {},
        }

        try:
            db_connection.ensure_connection()

            with db_connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        version(),
                        current_database(),
                        current_user,
                        now(),
                        pg_postmaster_start_time()
                """)
                row = cursor.fetchone()

                health_status["details"] = {
                    "version": row[0] if row else "Unknown",
                    "database_name": row[1] if row else "Unknown",
                    "user": row[2] if row else "Unknown",
                    "current_time": row[3] if row else "Unknown",
                    "postmaster_start": row[4] if row else "Unknown",
                }

                cursor.execute("""
                    SELECT
                        count(*) AS total_connections,
                        count(*) FILTER (
                            WHERE state = 'active'
                        ) AS active_connections,
                        count(*) FILTER (
                            WHERE state = 'idle'
                        ) AS idle_connections
                    FROM pg_stat_activity
                """)
                stats = cursor.fetchone()

                health_status["details"]["connections"] = {
                    "total": stats[0] if stats else 0,
                    "active": stats[1] if stats else 0,
                    "idle": stats[2] if stats else 0,
                }

            health_status["status"] = "healthy"

        except (OperationalError, InterfaceError) as e:
            health_status["status"] = "error"
            health_status["database"] = "disconnected"
            health_status["error"] = str(e)
            health_status["reconnecting"] = False

            try:
                db_connection.close()
                db_connection.ensure_connection()
                health_status["reconnecting"] = True
                health_status["reconnection_status"] = "success"
            except Exception as reconnect_error:
                health_status["reconnection_status"] = "failed"
                health_status["reconnection_error"] = str(
                    reconnect_error
                )

        return Response(health_status, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Database health check error: {str(e)}")
        return Response(
            {
                "status": "error",
                "message": str(e),
                "timestamp": timezone.now().isoformat(),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# CHECK SUPERADMIN STATUS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_superadmin_status(request):

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": (
                    "Service temporarily unavailable. "
                    "Please try again."
                ),
                "error_code": "DB_CONNECTION_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    status_data = SuperAdminValidator.get_superadmin_status()

    if status_data.get("can_initiate_payment"):
        return Response(
            {
                "success": True,
                "message": "Payment service is ready.",
                "can_initiate": True,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            "success": False,
            "message": (
                "Payment service is currently unavailable. "
                "Please try again later."
            ),
            "can_initiate": False,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


# ============================================================
# INITIATE PAYMENT (CONNECTION / HOOKUP)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Initiate a payment for a connection / hookup.

    Body:
        connection_id   (uuid)  — optional if receiver_id is provided
        receiver_id     (int)   — optional if connection_id is provided
        phone_number    (str)   — required
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": (
                    "Service temporarily unavailable. "
                    "Please try again."
                ),
                "error_code": "DB_CONNECTION_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    user = request.user
    connection_id = request.data.get("connection_id")
    receiver_id = request.data.get("receiver_id")
    phone_number = request.data.get("phone_number")

    if not connection_id and not receiver_id:
        return Response(
            {
                "success": False,
                "message": (
                    "Invalid request. Provide connection_id or "
                    "receiver_id."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not phone_number:
        return Response(
            {
                "success": False,
                "message": "Invalid request. Missing phone_number.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    eligible, message, data = (
        SuperAdminValidator.check_payment_eligibility()
    )

    if not eligible:
        logger.error(f"❌ Payment blocked: {message}")
        return Response(
            {
                "success": False,
                "message": (
                    "Payment service is currently unavailable. "
                    "Please try again later."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # Resolve / create the Connection
    # --------------------------------------------------------
    connection_obj = None
    connection_created = False

    if connection_id:
        try:
            connection_obj = Connection.objects.get(
                connection_id=connection_id
            )
        except Connection.DoesNotExist:
            logger.warning(f"Connection not found: {connection_id}")
            return Response(
                {
                    "success": False,
                    "message": "Payment initiation failed.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if connection_obj.sender_id != user.id:
            logger.warning(
                f"User {user.email} attempted to pay for "
                "a connection they don't own."
            )
            return Response(
                {
                    "success": False,
                    "message": "Payment initiation failed.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    else:
        try:
            receiver = Accounts.objects.get(id=receiver_id)
        except Accounts.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Payment initiation failed.",
                    "error": "Target user not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if receiver.id == user.id:
            return Response(
                {
                    "success": False,
                    "message": "Payment initiation failed.",
                    "error": "You cannot pay to connect with yourself.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if receiver.role in ("admin", "superadmin"):
            return Response(
                {
                    "success": False,
                    "message": "Payment initiation failed.",
                    "error": (
                        "You cannot connect with an admin or "
                        "super admin user."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        connection_obj = Connection.objects.create(
            sender=user,
            receiver=receiver,
            source=Connection.Source.HOOKUP,
        )
        connection_created = True
        logger.info(
            f"✅ Connection created: {connection_obj.connection_id} | "
            f"{user.email} -> {receiver.email} | source=hookup"
        )

    # --------------------------------------------------------
    # Already-paid guard
    # --------------------------------------------------------
    if Payment.objects.filter(
        connection=connection_obj,
        status="completed",
    ).exists():
        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. "
                    "This connection has already been paid for."
                ),
                "connection_id": str(connection_obj.connection_id),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # Fee lookup
    # --------------------------------------------------------
    try:
        assignment = ClientAssignment.objects.get(user=user)
        assigned_admin = assignment.assigned_admin
    except ClientAssignment.DoesNotExist:
        logger.warning(f"No assignment found for user: {user.email}")
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        platform_config = PlatformConfig.objects.get(
            owner=assigned_admin
        )
        hookup_fee = Decimal(str(platform_config.hookup_fee))
    except PlatformConfig.DoesNotExist:
        logger.warning(
            f"No platform config for admin: {assigned_admin.email}"
        )
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_config = get_pesapal_configuration()
    if not payment_config:
        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. "
                    "Please try again later."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    merchant_reference = f"HOOK-{uuid.uuid4().hex[:12].upper()}"

    # --------------------------------------------------------
    # Create the Payment
    # --------------------------------------------------------
    try:
        payment = Payment.objects.create(
            user=user,
            connection=connection_obj,
            payment_type=Payment.PAYMENT_TYPE_CONNECTION,
            merchant_reference=merchant_reference,
            amount=hookup_fee,
            phone_number=phone_number,
            status="pending",
        )
    except Exception as e:
        logger.error(
            f"❌ Failed to create payment: {str(e)}",
            exc_info=True,
        )
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # Link payment back on the connection
    # --------------------------------------------------------
    if connection_obj.payment_id != payment.id:
        connection_obj.payment = payment
        connection_obj.save(update_fields=["payment"])

    # --------------------------------------------------------
    # Notifications
    # --------------------------------------------------------
    notify(
        receiver=user,
        sender=None,
        category=Notification.CATEGORY_PAYMENT,
        connection=connection_obj,
        title="Payment Initiated ⏳",
        message=(
            f"Your payment of KES {payment.amount} for connection "
            f"with {connection_obj.receiver.full_name} has been "
            f"initiated. Reference: {payment.merchant_reference}. "
            "Complete it to activate your connection."
        ),
    )

    notify(
        receiver=connection_obj.receiver,
        sender=user,
        category=Notification.CATEGORY_HOOKUP,
        connection=connection_obj,
        title="Connection Payment Pending ⏳",
        message=(
            f"{user.full_name} has initiated payment to connect "
            f"with you. You'll be notified once payment is "
            "completed."
        ),
    )

    # --------------------------------------------------------
    # Submit to Pesapal
    # --------------------------------------------------------
    try:
        pesapal_response = submit_order(
            payment=payment,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
        )
    except Exception as e:
        payment.status = "failed"
        payment.save(update_fields=["status"])

        notify(
            receiver=user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            connection=connection_obj,
            title="Payment Failed ❌",
            message=(
                f"We couldn't reach the payment gateway for your "
                f"connection with "
                f"{connection_obj.receiver.full_name}. "
                "Please try again."
            ),
        )

        logger.error(
            f"❌ Pesapal submit order error: {str(e)}",
            exc_info=True,
        )
        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. Please try again."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if (
        not pesapal_response
        or pesapal_response.get("status") != "200"
    ):
        payment.status = "failed"
        payment.save(update_fields=["status"])

        notify(
            receiver=user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            connection=connection_obj,
            title="Payment Failed ❌",
            message=(
                f"Your payment of KES {payment.amount} could not "
                "be initiated. Please try again."
            ),
        )

        logger.error(
            f"❌ Pesapal response error: {pesapal_response}"
        )
        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. Please try again."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment.order_tracking_id = pesapal_response.get(
        "order_tracking_id"
    )
    payment.save(update_fields=["order_tracking_id"])

    logger.info(
        "✅ Payment initiated successfully | "
        f"Payment ID={payment.id} | "
        f"Connection ID={connection_obj.connection_id} | "
        f"Tracking ID={payment.order_tracking_id}"
    )

    return Response(
        {
            "success": True,
            "message": "Payment initiated successfully.",
            "payment": {
                "id": payment.id,
                "merchant_reference": payment.merchant_reference,
                "amount": payment.amount,
                "status": payment.status,
                "payment_type": payment.payment_type,
                "order_tracking_id": payment.order_tracking_id,
            },
            "connection": {
                "connection_id": str(connection_obj.connection_id),
                "source": connection_obj.source,
                "status": connection_obj.status,
                "status_display": connection_obj.status_display,
                "is_paid": connection_obj.is_paid,
                "created": connection_created,
            },
            "redirect_url": pesapal_response.get("redirect_url"),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# INITIATE SERVICE PAYMENT (CONTACT REVEAL)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_service_payment(request):
    """
    Initiate a payment to reveal a provider's contact details.
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
                "error_code": "DB_CONNECTION_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    user = request.user
    service_id = request.data.get("service_id")
    phone_number = request.data.get("phone_number")

    if not service_id or not phone_number:
        return Response(
            {
                "success": False,
                "message": "service_id and phone_number are required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    eligible, message, data = (
        SuperAdminValidator.check_payment_eligibility()
    )

    if not eligible:
        logger.error(f"❌ Service payment blocked: {message}")
        return Response(
            {
                "success": False,
                "message": (
                    "Payment service is currently unavailable. "
                    "Please try again later."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        service = ClientService.objects.get(id=service_id)
    except ClientService.DoesNotExist:
        logger.warning(f"ClientService not found: {service_id}")
        return Response(
            {"success": False, "message": "Listing not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if service.provider_id == user.id:
        return Response(
            {
                "success": False,
                "message": (
                    "This is your own listing — no payment needed."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if Payment.objects.filter(
        user=user,
        service=service,
        status="completed",
    ).exists():
        return Response(
            {
                "success": False,
                "message": "You already unlocked this contact.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        platform_config = PlatformConfig.objects.first()
        hookup_fee = Decimal(str(platform_config.connection_fee))
    except (PlatformConfig.DoesNotExist, AttributeError):
        logger.warning("No global PlatformConfig found.")
        return Response(
            {"success": False, "message": "Contact fee not configured."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_config = get_pesapal_configuration()
    if not payment_config:
        return Response(
            {
                "success": False,
                "message": "Payment service unavailable.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # Create the Connection
    # --------------------------------------------------------
    connection_obj = Connection.objects.create(
        sender=user,
        receiver=service.provider,
        source=Connection.Source.SERVICE,
        service=service,
    )

    logger.info(
        f"✅ Connection created: {connection_obj.connection_id} | "
        f"{user.email} -> {service.provider.email} | source=service"
    )

    merchant_reference = f"SVC-{uuid.uuid4().hex[:12].upper()}"

    try:
        payment = Payment.objects.create(
            user=user,
            service=service,
            connection=connection_obj,
            payment_type=Payment.PAYMENT_TYPE_SERVICE,
            merchant_reference=merchant_reference,
            amount=hookup_fee,
            phone_number=phone_number,
            status="pending",
        )
    except Exception:
        logger.exception("❌ Failed to create service payment.")
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # Link payment back on the connection
    # --------------------------------------------------------
    if connection_obj.payment_id != payment.id:
        connection_obj.payment = payment
        connection_obj.save(update_fields=["payment"])

    # --------------------------------------------------------
    # Notifications
    # --------------------------------------------------------
    notify(
        receiver=user,
        sender=None,
        category=Notification.CATEGORY_PAYMENT,
        connection=connection_obj,
        title="Contact Unlock Payment Initiated ⏳",
        message=(
            f"Your payment of KES {payment.amount} to unlock the "
            f"contact for '{service.title or 'listing'}' has been "
            f"initiated. Reference: {payment.merchant_reference}."
        ),
    )

    if getattr(service, "provider", None):
        notify(
            receiver=service.provider,
            sender=user,
            category=Notification.CATEGORY_SERVICE,
            connection=connection_obj,
            title="Someone wants to unlock your contact 👀",
            message=(
                f"{user.full_name} is initiating payment to unlock "
                f"your contact details for "
                f"'{service.title or 'your listing'}'."
            ),
        )

    # --------------------------------------------------------
    # Submit to Pesapal
    # --------------------------------------------------------
    try:
        pesapal_response = submit_order(
            payment=payment,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
        )
    except Exception:
        payment.status = "failed"
        payment.save(update_fields=["status"])

        notify(
            receiver=user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            title="Contact Unlock Failed ❌",
            message=(
                f"Your payment of KES {payment.amount} to unlock a "
                "contact could not be initiated. Please try again."
            ),
        )

        logger.exception("❌ Pesapal submit order error (service).")
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if (
        not pesapal_response
        or pesapal_response.get("status") != "200"
    ):
        payment.status = "failed"
        payment.save(update_fields=["status"])

        notify(
            receiver=user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            title="Contact Unlock Failed ❌",
            message=(
                f"Your payment of KES {payment.amount} to unlock a "
                "contact failed to start. Please try again."
            ),
        )

        logger.error(
            f"❌ Pesapal response error (service): {pesapal_response}"
        )
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment.order_tracking_id = pesapal_response.get(
        "order_tracking_id"
    )
    payment.save(update_fields=["order_tracking_id"])

    logger.info(
        "✅ Service payment initiated | "
        f"Payment ID={payment.id} | "
        f"Service ID={service.id} | "
        f"Connection ID={connection_obj.connection_id} | "
        f"Tracking ID={payment.order_tracking_id}"
    )

    return Response(
        {
            "success": True,
            "message": "Payment initiated.",
            "payment": {
                "id": payment.id,
                "merchant_reference": payment.merchant_reference,
                "amount": payment.amount,
                "status": payment.status,
                "payment_type": payment.payment_type,
                "order_tracking_id": payment.order_tracking_id,
            },
            "connection": {
                "connection_id": str(connection_obj.connection_id),
                "source": connection_obj.source,
                "status": connection_obj.status,
                "status_display": connection_obj.status_display,
                "is_paid": connection_obj.is_paid,
                "created": True,
            },
            "redirect_url": pesapal_response.get("redirect_url"),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# INTERNAL: FINALIZE COMPLETED PAYMENT
# ============================================================

def _finalize_completed_payment(payment):
    """
    Shared success-handler used by both the IPN callback and the
    /payment-success redirect. Idempotent: only runs once per payment.

    Because the Connection reads its status from its linked Payment,
    simply setting payment.status = "completed" is enough.
    """

    result = {"commission_result": None}

    # ---------- SERVICE PAYMENT ----------
    if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
        if payment.status != "completed":
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at"])

        connection_obj = payment.connection

        try:
            commission_result = (
                CommissionService
                .distribute_commission_for_payment(payment)
            )
        except CommissionDistributionError as e:
            commission_result = {
                "success": False,
                "error": str(e),
            }
            logger.error(
                f"❌ Service commission failed: {str(e)}"
            )

        result["commission_result"] = commission_result

        notify(
            receiver=payment.user,
            sender=None,
            category=Notification.CATEGORY_PAYMENT,
            connection=connection_obj,
            title="Contact Unlocked! 🎉",
            message=(
                "Your payment was successful. You can now view the "
                f"provider's contact details for "
                f"'{payment.service.title if payment.service else 'listing'}'."
            ),
        )

        if payment.service and getattr(
            payment.service, "provider", None
        ):
            notify(
                receiver=payment.service.provider,
                sender=payment.user,
                category=Notification.CATEGORY_SERVICE,
                connection=connection_obj,
                title="Contact Unlocked 💰",
                message=(
                    f"{payment.user.full_name} has paid to unlock "
                    f"your contact details for "
                    f"'{payment.service.title or 'your listing'}'."
                ),
            )

        if (
            commission_result
            and commission_result.get("success")
            and commission_result.get("superadmin_amount", 0) > 0
        ):
            superadmin = get_superadmin()
            if superadmin:
                notify(
                    receiver=superadmin,
                    sender=None,
                    category=Notification.CATEGORY_PAYMENT,
                    title="💰 Platform Commission Received",
                    message=(
                        "Platform received KES "
                        f"{commission_result.get('superadmin_amount', 0):.2f} "
                        "from a service contact unlock."
                    ),
                )

        return result

    # ---------- CONNECTION PAYMENT ----------
    connection_obj = payment.connection

    if connection_obj is None:
        logger.error(
            "❌ Connection payment has no connection attached. "
            f"Payment ID={payment.id}"
        )
        return result

    if payment.status != "completed":
        payment.status = "completed"
        payment.paid_at = timezone.now()
        payment.save(update_fields=["status", "paid_at"])

    try:
        commission_result = (
            CommissionService
            .distribute_commission_for_payment(payment)
        )
    except CommissionDistributionError as e:
        commission_result = {
            "success": False,
            "error": str(e),
        }
        logger.error(
            f"❌ Commission distribution failed: {str(e)}"
        )

    result["commission_result"] = commission_result

    notify(
        receiver=connection_obj.sender,
        sender=None,
        category=Notification.CATEGORY_PAYMENT,
        connection=connection_obj,
        title="Payment Successful! 🎉",
        message=(
            f"Your payment of KES {payment.amount} for connection "
            f"with {connection_obj.receiver.full_name} has been "
            "completed successfully. Your connection is now active!"
        ),
    )

    admin_amount = (
        commission_result.get("admin_amount", 0)
        if commission_result and commission_result.get("success")
        else 0
    )

    if admin_amount > 0:
        receiver_message = (
            f"{connection_obj.sender.full_name} has completed payment "
            "to connect with you. You have received KES "
            f"{admin_amount:.2f} as your commission."
        )
    else:
        receiver_message = (
            f"{connection_obj.sender.full_name} has completed payment "
            "to connect with you. The connection is now ready."
        )

    notify(
        receiver=connection_obj.receiver,
        sender=connection_obj.sender,
        category=Notification.CATEGORY_HOOKUP,
        connection=connection_obj,
        title="New Completed Connection! 🎉",
        message=receiver_message,
    )

    if (
        commission_result
        and commission_result.get("success")
        and commission_result.get("superadmin_amount", 0) > 0
    ):
        superadmin = get_superadmin()
        if superadmin:
            notify(
                receiver=superadmin,
                sender=None,
                category=Notification.CATEGORY_PAYMENT,
                connection=connection_obj,
                title="💰 Platform Commission Received",
                message=(
                    "Platform received KES "
                    f"{commission_result.get('superadmin_amount', 0):.2f} "
                    f"from {connection_obj.sender.full_name}'s payment."
                ),
            )

    Notification.objects.filter(
        connection=connection_obj,
        receiver=connection_obj.sender,
        category__in=[
            Notification.CATEGORY_HOOKUP,
            Notification.CATEGORY_PAYMENT,
        ],
        is_read=False,
    ).update(is_read=True, read_at=timezone.now())

    return result


# ============================================================
# PESAPAL IPN CALLBACK
# ============================================================

@api_view(["GET", "POST"])
def ipn_callback(request):
    """
    Handle Pesapal IPN callbacks.
    """

    if not ensure_db_connection():
        logger.error(
            "❌ Database connection error in IPN callback"
        )
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    data = (
        request.query_params
        if request.method == "GET"
        else request.data
    )

    logger.info("=" * 60)
    logger.info("PESAPAL IPN")
    logger.info(data)
    logger.info("=" * 60)

    order_tracking_id = (
        data.get("OrderTrackingId")
        or data.get("orderTrackingId")
        or data.get("order_tracking_id")
    )

    if not order_tracking_id:
        logger.error("Missing order tracking id in IPN")
        return Response(
            {
                "success": False,
                "message": "Invalid IPN notification.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )
    except Payment.DoesNotExist:
        logger.error(
            "❌ Payment not found for tracking ID: "
            f"{order_tracking_id}"
        )
        return Response(
            {"success": False, "message": "Payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        verification = get_transaction_status(order_tracking_id)
        payment_status = verification.get(
            "payment_status_description"
        )

        logger.info(f"Verified payment status: {payment_status}")

        commission_result = None

        if payment_status == "Completed":
            result = _finalize_completed_payment(payment)
            commission_result = result.get("commission_result")

            logger.info(
                f"✅ Payment {order_tracking_id} finalized (IPN)"
            )

            return Response(
                {
                    "success": True,
                    "message": "IPN processed.",
                    "payment_status": payment.status,
                    "payment_type": payment.payment_type,
                    "service_id": payment.service_id,
                    "connection_id": (
                        str(payment.connection.connection_id)
                        if payment.connection
                        else None
                    ),
                    "commission_distribution": (
                        commission_result
                        if commission_result
                        else None
                    ),
                },
                status=status.HTTP_200_OK,
            )

        elif payment_status == "Failed":
            payment.status = "failed"
            payment.save(update_fields=["status"])

            if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
                notify(
                    receiver=payment.user,
                    sender=None,
                    category=Notification.CATEGORY_PAYMENT,
                    connection=payment.connection,
                    title="Contact Unlock Failed ❌",
                    message=(
                        f"Your payment of KES {payment.amount} to "
                        "unlock a contact failed. Please try again."
                    ),
                )
            else:
                notify(
                    receiver=payment.user,
                    sender=None,
                    category=Notification.CATEGORY_PAYMENT,
                    connection=payment.connection,
                    title="Payment Failed ❌",
                    message=(
                        f"Your payment of KES {payment.amount} "
                        "failed. Please try again or contact support."
                    ),
                )

            logger.info("❌ IPN: Payment failed")

        elif payment_status == "Cancelled":
            payment.status = "cancelled"
            payment.save(update_fields=["status"])

            notify(
                receiver=payment.user,
                sender=None,
                category=Notification.CATEGORY_PAYMENT,
                connection=payment.connection,
                title="Payment Cancelled ⚠️",
                message=(
                    f"Your payment of KES {payment.amount} was "
                    "cancelled. You can retry anytime."
                ),
            )

            logger.info("⚠️ IPN: Payment cancelled")

        else:
            payment.status = "pending"
            payment.save(update_fields=["status"])
            logger.info("⏳ IPN: Payment still pending")

        return Response(
            {
                "success": True,
                "message": "IPN processed.",
                "payment_status": payment.status,
                "payment_type": payment.payment_type,
                "connection_id": (
                    str(payment.connection.connection_id)
                    if payment.connection
                    else None
                ),
                "service_id": payment.service_id,
                "commission_distribution": (
                    commission_result
                    if commission_result
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(
            f"❌ IPN processing error: {str(e)}",
            exc_info=True,
        )
        return Response(
            {
                "success": False,
                "message": "IPN processing failed.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# REGISTER PESAPAL IPN
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def register_ipn(request):
    """
    Register IPN URL with Pesapal.
    """

    try:
        response = register_ipn_url()

        if not response:
            logger.error(
                "❌ Empty response from Pesapal IPN registration"
            )
            return Response(
                {
                    "success": False,
                    "message": (
                        "IPN registration failed. Please try again."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if response.get("status") != "200":
            logger.error(
                "❌ Pesapal IPN registration response: "
                f"{response}"
            )
            return Response(
                {
                    "success": False,
                    "message": (
                        "IPN registration failed. Please try again."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        config = (
            PaymentConfiguration.objects
            .filter(gateway_name__iexact="Pesapal")
            .first()
        )

        if config:
            config.ipn_id = response.get("ipn_id")
            config.ipn_url = response.get("url")
            config.is_active = True
            config.save()
            logger.info(
                "✅ Existing Pesapal configuration updated | "
                f"ID={config.id}"
            )
        else:
            config = PaymentConfiguration.objects.create(
                gateway_name="Pesapal",
                ipn_id=response.get("ipn_id"),
                ipn_url=response.get("url"),
                is_active=True,
            )
            logger.info(
                "✅ New Pesapal configuration created | "
                f"ID={config.id}"
            )

        return Response(
            {
                "success": True,
                "message": "IPN registered successfully.",
                "data": {
                    "id": config.id,
                    "gateway_name": config.gateway_name,
                    "ipn_id": config.ipn_id,
                    "ipn_url": config.ipn_url,
                    "is_active": config.is_active,
                },
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error(
            f"❌ Pesapal IPN registration error: {str(e)}",
            exc_info=True,
        )
        return Response(
            {
                "success": False,
                "message": (
                    "IPN registration failed. Please try again."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# PAYMENT SUCCESS
# ============================================================

@api_view(["GET"])
def payment_success(request):
    """
    Handle redirect from Pesapal after successful payment.
    """

    if not ensure_db_connection():
        logger.error(
            "❌ Database connection error in payment success"
        )
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    order_tracking_id = request.query_params.get(
        "OrderTrackingId"
    )
    merchant_reference = request.query_params.get(
        "OrderMerchantReference"
    )

    logger.info("=" * 60)
    logger.info("PAYMENT SUCCESS REDIRECT")
    logger.info(f"OrderTrackingId: {order_tracking_id}")
    logger.info(f"OrderMerchantReference: {merchant_reference}")
    logger.info("=" * 60)

    if not order_tracking_id:
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    try:
        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )

        verification = get_transaction_status(order_tracking_id)
        payment_status = verification.get(
            "payment_status_description"
        )

        logger.info(f"Verified payment status: {payment_status}")

        commission_result = None

        # ----------------------------------------------------
        # SERVICE PAYMENT BRANCH
        # ----------------------------------------------------
        if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
            if payment_status == "Completed":
                result = _finalize_completed_payment(payment)
                commission_result = result.get("commission_result")

            frontend_url = get_frontend_url("/payment-success")
            redirect_url = (
                f"{frontend_url}"
                f"?order_tracking_id={order_tracking_id}"
                f"&merchant_reference="
                f"{merchant_reference or payment.merchant_reference}"
                f"&payment_status={payment.status}"
                f"&amount={payment.amount}"
                f"&payment_type=service"
                f"&service_id={payment.service_id}"
                f"&payment_id={payment.id}"
                f"&connection_id="
                f"{payment.connection.connection_id if payment.connection else ''}"
            )

            if (
                commission_result
                and commission_result.get("success")
            ):
                redirect_url += (
                    f"&admin_amount="
                    f"{commission_result.get('admin_amount', 0)}"
                )
                redirect_url += (
                    f"&superadmin_amount="
                    f"{commission_result.get('superadmin_amount', 0)}"
                )
                redirect_url += (
                    f"&commission_percentage="
                    f"{commission_result.get('commission_percentage', 0)}"
                )

            logger.info(f"🔀 Redirecting to: {redirect_url}")
            return redirect(redirect_url)

        # ----------------------------------------------------
        # CONNECTION PAYMENT
        # ----------------------------------------------------
        if payment_status == "Completed":
            result = _finalize_completed_payment(payment)
            commission_result = result.get("commission_result")

        frontend_url = get_frontend_url("/payment-success")
        redirect_url = (
            f"{frontend_url}"
            f"?order_tracking_id={order_tracking_id}"
            f"&merchant_reference="
            f"{merchant_reference or payment.merchant_reference}"
            f"&payment_status={payment.status}"
            f"&amount={payment.amount}"
            f"&payment_id={payment.id}"
            f"&connection_id="
            f"{payment.connection.connection_id if payment.connection else ''}"
        )

        if (
            commission_result
            and commission_result.get("success")
        ):
            redirect_url += (
                f"&admin_amount="
                f"{commission_result.get('admin_amount', 0)}"
            )
            redirect_url += (
                f"&superadmin_amount="
                f"{commission_result.get('superadmin_amount', 0)}"
            )
            redirect_url += (
                f"&commission_percentage="
                f"{commission_result.get('commission_percentage', 0)}"
            )

        logger.info(f"🔀 Redirecting to: {redirect_url}")
        return redirect(redirect_url)

    except Payment.DoesNotExist:
        logger.error(
            "❌ Payment not found for tracking ID: "
            f"{order_tracking_id}"
        )
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    except Exception as e:
        logger.error(
            f"❌ Error processing payment success: {e}",
            exc_info=True,
        )
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )


# ============================================================
# PAYMENT FAILURE
# ============================================================

@api_view(["GET"])
def payment_failure(request):
    """
    Handle redirect from Pesapal when payment fails.
    """

    if not ensure_db_connection():
        logger.error(
            "❌ Database connection error in payment failure"
        )
        return redirect(
            get_frontend_url(
                "/payment-error?message=Payment+failed"
            )
        )

    order_tracking_id = request.query_params.get(
        "OrderTrackingId"
    )
    merchant_reference = request.query_params.get(
        "OrderMerchantReference"
    )

    logger.info("=" * 60)
    logger.info("PAYMENT FAILURE REDIRECT")
    logger.info(f"OrderTrackingId: {order_tracking_id}")
    logger.info(f"OrderMerchantReference: {merchant_reference}")
    logger.info("=" * 60)

    if order_tracking_id:
        try:
            payment = Payment.objects.get(
                order_tracking_id=order_tracking_id
            )

            payment.status = "failed"
            payment.save(update_fields=["status"])

            logger.info(
                f"❌ Payment {order_tracking_id} marked as failed"
            )

            if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
                notify(
                    receiver=payment.user,
                    sender=None,
                    category=Notification.CATEGORY_PAYMENT,
                    connection=payment.connection,
                    title="Contact Unlock Failed ❌",
                    message=(
                        f"Your payment of KES {payment.amount} to "
                        "unlock a contact failed. Please try again."
                    ),
                )
            else:
                notify(
                    receiver=payment.user,
                    sender=None,
                    category=Notification.CATEGORY_PAYMENT,
                    connection=payment.connection,
                    title="Payment Failed ❌",
                    message=(
                        f"Your payment of KES {payment.amount} "
                        "failed. Please try again or contact support."
                    ),
                )

        except Payment.DoesNotExist:
            logger.warning(
                "Payment not found for tracking ID: "
                f"{order_tracking_id}"
            )

    frontend_url = get_frontend_url("/payment-failure")
    redirect_url = (
        f"{frontend_url}"
        f"?order_tracking_id={order_tracking_id or ''}"
        f"&merchant_reference={merchant_reference or ''}"
        "&message=Payment+was+not+completed"
    )

    logger.info(f"🔀 Redirecting to: {redirect_url}")
    return redirect(redirect_url)


# ============================================================
# GET PAYMENT STATUS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_payment_status(request, payment_id):
    """
    Get the status of a specific payment.
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": (
                    "Service temporarily unavailable. "
                    "Please try again."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        payment = Payment.objects.select_related(
            "connection", "service"
        ).get(
            id=payment_id,
            user=request.user,
        )

        if payment.order_tracking_id:
            verification = get_transaction_status(
                payment.order_tracking_id
            )
            payment_status = verification.get(
                "payment_status_description"
            )

            if payment_status:
                status_map = {
                    "Completed": "completed",
                    "Failed": "failed",
                    "Cancelled": "cancelled",
                    "Pending": "pending",
                }
                new_status = status_map.get(payment_status)

                if new_status and new_status != payment.status:
                    if (
                        new_status == "completed"
                        and payment.status != "completed"
                    ):
                        _finalize_completed_payment(payment)
                    else:
                        payment.status = new_status
                        payment.save()

                        if new_status == "failed":
                            notify(
                                receiver=payment.user,
                                sender=None,
                                category=(
                                    Notification.CATEGORY_PAYMENT
                                ),
                                connection=payment.connection,
                                title="Payment Failed ❌",
                                message=(
                                    f"Your payment of KES "
                                    f"{payment.amount} failed. "
                                    "Please try again."
                                ),
                            )

        payment.refresh_from_db()

        return Response(
            {
                "success": True,
                "payment": {
                    "id": payment.id,
                    "merchant_reference": payment.merchant_reference,
                    "amount": payment.amount,
                    "status": payment.status,
                    "payment_type": payment.payment_type,
                    "order_tracking_id": payment.order_tracking_id,
                    "paid_at": payment.paid_at,
                    "created_at": payment.created_at,
                    "updated_at": payment.updated_at,
                },
                "connection": (
                    {
                        "connection_id": str(
                            payment.connection.connection_id
                        ),
                        "source": payment.connection.source,
                        "status": payment.connection.status,
                        "status_display": (
                            payment.connection.status_display
                        ),
                        "is_paid": payment.connection.is_paid,
                    }
                    if payment.connection
                    else None
                ),
            },
            status=status.HTTP_200_OK,
        )

    except Payment.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Payment not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except Exception as e:
        logger.error(
            f"❌ Error getting payment status: {str(e)}",
            exc_info=True,
        )
        return Response(
            {
                "success": False,
                "message": (
                    "Unable to retrieve payment status. "
                    "Please try again."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# RECONCILE / LIVE STATUS POLL
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reconcile_payment(request, payment_id):
    """
    Polled by the frontend after a payment is initiated.
    """

    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable.",
                "error_code": "DB_CONNECTION_ERROR",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        payment = Payment.objects.select_related(
            "connection", "service"
        ).get(id=payment_id, user=request.user)
    except Payment.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Payment not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    terminal = {"completed", "failed", "cancelled"}

    if (
        payment.order_tracking_id
        and payment.status not in terminal
    ):
        try:
            verification = get_transaction_status(
                payment.order_tracking_id
            )
            live = verification.get("payment_status_description")

            status_map = {
                "Completed": "completed",
                "Failed": "failed",
                "Cancelled": "cancelled",
                "Pending": "pending",
            }
            new_status = status_map.get(live)

            if new_status and new_status != payment.status:
                logger.info(
                    f"🔄 reconcile_payment: "
                    f"{payment.merchant_reference} "
                    f"{payment.status} → {new_status}"
                )

                if new_status == "completed":
                    _finalize_completed_payment(payment)
                else:
                    payment.status = new_status
                    if new_status == "completed":
                        payment.paid_at = timezone.now()
                    payment.save(
                        update_fields=["status", "paid_at"]
                    )

        except Exception as e:
            logger.warning(
                f"⚠️ reconcile_payment: Pesapal check failed for "
                f"{payment.merchant_reference}: {str(e)}"
            )

    payment.refresh_from_db()
    connection_obj = payment.connection

    return Response(
        {
            "success": True,
            "payment": {
                "id": payment.id,
                "merchant_reference": payment.merchant_reference,
                "amount": payment.amount,
                "status": payment.status,
                "payment_type": payment.payment_type,
                "order_tracking_id": payment.order_tracking_id,
                "paid_at": payment.paid_at,
                "created_at": payment.created_at,
                "updated_at": payment.updated_at,
                "is_terminal": payment.status in terminal,
            },
            "connection": (
                {
                    "connection_id": str(
                        connection_obj.connection_id
                    ),
                    "source": connection_obj.source,
                    "status": connection_obj.status,
                    "status_display": connection_obj.status_display,
                    "is_paid": connection_obj.is_paid,
                }
                if connection_obj
                else None
            ),
        },
        status=status.HTTP_200_OK,
    )