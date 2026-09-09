```python
# payments/views.py
# ============================================================
# COMPLETE PAYMENT VIEWS
# ============================================================

from decimal import Decimal
import uuid
import logging
from urllib.parse import urlencode

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings
from django.utils import timezone
from django.shortcuts import redirect
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


# ============================================================
# LOGGER
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# FRONTEND URL HELPER
# ============================================================

def get_frontend_url():
    """
    Get the frontend URL from Django settings.

    Example:

        https://youpata.kinstryx.co.ke

    Never hardcode the frontend domain inside this file.
    """

    return getattr(
        settings,
        "FRONTEND_URL",
        "https://youpata.kinstryx.co.ke",
    ).rstrip("/")


# ============================================================
# FRONTEND REDIRECT HELPER
# ============================================================

def build_frontend_redirect(path, params=None):
    """
    Build a frontend redirect URL.

    Example:

        https://youpata.kinstryx.co.ke/payment-success/?...

    The domain always comes from settings.FRONTEND_URL.
    """

    frontend_url = get_frontend_url()

    path = path if path.startswith("/") else f"/{path}"

    url = f"{frontend_url}{path}"

    if params:
        clean_params = {
            key: value
            for key, value in params.items()
            if value is not None
        }

        if clean_params:
            url += "?" + urlencode(clean_params)

    return url


# ============================================================
# PESAPAL CONFIGURATION HELPER
# ============================================================

def get_pesapal_configuration():
    """
    Get the active Pesapal configuration.

    Uses case-insensitive matching so all of these work:

        Pesapal
        PesaPal
        PESAPAL
        pesapal

    Returns:
        PaymentConfiguration instance or None
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
                "id",
                "gateway_name",
                "is_active",
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
    Attempts to reconnect if connection is broken.
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

            logger.info(
                "✅ Database reconnected successfully"
            )

            return True

        except Exception as reconnect_error:

            logger.error(
                "❌ Failed to reconnect to database: "
                f"{str(reconnect_error)}"
            )

            return False

    except Exception as e:

        logger.error(
            f"❌ Unexpected database error: {str(e)}"
        )

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

                cursor.execute(
                    """
                    SELECT
                        version(),
                        current_database(),
                        current_user,
                        now(),
                        pg_postmaster_start_time()
                    """
                )

                row = cursor.fetchone()

                health_status["details"] = {
                    "version": row[0] if row else "Unknown",
                    "database_name": row[1] if row else "Unknown",
                    "user": row[2] if row else "Unknown",
                    "current_time": row[3] if row else "Unknown",
                    "postmaster_start": row[4] if row else "Unknown",
                }

                cursor.execute(
                    """
                    SELECT
                        count(*) AS total_connections,
                        count(*) FILTER (
                            WHERE state = 'active'
                        ) AS active_connections,
                        count(*) FILTER (
                            WHERE state = 'idle'
                        ) AS idle_connections
                    FROM pg_stat_activity
                    """
                )

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

                health_status[
                    "reconnection_status"
                ] = "success"

            except Exception as reconnect_error:

                health_status[
                    "reconnection_status"
                ] = "failed"

                health_status[
                    "reconnection_error"
                ] = str(reconnect_error)

        return Response(
            health_status,
            status=status.HTTP_200_OK,
        )

    except Exception as e:

        logger.error(
            f"Database health check error: {str(e)}"
        )

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

    status_data = (
        SuperAdminValidator
        .get_superadmin_status()
    )

    if status_data.get(
        "can_initiate_payment"
    ):

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
# INITIATE PAYMENT
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):

    """
    Initiate a payment for a connection.
    """

    # --------------------------------------------------------
    # DATABASE CHECK
    # --------------------------------------------------------

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

    connection_id = request.data.get(
        "connection_id"
    )

    phone_number = request.data.get(
        "phone_number"
    )

    # --------------------------------------------------------
    # VALIDATE REQUEST
    # --------------------------------------------------------

    if not connection_id:

        return Response(
            {
                "success": False,
                "message": (
                    "Invalid request. "
                    "Missing connection_id."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not phone_number:

        return Response(
            {
                "success": False,
                "message": (
                    "Invalid request. "
                    "Missing phone_number."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # VALIDATE SUPERADMIN
    # --------------------------------------------------------

    eligible, message, data = (
        SuperAdminValidator
        .check_payment_eligibility()
    )

    if not eligible:

        logger.error(
            f"❌ Payment blocked: {message}"
        )

        if data and data.get(
            "count",
            0
        ) > 1:

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

    # --------------------------------------------------------
    # GET CONNECTION
    # --------------------------------------------------------

    try:

        connection_obj = (
            Connection.objects.get(
                connection_id=connection_id
            )
        )

    except Connection.DoesNotExist:

        logger.warning(
            f"Connection not found: {connection_id}"
        )

        return Response(
            {
                "success": False,
                "message": "Payment initiation failed.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    # --------------------------------------------------------
    # CHECK OWNERSHIP
    # --------------------------------------------------------

    if connection_obj.sender != user:

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

    # --------------------------------------------------------
    # PREVENT DUPLICATE PAYMENT
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
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # FIND ASSIGNED ADMIN
    # --------------------------------------------------------

    try:

        assignment = (
            ClientAssignment.objects.get(
                user=user
            )
        )

        assigned_admin = (
            assignment.assigned_admin
        )

    except ClientAssignment.DoesNotExist:

        logger.warning(
            f"No assignment found for user: {user.email}"
        )

        return Response(
            {
                "success": False,
                "message": "Payment initiation failed.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # GET PLATFORM CONFIGURATION
    # --------------------------------------------------------

    try:

        platform_config = (
            PlatformConfig.objects.get(
                owner=assigned_admin
            )
        )

        hookup_fee = Decimal(
            str(platform_config.hookup_fee)
        )

    except PlatformConfig.DoesNotExist:

        logger.warning(
            "No platform config for admin: "
            f"{assigned_admin.email}"
        )

        return Response(
            {
                "success": False,
                "message": "Payment initiation failed.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # GET PESAPAL CONFIGURATION
    # --------------------------------------------------------

    payment_config = (
        get_pesapal_configuration()
    )

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

    logger.info(
        "✅ Using PaymentConfiguration ID "
        f"{payment_config.id}"
    )

    # --------------------------------------------------------
    # CREATE MERCHANT REFERENCE
    # --------------------------------------------------------

    merchant_reference = (
        f"HOOK-{uuid.uuid4().hex[:12].upper()}"
    )

    # --------------------------------------------------------
    # CREATE PAYMENT
    # --------------------------------------------------------

    try:

        payment = Payment.objects.create(
            user=user,
            connection=connection_obj,
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
            {
                "success": False,
                "message": "Payment initiation failed.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # SEND ORDER TO PESAPAL
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

        payment.save(
            update_fields=["status"]
        )

        logger.error(
            f"❌ Pesapal submit order error: {str(e)}",
            exc_info=True,
        )

        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. "
                    "Please try again."
                ),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # --------------------------------------------------------
    # CHECK PESAPAL RESPONSE
    # --------------------------------------------------------

    if not pesapal_response:

        payment.status = "failed"

        payment.save(
            update_fields=["status"]
        )

        logger.error(
            "❌ Empty response received from Pesapal."
        )

        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. "
                    "Please try again."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if pesapal_response.get("status") != "200":

        payment.status = "failed"

        payment.save(
            update_fields=["status"]
        )

        logger.error(
            "❌ Pesapal response error: "
            f"{pesapal_response}"
        )

        return Response(
            {
                "success": False,
                "message": (
                    "Payment initiation failed. "
                    "Please try again."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --------------------------------------------------------
    # SAVE TRACKING ID
    # --------------------------------------------------------

    payment.order_tracking_id = (
        pesapal_response.get(
            "order_tracking_id"
        )
    )

    payment.save(
        update_fields=[
            "order_tracking_id"
        ]
    )

    logger.info(
        "✅ Payment initiated successfully | "
        f"Payment ID={payment.id} | "
        f"Tracking ID={payment.order_tracking_id}"
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return Response(
        {
            "success": True,
            "message": (
                "Payment initiated successfully."
            ),
            "payment": {
                "id": payment.id,
                "merchant_reference": (
                    payment.merchant_reference
                ),
                "amount": payment.amount,
                "status": payment.status,
                "order_tracking_id": (
                    payment.order_tracking_id
                ),
            },
            "redirect_url": (
                pesapal_response.get(
                    "redirect_url"
                )
            ),
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

    Includes commission distribution.
    """

    if not ensure_db_connection():

        logger.error(
            "❌ Database connection error in IPN callback"
        )

        return Response(
            {
                "success": False,
                "message": (
                    "Service temporarily unavailable."
                ),
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

        logger.error(
            "Missing order tracking id in IPN"
        )

        return Response(
            {
                "success": False,
                "message": (
                    "Invalid IPN notification."
                ),
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
            {
                "success": False,
                "message": "Payment not found.",
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    try:

        verification = (
            get_transaction_status(
                order_tracking_id
            )
        )

        payment_status = (
            verification.get(
                "payment_status_description"
            )
        )

        logger.info(
            f"Verified payment status: {payment_status}"
        )

        commission_result = None

        # ----------------------------------------------------
        # COMPLETED
        # ----------------------------------------------------

        if payment_status == "Completed":

            already_completed = (
                payment.status == "completed"
            )

            if not already_completed:

                payment.status = "completed"

                payment.paid_at = timezone.now()

                payment.save(
                    update_fields=[
                        "status",
                        "paid_at",
                    ]
                )

                connection_obj = (
                    payment.connection
                )

                connection_obj.status = (
                    Connection.Status.COMPLETED
                )

                connection_obj.save(
                    update_fields=["status"]
                )

                logger.info(
                    f"✅ Payment {order_tracking_id} "
                    "marked as completed"
                )

                logger.info(
                    f"✅ Connection "
                    f"{connection_obj.connection_id} "
                    "marked as completed"
                )

                # ------------------------------------------------
                # COMMISSION DISTRIBUTION
                # ------------------------------------------------

                try:

                    commission_result = (
                        CommissionService
                        .distribute_commission_for_payment(
                            payment
                        )
                    )

                    logger.info(
                        "✅ Commission distributed successfully: "
                        f"{commission_result}"
                    )

                except CommissionDistributionError as e:

                    logger.error(
                        "❌ Commission distribution failed: "
                        f"{str(e)}"
                    )

                    commission_result = {
                        "success": False,
                        "error": str(e),
                    }

                # ------------------------------------------------
                # SENDER NOTIFICATION
                # ------------------------------------------------

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
                        Notification
                        .NotificationType
                        .PAYMENT_SUCCESS
                    ),
                    is_read=False,
                )

                # ------------------------------------------------
                # ADMIN NOTIFICATION
                # ------------------------------------------------

                admin_amount = (
                    commission_result.get(
                        "admin_amount",
                        0,
                    )
                    if commission_result
                    and commission_result.get(
                        "success"
                    )
                    else 0
                )

                if admin_amount > 0:

                    admin_message = (
                        f"{connection_obj.sender.full_name} "
                        "has completed payment for their hookup. "
                        f"You have received KES "
                        f"{admin_amount:.2f} "
                        "as your commission."
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
                    title=(
                        "New Completed Connection! 🎉"
                    ),
                    message=admin_message,
                    notification_type=(
                        Notification
                        .NotificationType
                        .CONNECTION_COMPLETED
                    ),
                    is_read=False,
                )

                # ------------------------------------------------
                # SUPERADMIN NOTIFICATION
                # ------------------------------------------------

                if (
                    commission_result
                    and commission_result.get(
                        "success"
                    )
                ):

                    superadmin_amount = (
                        commission_result.get(
                            "superadmin_amount",
                            0,
                        )
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
                                    Notification
                                    .NotificationType
                                    .PAYMENT_SUCCESS
                                ),
                                is_read=False,
                            )

                # ------------------------------------------------
                # MARK OLD NOTIFICATIONS AS READ
                # ------------------------------------------------

                Notification.objects.filter(
                    connection=connection_obj,
                    user=connection_obj.sender,
                    notification_type__in=[
                        Notification
                        .NotificationType
                        .CONNECTION_REQUEST,

                        Notification
                        .NotificationType
                        .CONNECTION_ACCEPTED,

                        Notification
                        .NotificationType
                        .PAYMENT_PENDING,
                    ],
                ).update(
                    is_read=True
                )

                logger.info(
                    "✅ IPN: Notifications created "
                    "for completed payment"
                )

        # ----------------------------------------------------
        # FAILED
        # ----------------------------------------------------

        elif payment_status == "Failed":

            payment.status = "failed"

            payment.save(
                update_fields=["status"]
            )

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
                    Notification
                    .NotificationType
                    .PAYMENT_FAILED
                ),
                is_read=False,
            )

            logger.info(
                "❌ IPN: Payment failed"
            )

        # ----------------------------------------------------
        # CANCELLED
        # ----------------------------------------------------

        elif payment_status == "Cancelled":

            payment.status = "cancelled"

            payment.save(
                update_fields=["status"]
            )

            logger.info(
                "⚠️ IPN: Payment cancelled"
            )

        # ----------------------------------------------------
        # PENDING / UNKNOWN
        # ----------------------------------------------------

        else:

            payment.status = "pending"

            payment.save(
                update_fields=["status"]
            )

            logger.info(
                "⏳ IPN: Payment still pending"
            )

        return Response(
            {
                "success": True,
                "message": "IPN processed.",
                "payment_status": payment.status,
                "connection_status": (
                    payment.connection.status
                ),
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
                        "IPN registration failed. "
                        "Please try again."
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
                        "IPN registration failed. "
                        "Please try again."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # FIND EXISTING CONFIGURATION
        # ----------------------------------------------------

        config = (
            PaymentConfiguration.objects
            .filter(
                gateway_name__iexact="Pesapal"
            )
            .first()
        )

        # ----------------------------------------------------
        # UPDATE EXISTING CONFIGURATION
        # ----------------------------------------------------

        if config:

            config.ipn_id = response.get(
                "ipn_id"
            )

            config.ipn_url = response.get(
                "url"
            )

            config.is_active = True

            config.save()

            logger.info(
                "✅ Existing Pesapal configuration updated | "
                f"ID={config.id}"
            )

        # ----------------------------------------------------
        # CREATE NEW CONFIGURATION
        # ----------------------------------------------------

        else:

            config = (
                PaymentConfiguration.objects.create(
                    gateway_name="Pesapal",
                    ipn_id=response.get(
                        "ipn_id"
                    ),
                    ipn_url=response.get(
                        "url"
                    ),
                    is_active=True,
                )
            )

            logger.info(
                "✅ New Pesapal configuration created | "
                f"ID={config.id}"
            )

        return Response(
            {
                "success": True,
                "message": (
                    "IPN registered successfully."
                ),
                "data": {
                    "id": config.id,
                    "gateway_name": (
                        config.gateway_name
                    ),
                    "ipn_id": config.ipn_id,
                    "ipn_url": config.ipn_url,
                    "is_active": (
                        config.is_active
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:

        logger.error(
            f"❌ IPN registration error: {str(e)}",
            exc_info=True,
        )

        return Response(
            {
                "success": False,
                "message": (
                    "IPN registration failed. "
                    "Please try again."
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

    IMPORTANT:

    Pesapal redirects to the Django API first.

    Django:
        1. Receives the Pesapal tracking ID.
        2. Verifies the transaction.
        3. Updates the Payment.
        4. Updates the Connection.
        5. Distributes commissions.
        6. Creates notifications.
        7. Redirects the browser to FRONTEND_URL.

    FRONTEND_URL comes from settings.py.
    """

    # --------------------------------------------------------
    # DATABASE CHECK
    # --------------------------------------------------------

    if not ensure_db_connection():

        logger.error(
            "❌ Database connection error in payment success"
        )

        return redirect(
            build_frontend_redirect(
                "/payment-error/",
                {
                    "message": "Payment failed",
                },
            )
        )

    # --------------------------------------------------------
    # GET PESAPAL PARAMETERS
    # --------------------------------------------------------

    order_tracking_id = (
        request.query_params.get(
            "OrderTrackingId"
        )
        or request.query_params.get(
            "orderTrackingId"
        )
        or request.query_params.get(
            "order_tracking_id"
        )
    )

    merchant_reference = (
        request.query_params.get(
            "OrderMerchantReference"
        )
        or request.query_params.get(
            "orderMerchantReference"
        )
        or request.query_params.get(
            "merchant_reference"
        )
    )

    logger.info("=" * 60)

    logger.info(
        "PAYMENT SUCCESS REDIRECT"
    )

    logger.info(
        f"OrderTrackingId: {order_tracking_id}"
    )

    logger.info(
        f"OrderMerchantReference: {merchant_reference}"
    )

    logger.info("=" * 60)

    # --------------------------------------------------------
    # MISSING TRACKING ID
    # --------------------------------------------------------

    if not order_tracking_id:

        return redirect(
            build_frontend_redirect(
                "/payment-error/",
                {
                    "message": "Payment failed",
                },
            )
        )

    # --------------------------------------------------------
    # GET PAYMENT
    # --------------------------------------------------------

    try:

        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )

        # ----------------------------------------------------
        # VERIFY PAYMENT WITH PESAPAL
        # ----------------------------------------------------

        verification = (
            get_transaction_status(
                order_tracking_id
            )
        )

        payment_status = (
            verification.get(
                "payment_status_description"
            )
        )

        logger.info(
            f"Verified payment status: {payment_status}"
        )

        commission_result = None

        # ----------------------------------------------------
        # COMPLETED
        # ----------------------------------------------------

        if (
            payment_status == "Completed"
            and payment.status != "completed"
        ):

            payment.status = "completed"

            payment.paid_at = timezone.now()

            payment.save(
                update_fields=[
                    "status",
                    "paid_at",
                ]
            )

            connection_obj = (
                payment.connection
            )

            connection_obj.status = (
                Connection.Status.COMPLETED
            )

            connection_obj.save(
                update_fields=["status"]
            )

            logger.info(
                f"✅ Payment {order_tracking_id} "
                "marked as completed"
            )

            logger.info(
                f"✅ Connection "
                f"{connection_obj.connection_id} "
                "marked as completed"
            )

            # ------------------------------------------------
            # COMMISSION
            # ------------------------------------------------

            try:

                commission_result = (
                    CommissionService
                    .distribute_commission_for_payment(
                        payment
                    )
                )

                logger.info(
                    "✅ Commission distributed successfully: "
                    f"{commission_result}"
                )

            except CommissionDistributionError as e:

                logger.error(
                    "❌ Commission distribution failed: "
                    f"{str(e)}"
                )

                commission_result = {
                    "success": False,
                    "error": str(e),
                }

            # ------------------------------------------------
            # SENDER NOTIFICATION
            # ------------------------------------------------

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
                    Notification
                    .NotificationType
                    .PAYMENT_SUCCESS
                ),
                is_read=False,
            )

            # ------------------------------------------------
            # ADMIN NOTIFICATION
            # ------------------------------------------------

            admin_amount = (
                commission_result.get(
                    "admin_amount",
                    0,
                )
                if commission_result
                and commission_result.get(
                    "success"
                )
                else 0
            )

            if admin_amount > 0:

                admin_message = (
                    f"{connection_obj.sender.full_name} "
                    "has completed payment for their hookup. "
                    f"You have received KES "
                    f"{admin_amount:.2f} "
                    "as your commission."
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
                title=(
                    "New Completed Connection! 🎉"
                ),
                message=admin_message,
                notification_type=(
                    Notification
                    .NotificationType
                    .CONNECTION_COMPLETED
                ),
                is_read=False,
            )

            # ------------------------------------------------
            # SUPERADMIN NOTIFICATION
            # ------------------------------------------------

            if (
                commission_result
                and commission_result.get(
                    "success"
                )
            ):

                superadmin_amount = (
                    commission_result.get(
                        "superadmin_amount",
                        0,
                    )
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
                                Notification
                                .NotificationType
                                .PAYMENT_SUCCESS
                            ),
                            is_read=False,
                        )

            # ------------------------------------------------
            # MARK PENDING NOTIFICATIONS AS READ
            # ------------------------------------------------

            Notification.objects.filter(
                connection=connection_obj,
                user=connection_obj.sender,
                notification_type__in=[
                    Notification
                    .NotificationType
                    .CONNECTION_REQUEST,

                    Notification
                    .NotificationType
                    .CONNECTION_ACCEPTED,

                    Notification
                    .NotificationType
                    .PAYMENT_PENDING,
                ],
            ).update(
                is_read=True
            )

            logger.info(
                "✅ Notifications created for both parties"
            )

            logger.info(
                "🎉 Payment and connection completed"
            )

        # ----------------------------------------------------
        # ALREADY COMPLETED
        # ----------------------------------------------------

        elif (
            payment_status == "Completed"
            and payment.status == "completed"
        ):

            logger.info(
                "ℹ️ Payment already completed. "
                "Skipping duplicate processing."
            )

        # ----------------------------------------------------
        # FAILED
        # ----------------------------------------------------

        elif payment_status == "Failed":

            payment.status = "failed"

            payment.save(
                update_fields=["status"]
            )

        # ----------------------------------------------------
        # CANCELLED
        # ----------------------------------------------------

        elif payment_status == "Cancelled":

            payment.status = "cancelled"

            payment.save(
                update_fields=["status"]
            )

        # ----------------------------------------------------
        # PENDING
        # ----------------------------------------------------

        else:

            payment.status = "pending"

            payment.save(
                update_fields=["status"]
            )

        # ====================================================
        # FINAL FRONTEND REDIRECT
        # ====================================================

        redirect_params = {
            "order_tracking_id": order_tracking_id,

            "merchant_reference": (
                merchant_reference
                or payment.merchant_reference
            ),

            "payment_status": payment.status,

            "amount": str(payment.amount),

            "connection_id": str(
                payment.connection.connection_id
            ),

            "gateway": "pesapal",
        }

        # ----------------------------------------------------
        # ADD COMMISSION INFORMATION
        # ----------------------------------------------------

        if (
            commission_result
            and commission_result.get(
                "success"
            )
        ):

            redirect_params.update(
                {
                    "admin_amount": (
                        commission_result.get(
                            "admin_amount",
                            0,
                        )
                    ),

                    "superadmin_amount": (
                        commission_result.get(
                            "superadmin_amount",
                            0,
                        )
                    ),

                    "commission_percentage": (
                        commission_result.get(
                            "commission_percentage",
                            0,
                        )
                    ),
                }
            )

        # ----------------------------------------------------
        # BUILD FINAL URL FROM SETTINGS
        # ----------------------------------------------------

        redirect_url = build_frontend_redirect(
            "/payment-success/",
            redirect_params,
        )

        logger.info(
            "🔀 Redirecting customer to frontend:"
        )

        logger.info(
            f"   FRONTEND_URL = {get_frontend_url()}"
        )

        logger.info(
            f"   Redirect URL = {redirect_url}"
        )

        return redirect(
            redirect_url
        )

    # ========================================================
    # PAYMENT NOT FOUND
    # ========================================================

    except Payment.DoesNotExist:

        logger.error(
            "❌ Payment not found for tracking ID: "
            f"{order_tracking_id}"
        )

        return redirect(
            build_frontend_redirect(
                "/payment-error/",
                {
                    "message": "Payment failed",
                },
            )
        )

    # ========================================================
    # GENERAL ERROR
    # ========================================================

    except Exception as e:

        logger.error(
            f"❌ Error processing payment success: {e}",
            exc_info=True,
        )

        return redirect(
            build_frontend_redirect(
                "/payment-error/",
                {
                    "message": "Payment failed",
                },
            )
        )


# ============================================================
# PAYMENT FAILURE
# ============================================================

@api_view(["GET"])
def payment_failure(request):

    """
    Handle redirect from Pesapal when payment fails.

    Pesapal -> Django API -> Frontend.

    The frontend domain comes from settings.FRONTEND_URL.
    """

    if not ensure_db_connection():

        logger.error(
            "❌ Database connection error in payment failure"
        )

        return redirect(
            build_frontend_redirect(
                "/payment-error/",
                {
                    "message": "Payment failed",
                },
            )
        )

    # --------------------------------------------------------
    # GET PARAMETERS
    # --------------------------------------------------------

    order_tracking_id = (
        request.query_params.get(
            "OrderTrackingId"
        )
        or request.query_params.get(
            "orderTrackingId"
        )
        or request.query_params.get(
            "order_tracking_id"
        )
    )

    merchant_reference = (
        request.query_params.get(
            "OrderMerchantReference"
        )
        or request.query_params.get(
            "orderMerchantReference"
        )
        or request.query_params.get(
            "merchant_reference"
        )
    )

    logger.info("=" * 60)

    logger.info(
        "PAYMENT FAILURE REDIRECT"
    )

    logger.info(
        f"OrderTrackingId: {order_tracking_id}"
    )

    logger.info(
        f"OrderMerchantReference: {merchant_reference}"
    )

    logger.info("=" * 60)

    # --------------------------------------------------------
    # MARK PAYMENT FAILED
    # --------------------------------------------------------

    if order_tracking_id:

        try:

            payment = Payment.objects.get(
                order_tracking_id=order_tracking_id
            )

            payment.status = "failed"

            payment.save(
                update_fields=["status"]
            )

            logger.info(
                f"❌ Payment {order_tracking_id} "
                "marked as failed"
            )

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
                    Notification
                    .NotificationType
                    .PAYMENT_FAILED
                ),
                is_read=False,
            )

            logger.info(
                "✅ Notification created for payment failure"
            )

        except Payment.DoesNotExist:

            logger.warning(
                "Payment not found for tracking ID: "
                f"{order_tracking_id}"
            )

    # --------------------------------------------------------
    # FRONTEND FAILURE REDIRECT
    # --------------------------------------------------------

    redirect_url = build_frontend_redirect(
        "/payment-failure/",
        {
            "order_tracking_id": (
                order_tracking_id or ""
            ),

            "merchant_reference": (
                merchant_reference or ""
            ),

            "message": (
                "Payment was not completed"
            ),

            "gateway": "pesapal",
        },
    )

    logger.info(
        "🔀 Redirecting failed payment to: "
        f"{redirect_url}"
    )

    return redirect(
        redirect_url
    )


# ============================================================
# GET PAYMENT STATUS
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_payment_status(
    request,
    payment_id,
):

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

        # ----------------------------------------------------
        # VERIFY WITH PESAPAL
        # ----------------------------------------------------

        if payment.order_tracking_id:

            verification = (
                get_transaction_status(
                    payment.order_tracking_id
                )
            )

            payment_status = (
                verification.get(
                    "payment_status_description"
                )
            )

            if payment_status:

                status_map = {
                    "Completed": "completed",
                    "Failed": "failed",
                    "Cancelled": "cancelled",
                    "Pending": "pending",
                }

                new_status = status_map.get(
                    payment_status
                )

                if (
                    new_status
                    and new_status != payment.status
                ):

                    payment.status = new_status

                    if new_status == "completed":

                        payment.paid_at = (
                            timezone.now()
                        )

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
```
