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

# For service contact-reveal payments
from services.models import ClientService


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# FRONTEND URL HELPER
# ============================================================

def get_frontend_url(path):
    """
    Build a frontend URL using FRONTEND_URL from Django settings.
    """

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
    """
    Get the active Pesapal configuration (case-insensitive).
    """

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
    """
    Ensure database connection is healthy before proceeding.
    """

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
    Initiate a payment for a connection.
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
    phone_number = request.data.get("phone_number")

    if not connection_id:
        return Response(
            {
                "success": False,
                "message": "Invalid request. Missing connection_id.",
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
        if data and data.get("count", 0) > 1:
            logger.error(
                "Multiple superadmins found: "
                f"{data.get('superadmins', [])}"
            )
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
        connection_obj = Connection.objects.get(
            connection_id=connection_id
        )
    except Connection.DoesNotExist:
        logger.warning(f"Connection not found: {connection_id}")
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if connection_obj.sender != user:
        logger.warning(
            f"User {user.email} attempted to pay for "
            "a connection they don't own."
        )
        return Response(
            {"success": False, "message": "Payment initiation failed."},
            status=status.HTTP_403_FORBIDDEN,
        )

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
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

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

    if not pesapal_response:
        payment.status = "failed"
        payment.save(update_fields=["status"])
        logger.error("❌ Empty response received from Pesapal.")
        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. Please try again."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if pesapal_response.get("status") != "200":
        payment.status = "failed"
        payment.save(update_fields=["status"])
        logger.error(f"❌ Pesapal response error: {pesapal_response}")
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
                "order_tracking_id": payment.order_tracking_id,
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

    Body:
        service_id      (int, required)
        phone_number    (str, required)
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

    merchant_reference = f"SVC-{uuid.uuid4().hex[:12].upper()}"

    try:
        payment = Payment.objects.create(
            user=user,
            service=service,
            connection=None,
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
                "order_tracking_id": payment.order_tracking_id,
            },
            "redirect_url": pesapal_response.get("redirect_url"),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# PESAPAL IPN CALLBACK
# ============================================================

@api_view(["GET", "POST"])
def ipn_callback(request):
    """
    Handle Pesapal IPN callbacks.
    Supports BOTH connection payments and service contact-reveals.
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

        # ----------------------------------------------------
        # COMPLETED
        # ----------------------------------------------------

        if payment_status == "Completed":
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at"])

            logger.info(
                f"✅ Payment {order_tracking_id} "
                "marked as completed"
            )

            # ------------------------------------------------
            # SERVICE PAYMENT BRANCH
            # ------------------------------------------------

            if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
                logger.info(
                    "🛎️ Service payment completed for "
                    f"service_id={payment.service_id}"
                )

                try:
                    commission_result = (
                        CommissionService
                        .distribute_commission_for_payment(payment)
                    )
                    logger.info(
                        "✅ Service commission distributed: "
                        f"{commission_result}"
                    )
                except CommissionDistributionError as e:
                    logger.error(
                        f"❌ Service commission failed: {str(e)}"
                    )
                    commission_result = {
                        "success": False,
                        "error": str(e),
                    }

                Notification.objects.create(
                    user=payment.user,
                    title="Contact Unlocked! 🎉",
                    message=(
                        f"You can now view the provider's "
                        f"contact details for "
                        f"'{payment.service.title if payment.service else 'listing'}'."
                    ),
                    notification_type=(
                        Notification.NotificationType
                        .PAYMENT_SUCCESS
                    ),
                    is_read=False,
                )

                if payment.service and getattr(
                    payment.service, "provider", None
                ):
                    Notification.objects.create(
                        user=payment.service.provider,
                        title="New Contact Unlock 💰",
                        message=(
                            f"{payment.user.full_name} paid to "
                            f"unlock your contact details for "
                            f"'{payment.service.title or 'your listing'}'."
                        ),
                        notification_type=(
                            Notification.NotificationType
                            .PAYMENT_SUCCESS
                        ),
                        is_read=False,
                    )

                return Response(
                    {
                        "success": True,
                        "message": "IPN processed.",
                        "payment_status": payment.status,
                        "payment_type": payment.payment_type,
                        "service_id": payment.service_id,
                        "commission_distribution": (
                            commission_result
                            if commission_result
                            else None
                        ),
                    },
                    status=status.HTTP_200_OK,
                )

            # ------------------------------------------------
            # CONNECTION PAYMENT
            # ------------------------------------------------

            connection_obj = payment.connection

            if connection_obj is None:
                logger.error(
                    "❌ Connection payment has no connection "
                    f"attached. Payment ID={payment.id}"
                )
                return Response(
                    {
                        "success": False,
                        "message": "Connection missing.",
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            connection_obj.status = Connection.Status.COMPLETED
            connection_obj.save(update_fields=["status"])

            logger.info(
                f"✅ Connection {connection_obj.connection_id} "
                "marked as completed"
            )

            try:
                commission_result = (
                    CommissionService
                    .distribute_commission_for_payment(payment)
                )
                logger.info(
                    "✅ Commission distributed successfully: "
                    f"{commission_result}"
                )
            except CommissionDistributionError as e:
                logger.error(
                    f"❌ Commission distribution failed: {str(e)}"
                )
                commission_result = {
                    "success": False,
                    "error": str(e),
                }

            Notification.objects.create(
                user=connection_obj.sender,
                connection=connection_obj,
                title="Payment Successful! 🎉",
                message=(
                    f"Your payment of KES "
                    f"{payment.amount} for hookup with "
                    f"{connection_obj.receiver.full_name} "
                    "has been completed successfully. "
                    "Your connection is now active!"
                ),
                notification_type=(
                    Notification.NotificationType.PAYMENT_SUCCESS
                ),
                is_read=False,
            )

            admin_amount = (
                commission_result.get("admin_amount", 0)
                if commission_result
                and commission_result.get("success")
                else 0
            )

            if admin_amount > 0:
                admin_message = (
                    f"{connection_obj.sender.full_name} "
                    "has completed payment for their hookup. "
                    f"You have received KES "
                    f"{admin_amount:.2f} as your commission."
                )
            else:
                admin_message = (
                    f"{connection_obj.sender.full_name} "
                    "has completed payment for their hookup. "
                    "The connection is now ready for service."
                )

            Notification.objects.create(
                user=connection_obj.receiver,
                connection=connection_obj,
                title="New Completed Connection! 🎉",
                message=admin_message,
                notification_type=(
                    Notification.NotificationType
                    .CONNECTION_COMPLETED
                ),
                is_read=False,
            )

            if (
                commission_result
                and commission_result.get("success")
            ):
                superadmin_amount = (
                    commission_result.get("superadmin_amount", 0)
                )

                if superadmin_amount > 0:
                    superadmin = (
                        Accounts.objects
                        .filter(
                            role="superadmin",
                            is_active=True,
                        )
                        .first()
                    )

                    if superadmin:
                        Notification.objects.create(
                            user=superadmin,
                            connection=connection_obj,
                            title=(
                                "💰 Platform Commission Received!"
                            ),
                            message=(
                                "Platform received KES "
                                f"{superadmin_amount:.2f} "
                                "from "
                                f"{connection_obj.sender.full_name}"
                                "'s payment."
                            ),
                            notification_type=(
                                Notification.NotificationType
                                .PAYMENT_SUCCESS
                            ),
                            is_read=False,
                        )

            Notification.objects.filter(
                connection=connection_obj,
                user=connection_obj.sender,
                notification_type__in=[
                    Notification.NotificationType.CONNECTION_REQUEST,
                    Notification.NotificationType.CONNECTION_ACCEPTED,
                    Notification.NotificationType.PAYMENT_PENDING,
                ],
            ).update(is_read=True)

            logger.info(
                "✅ IPN: Notifications created "
                "for completed payment"
            )

        # ----------------------------------------------------
        # FAILED
        # ----------------------------------------------------

        elif payment_status == "Failed":
            payment.status = "failed"
            payment.save(update_fields=["status"])

            if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
                Notification.objects.create(
                    user=payment.user,
                    title="Contact Unlock Failed ❌",
                    message=(
                        f"Your payment of KES "
                        f"{payment.amount} to unlock a "
                        "contact failed. Please try again."
                    ),
                    notification_type=(
                        Notification.NotificationType
                        .PAYMENT_FAILED
                    ),
                    is_read=False,
                )
            else:
                Notification.objects.create(
                    user=payment.user,
                    connection=payment.connection,
                    title="Payment Failed ❌",
                    message=(
                        f"Your payment of KES "
                        f"{payment.amount} failed. "
                        "Please try again or contact support."
                    ),
                    notification_type=(
                        Notification.NotificationType
                        .PAYMENT_FAILED
                    ),
                    is_read=False,
                )

            logger.info("❌ IPN: Payment failed")

        # ----------------------------------------------------
        # CANCELLED
        # ----------------------------------------------------

        elif payment_status == "Cancelled":
            payment.status = "cancelled"
            payment.save(update_fields=["status"])
            logger.info("⚠️ IPN: Payment cancelled")

        # ----------------------------------------------------
        # PENDING / UNKNOWN
        # ----------------------------------------------------

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
                "connection_status": (
                    payment.connection.status
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
    Supports BOTH connection and service payments.
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
            if (
                payment_status == "Completed"
                and payment.status != "completed"
            ):
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

                Notification.objects.create(
                    user=payment.user,
                    title="Contact Unlocked! 🎉",
                    message=(
                        f"You can now view the provider's "
                        f"contact details for "
                        f"'{payment.service.title if payment.service else 'listing'}'."
                    ),
                    notification_type=(
                        Notification.NotificationType
                        .PAYMENT_SUCCESS
                    ),
                    is_read=False,
                )

                if payment.service and getattr(
                    payment.service, "provider", None
                ):
                    Notification.objects.create(
                        user=payment.service.provider,
                        title="New Contact Unlock 💰",
                        message=(
                            f"{payment.user.full_name} paid to "
                            f"unlock your contact details for "
                            f"'{payment.service.title or 'your listing'}'."
                        ),
                        notification_type=(
                            Notification.NotificationType
                            .PAYMENT_SUCCESS
                        ),
                        is_read=False,
                    )

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

        if (
            payment_status == "Completed"
            and payment.status != "completed"
        ):
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at"])

            connection_obj = payment.connection

            if connection_obj is None:
                return redirect(
                    get_frontend_url(
                        "/payment-error?message=Connection+missing"
                    )
                )

            connection_obj.status = Connection.Status.COMPLETED
            connection_obj.save(update_fields=["status"])

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

            Notification.objects.create(
                user=connection_obj.sender,
                connection=connection_obj,
                title="Payment Successful! 🎉",
                message=(
                    f"Your payment of KES "
                    f"{payment.amount} for hookup with "
                    f"{connection_obj.receiver.full_name} "
                    "has been completed successfully. "
                    "Your connection is now active!"
                ),
                notification_type=(
                    Notification.NotificationType.PAYMENT_SUCCESS
                ),
                is_read=False,
            )

            admin_amount = (
                commission_result.get("admin_amount", 0)
                if commission_result
                and commission_result.get("success")
                else 0
            )

            if admin_amount > 0:
                admin_message = (
                    f"{connection_obj.sender.full_name} "
                    "has completed payment for their hookup. "
                    f"You have received KES "
                    f"{admin_amount:.2f} as your commission."
                )
            else:
                admin_message = (
                    f"{connection_obj.sender.full_name} "
                    "has completed payment for their hookup. "
                    "The connection is now ready for service."
                )

            Notification.objects.create(
                user=connection_obj.receiver,
                connection=connection_obj,
                title="New Completed Connection! 🎉",
                message=admin_message,
                notification_type=(
                    Notification.NotificationType
                    .CONNECTION_COMPLETED
                ),
                is_read=False,
            )

            Notification.objects.filter(
                connection=connection_obj,
                user=connection_obj.sender,
                notification_type__in=[
                    Notification.NotificationType.CONNECTION_REQUEST,
                    Notification.NotificationType.CONNECTION_ACCEPTED,
                    Notification.NotificationType.PAYMENT_PENDING,
                ],
            ).update(is_read=True)

        frontend_url = get_frontend_url("/payment-success")
        redirect_url = (
            f"{frontend_url}"
            f"?order_tracking_id={order_tracking_id}"
            f"&merchant_reference="
            f"{merchant_reference or payment.merchant_reference}"
            f"&payment_status={payment.status}"
            f"&amount={payment.amount}"
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
                f"❌ Payment {order_tracking_id} "
                "marked as failed"
            )

            if payment.payment_type == Payment.PAYMENT_TYPE_SERVICE:
                Notification.objects.create(
                    user=payment.user,
                    title="Contact Unlock Failed ❌",
                    message=(
                        f"Your payment of KES "
                        f"{payment.amount} to unlock a "
                        "contact failed. Please try again."
                    ),
                    notification_type=(
                        Notification.NotificationType
                        .PAYMENT_FAILED
                    ),
                    is_read=False,
                )
            else:
                Notification.objects.create(
                    user=payment.user,
                    connection=payment.connection,
                    title="Payment Failed ❌",
                    message=(
                        f"Your payment of KES "
                        f"{payment.amount} failed. "
                        "Please try again or contact support."
                    ),
                    notification_type=(
                        Notification.NotificationType
                        .PAYMENT_FAILED
                    ),
                    is_read=False,
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
        payment = Payment.objects.get(
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

                if (
                    new_status
                    and new_status != payment.status
                ):
                    payment.status = new_status
                    if new_status == "completed":
                        payment.paid_at = timezone.now()
                    payment.save()

        return Response(
            {
                "success": True,
                "payment": {
                    "id": payment.id,
                    "merchant_reference": (
                        payment.merchant_reference
                    ),
                    "amount": payment.amount,
                    "status": payment.status,
                    "payment_type": payment.payment_type,
                    "order_tracking_id": (
                        payment.order_tracking_id
                    ),
                    "paid_at": payment.paid_at,
                    "created_at": payment.created_at,
                    "updated_at": payment.updated_at,
                },
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