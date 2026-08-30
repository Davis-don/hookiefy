# paystack/views.py
# ============================================================
# Paystack Views - Handle Paystack Payment Flow
# ============================================================

from decimal import Decimal
import uuid
import logging
import json
import os

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone
from django.shortcuts import redirect
from django.db import connection, close_old_connections, transaction
from django.db.utils import OperationalError, InterfaceError

from assignments.models import ClientAssignment
from administration.models import PlatformConfig
from paymentconfigurations.models import PaymentConfiguration
from connections.models import Connection
from payments.models import Payment
from notification.models import Notification
from account.models import Accounts
from UserBalance.models import UserBalance
from commisions.models import Commission

from .services import PaystackService
from .models import PaystackTransaction
from .serializers import InitiatePaymentSerializer

# Set up logger
logger = logging.getLogger(__name__)


# =====================================================
# FRONTEND URL CONSTANTS
# =====================================================

# Use environment variables or settings for these in production
FRONTEND_BASE_URL = "https://hookiefy.netlify.app"
PAYSTACK_SUCCESS_PATH = "/payment-success"
PAYSTACK_FAILURE_PATH = "/payment-failure"
PAYSTACK_ERROR_PATH = "/payment-error"


# =====================================================
# DATABASE CONNECTION HELPER
# =====================================================

def ensure_db_connection():
    """
    Ensure database connection is healthy before proceeding.
    Attempts to reconnect if connection is broken.
    """
    try:
        close_old_connections()
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except (OperationalError, InterfaceError) as e:
        logger.warning(f"⚠️ Database connection error detected: {str(e)}")
        try:
            connection.close()
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            logger.info("✅ Database reconnected successfully")
            return True
        except Exception as reconnect_error:
            logger.error(f"❌ Failed to reconnect to database: {str(reconnect_error)}")
            return False
    except Exception as e:
        logger.error(f"❌ Unexpected database error: {str(e)}")
        return False


# =====================================================
# SYSTEM ADMIN HELPER
# =====================================================

def get_system_admin():
    """
    Get the system admin user from environment variables.
    Returns (system_admin, error_message)
    """
    system_admin_email = os.environ.get('SYSTEM_ADMIN_EMAIL')
    
    if not system_admin_email:
        logger.error("❌ SYSTEM_ADMIN_EMAIL not set in environment variables")
        return None, "SYSTEM_ADMIN_EMAIL not set in environment variables"
    
    try:
        system_admin = Accounts.objects.get(email=system_admin_email)
        logger.info(f"✅ System admin found: {system_admin.email} (ID: {system_admin.id})")
        return system_admin, None
    except Accounts.DoesNotExist:
        logger.error(f"❌ System admin not found: {system_admin_email}")
        return None, f"System admin with email '{system_admin_email}' not found"


def validate_system_admin():
    """
    Validate that system admin exists.
    Returns (is_valid, system_admin, error_message)
    """
    try:
        system_admin, error = get_system_admin()
        
        if system_admin is None:
            logger.error(f"❌ System admin validation failed: {error}")
            return False, None, error or "No system admin configured. Please contact support."
        
        logger.info(f"✅ System admin validated: {system_admin.email}")
        return True, system_admin, None
        
    except Exception as e:
        logger.error(f"❌ Error validating system admin: {str(e)}")
        return False, None, "Unable to validate system admin configuration."


# =====================================================
# GET ASSIGNED ADMIN HELPER (UPDATED - ONLY REGULAR ADMIN)
# =====================================================

def get_assigned_admin(user):
    """
    Get the assigned regular admin for a user.
    Returns None if user is assigned to superadmin or has no assignment.
    
    Returns:
        tuple: (assigned_admin, error_message)
            - assigned_admin: The assigned admin (only if regular admin)
            - error_message: Error message if assignment is invalid
    """
    try:
        # Check if user has a client assignment
        assignment = ClientAssignment.objects.get(user=user)
        assigned_admin = assignment.assigned_admin
        
        # Check if assigned admin is a superadmin
        if assigned_admin.role == 'superadmin':
            logger.warning(f"⚠️ User {user.email} is assigned to superadmin: {assigned_admin.email}")
            return None, "Payment cannot be initiated. Users assigned to superadmin must be reassigned to a regular admin."
        
        logger.info(f"✅ Found assigned admin for user {user.email}: {assigned_admin.email}")
        return assigned_admin, None
        
    except ClientAssignment.DoesNotExist:
        logger.warning(f"⚠️ No assignment found for user: {user.email}")
        return None, "Payment initiation failed. No admin assigned. Please contact support."
    
    except Exception as e:
        logger.error(f"❌ Error getting assigned admin: {str(e)}")
        return None, "Payment initiation failed. Unable to verify admin assignment."


# =====================================================
# COMMISSION DISTRIBUTION HELPER (UPDATED - SYSTEM ADMIN)
# =====================================================

def distribute_commission(payment, admin, system_admin):
    """
    Distribute commission between admin and system admin.
    This function assumes the user is assigned to a regular admin.
    
    Args:
        payment: Payment object
        admin: The assigned regular admin
        system_admin: The system admin (from SYSTEM_ADMIN_EMAIL env)
    
    Returns:
        dict: {
            'success': bool,
            'admin_amount': Decimal,
            'system_admin_amount': Decimal,
            'commission_percentage': Decimal,
            'admin': Accounts,
            'system_admin': Accounts,
            'error': str (if failed)
        }
    """
    try:
        total_amount = payment.amount
        
        # Get commission configuration for the admin
        commission_config = Commission.get_admin_commission(admin)
        admin_percentage = commission_config.percentage
        
        # Calculate split
        admin_amount = (total_amount * admin_percentage) / 100
        system_admin_amount = total_amount - admin_amount
        
        logger.info("=" * 60)
        logger.info("💰 COMMISSION DISTRIBUTION")
        logger.info(f"   Admin: {admin.email}")
        logger.info(f"   System Admin: {system_admin.email if system_admin else 'Not Found'}")
        logger.info(f"   Total amount: {total_amount}")
        logger.info(f"   Admin {admin_percentage}% = {admin_amount}")
        logger.info(f"   System Admin {commission_config.platform_percentage}% = {system_admin_amount}")
        logger.info("=" * 60)
        
        # ============================================================
        # UPDATE ADMIN BALANCE
        # ============================================================
        if admin_amount > 0:
            admin_balance, created = UserBalance.objects.get_or_create(
                user=admin,
                defaults={'balance': Decimal('0.00')}
            )
            admin_balance.balance += admin_amount
            admin_balance.save()
            logger.info(f"✅ Admin {admin.email} balance updated: +{admin_amount}")
            logger.info(f"   New balance: {admin_balance.balance}")
        else:
            logger.info(f"ℹ️ Admin commission is 0, no balance update needed")

        # ============================================================
        # UPDATE SYSTEM ADMIN BALANCE
        # ============================================================
        if system_admin_amount > 0 and system_admin:
            system_admin_balance, created = UserBalance.objects.get_or_create(
                user=system_admin,
                defaults={'balance': Decimal('0.00')}
            )
            system_admin_balance.balance += system_admin_amount
            system_admin_balance.save()
            logger.info(f"✅ System Admin {system_admin.email} balance updated: +{system_admin_amount}")
            logger.info(f"   New balance: {system_admin_balance.balance}")
        elif system_admin_amount > 0:
            logger.warning(f"⚠️ System admin amount {system_admin_amount} > 0 but no system admin found")
        else:
            logger.info(f"ℹ️ System admin commission is 0, no balance update needed")

        return {
            'success': True,
            'admin_amount': admin_amount,
            'system_admin_amount': system_admin_amount,
            'commission_percentage': admin_percentage,
            'admin': admin,
            'system_admin': system_admin,
            'distribution_type': 'REGULAR_ADMIN_SPLIT',
        }

    except Commission.DoesNotExist:
        logger.error(f"❌ Commission configuration not found for admin: {admin.email}")
        return {
            'success': False,
            'error': f"Commission configuration not found for admin: {admin.email}"
        }
    except Exception as e:
        logger.error(f"❌ Error distributing commission: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


# =====================================================
# DATABASE HEALTH CHECK
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def database_health_check(request):
    """
    Check database connection health.
    Returns detailed status information.
    """
    try:
        close_old_connections()
        health_status = {
            'status': 'ok',
            'database': 'connected',
            'timestamp': timezone.now().isoformat(),
            'details': {}
        }
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        version(),
                        current_database(),
                        current_user,
                        now(),
                        pg_postmaster_start_time()
                """)
                row = cursor.fetchone()
                health_status['details'] = {
                    'version': row[0] if row else 'Unknown',
                    'database_name': row[1] if row else 'Unknown',
                    'user': row[2] if row else 'Unknown',
                    'current_time': row[3] if row else 'Unknown',
                    'postmaster_start': row[4] if row else 'Unknown',
                }
                cursor.execute("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity
                """)
                stats = cursor.fetchone()
                health_status['details']['connections'] = {
                    'total': stats[0] if stats else 0,
                    'active': stats[1] if stats else 0,
                    'idle': stats[2] if stats else 0,
                }
            health_status['status'] = 'healthy'
        except (OperationalError, InterfaceError) as e:
            health_status['status'] = 'error'
            health_status['database'] = 'disconnected'
            health_status['error'] = str(e)
            health_status['reconnecting'] = False
            try:
                connection.close()
                connection.ensure_connection()
                health_status['reconnecting'] = True
                health_status['reconnection_status'] = 'success'
            except Exception as reconnect_error:
                health_status['reconnection_status'] = 'failed'
                health_status['reconnection_error'] = str(reconnect_error)
        return Response(health_status, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Database health check error: {str(e)}")
        return Response(
            {
                'status': 'error',
                'message': str(e),
                'timestamp': timezone.now().isoformat()
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# PAYSTACK CONFIGURATION STATUS
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def paystack_config_status(request):
    """
    Check Paystack configuration status.
    """
    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable. Please try again.",
                "error_code": "DB_CONNECTION_ERROR"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        config = PaymentConfiguration.objects.get(gateway_name="paystack", is_active=True)
        return Response({
            "success": True,
            "exists": True,
            "id": config.id,
            "is_active": config.is_active,
            "gateway": config.gateway_name,
            "has_secret_key": bool(config.secret_key),
            "has_public_key": bool(config.public_key),
            "has_callback_url": bool(config.callback_url),
            "created_at": config.created_at,
            "updated_at": config.updated_at,
        })
    except PaymentConfiguration.DoesNotExist:
        return Response({
            "success": False,
            "exists": False,
            "message": "Paystack configuration not found"
        }, status=status.HTTP_404_NOT_FOUND)


# =====================================================
# INITIATE PAYSTACK PAYMENT (UPDATED)
# =====================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_paystack_payment(request):
    """
    Initiate a Paystack payment for a connection.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable. Please try again.",
                "error_code": "DB_CONNECTION_ERROR"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # ============================================================
    # VALIDATE SYSTEM ADMIN BEFORE PROCEEDING
    # ============================================================
    is_valid, system_admin, error_msg = validate_system_admin()
    if not is_valid:
        return Response(
            {
                "success": False,
                "message": error_msg or "Payment service is currently unavailable."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate request data
    serializer = InitiatePaymentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Invalid request data",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user
    connection_id = serializer.validated_data.get("connection_id")
    phone_number = serializer.validated_data.get("phone_number")
    email = serializer.validated_data.get("email", user.email)

    # ============================================================
    # CHECK ADMIN ASSIGNMENT - MUST BE REGULAR ADMIN
    # ============================================================
    assigned_admin, admin_error = get_assigned_admin(user)
    
    if assigned_admin is None:
        logger.warning(f"❌ Payment blocked - {admin_error}")
        return Response(
            {
                "success": False,
                "message": admin_error or "Payment initiation failed. No admin assigned."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get connection
    try:
        connection = Connection.objects.get(connection_id=connection_id)
    except Connection.DoesNotExist:
        logger.warning(f"Connection not found: {connection_id}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # Check ownership
    if connection.sender != user:
        logger.warning(f"User {user.email} attempted to pay for connection they don't own")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # Prevent duplicate payment
    if Payment.objects.filter(connection=connection, status="completed").exists():
        return Response(
            {
                "success": False,
                "message": "This connection has already been paid for."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get hookup fee from assigned admin's PlatformConfig
    try:
        platform_config = PlatformConfig.objects.get(owner=assigned_admin)
        hookup_fee = Decimal(platform_config.hookup_fee)
        logger.info(f"✅ Hookup fee: {hookup_fee} (using config from {assigned_admin.email})")
    except PlatformConfig.DoesNotExist:
        logger.warning(f"No platform config for: {assigned_admin.email}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check Paystack configuration
    try:
        config = PaymentConfiguration.objects.get(gateway_name="paystack", is_active=True)
        logger.info(f"✅ Paystack config found - ID: {config.id}")
        logger.info(f"   Has Secret Key: {bool(config.secret_key)}")
        logger.info(f"   Has Public Key: {bool(config.public_key)}")
    except PaymentConfiguration.DoesNotExist:
        logger.error("❌ Paystack configuration not found or inactive")
        return Response(
            {
                "success": False,
                "message": "Payment service is currently unavailable."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Create merchant reference
    merchant_reference = f"PAY-{uuid.uuid4().hex[:12].upper()}"

    # Create payment record (pending)
    payment = Payment.objects.create(
        user=user,
        connection=connection,
        merchant_reference=merchant_reference,
        amount=hookup_fee,
        phone_number=phone_number,
        gateway="paystack",
        status="pending"
    )

    # Create Paystack transaction record
    paystack_transaction = PaystackTransaction.objects.create(
        reference=merchant_reference,
        amount=hookup_fee,
        currency="KES",
        email=email,
        status="pending",
        payment_id=payment.id,
        metadata={
            "connection_id": str(connection.connection_id),
            "user_id": user.id,
            "phone_number": phone_number,
            "payment_id": payment.id,
            "admin_id": assigned_admin.id,
            "admin_email": assigned_admin.email,
            "system_admin_id": system_admin.id if system_admin else None,
            "system_admin_email": system_admin.email if system_admin else None,
        }
    )

    # Initialize Paystack transaction
    paystack_service = PaystackService()

    metadata = {
        "payment_id": payment.id,
        "connection_id": str(connection.connection_id),
        "user_id": user.id,
        "phone_number": phone_number,
        "admin_id": assigned_admin.id,
        "admin_email": assigned_admin.email,
        "system_admin_id": system_admin.id if system_admin else None,
        "system_admin_email": system_admin.email if system_admin else None,
    }

    try:
        paystack_response = paystack_service.initialize_transaction(
            email=email,
            amount=hookup_fee,
            reference=merchant_reference,
            metadata=metadata
        )
    except Exception as e:
        payment.status = "failed"
        payment.save()
        paystack_transaction.status = "failed"
        paystack_transaction.paystack_data = {"error": str(e)}
        paystack_transaction.save()
        logger.error(f"❌ Paystack initialization error: {str(e)}")
        return Response(
            {
                "success": False,
                "message": "Payment initialization failed. Please try again."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if not paystack_response.get("success"):
        payment.status = "failed"
        payment.save()
        paystack_transaction.status = "failed"
        paystack_transaction.paystack_data = paystack_response
        paystack_transaction.save()

        return Response(
            {
                "success": False,
                "message": paystack_response.get("message", "Payment initialization failed.")
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update paystack transaction with response data
    paystack_data = paystack_response.get("data", {})
    paystack_transaction.paystack_data = paystack_data
    paystack_transaction.save()

    return Response(
        {
            "success": True,
            "message": "Payment initialized successfully.",
            "payment": {
                "id": payment.id,
                "merchant_reference": payment.merchant_reference,
                "amount": payment.amount,
                "status": payment.status,
                "gateway": payment.gateway,
            },
            "authorization_url": paystack_data.get("authorization_url"),
            "reference": merchant_reference,
        },
        status=status.HTTP_200_OK
    )


# =====================================================
# PAYSTACK WEBHOOK HANDLER
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def paystack_webhook(request):
    """
    Handle Paystack webhook events.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        logger.error("❌ Database connection error in webhook")
        return Response(
            {"status": "error", "message": "Service temporarily unavailable."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Get signature from header
    signature = request.headers.get("x-paystack-signature")

    if not signature:
        logger.error("❌ Missing Paystack signature")
        return Response(
            {"status": "error", "message": "Missing signature"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify webhook signature
    paystack_service = PaystackService()
    raw_body = request.body

    if not paystack_service.verify_webhook_signature(raw_body, signature):
        logger.error("❌ Invalid Paystack webhook signature")
        return Response(
            {"status": "error", "message": "Invalid signature"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Parse webhook data
    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError:
        logger.error("❌ Invalid JSON in webhook payload")
        return Response(
            {"status": "error", "message": "Invalid JSON"},
            status=status.HTTP_400_BAD_REQUEST
        )

    event = data.get("event")
    webhook_data = data.get("data", {})
    reference = webhook_data.get("reference")

    logger.info("=" * 60)
    logger.info("PAYSTACK WEBHOOK RECEIVED")
    logger.info(f"Event: {event}")
    logger.info(f"Reference: {reference}")
    logger.info("=" * 60)

    # Handle different events
    if event == "charge.success":
        return handle_paystack_success(webhook_data)
    elif event == "charge.failed":
        return handle_paystack_failure(webhook_data)
    elif event == "charge.cancelled":
        return handle_paystack_cancelled(webhook_data)
    else:
        logger.info(f"ℹ️ Unhandled Paystack event: {event}")
        return Response({"status": "success", "message": "Event received"}, status=status.HTTP_200_OK)


# =====================================================
# HANDLE PAYSTACK PAYMENT SUCCESS (UPDATED - SYSTEM ADMIN)
# =====================================================

def handle_paystack_success(webhook_data):
    """
    Handle successful Paystack payment webhook.
    """
    reference = webhook_data.get("reference")
    amount = webhook_data.get("amount", 0) / 100  # Convert back from cents
    metadata = webhook_data.get("metadata", {})

    try:
        # ============================================================
        # VALIDATE SYSTEM ADMIN BEFORE PROCESSING PAYMENT
        # ============================================================
        is_valid, system_admin, error_msg = validate_system_admin()
        if not is_valid:
            logger.error(f"❌ System admin validation failed: {error_msg}")
            return Response(
                {"status": "error", "message": error_msg or "System admin validation failed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the paystack transaction
        paystack_transaction = PaystackTransaction.objects.get(reference=reference)

        # Prevent double processing
        if paystack_transaction.status == "success":
            logger.info(f"ℹ️ Paystack transaction {reference} already processed")
            return Response({"status": "success", "message": "Already processed"}, status=status.HTTP_200_OK)

        # Find the related payment
        payment = Payment.objects.get(id=paystack_transaction.payment_id)

        # Verify transaction with Paystack
        paystack_service = PaystackService()
        verification = paystack_service.verify_transaction(reference)

        if not verification.get("success"):
            logger.error(f"❌ Paystack verification failed: {verification}")
            payment.status = "failed"
            payment.save()
            paystack_transaction.status = "failed"
            paystack_transaction.paystack_data = verification
            paystack_transaction.save()
            return Response(
                {"status": "error", "message": "Verification failed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        verification_data = verification.get("data", {})
        payment_status = verification_data.get("status")

        if payment_status == "success":
            # Update payment
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save()

            # Update paystack transaction
            paystack_transaction.status = "success"
            paystack_transaction.paid_at = timezone.now()
            paystack_transaction.paystack_data = verification_data
            paystack_transaction.save()

            # Update connection
            connection = payment.connection
            connection.status = Connection.Status.COMPLETED
            connection.save()

            logger.info(f"✅ Payment {reference} marked as completed")
            logger.info(f"✅ Connection {connection.connection_id} marked as completed")

            # ============================================================
            # GET ADMIN FROM METADATA OR ASSIGNMENT
            # ============================================================
            admin_id = metadata.get('admin_id')
            
            if admin_id:
                try:
                    admin = Accounts.objects.get(id=admin_id)
                    logger.info(f"✅ Found admin from metadata: {admin.email}")
                    
                    # Verify this is a regular admin (not superadmin)
                    if admin.role == 'superadmin':
                        logger.error(f"❌ Admin from metadata is a superadmin: {admin.email}")
                        admin = None
                except Accounts.DoesNotExist:
                    logger.error(f"❌ Admin not found: {admin_id}")
                    admin = None
            else:
                # Fallback: derive from assignment
                admin, error = get_assigned_admin(payment.user)
                if admin is None:
                    logger.error(f"❌ Could not find admin for user: {payment.user.email}")
                else:
                    logger.info(f"✅ Derived admin from assignment: {admin.email}")

            # ============================================================
            # DISTRIBUTE COMMISSION (UPDATED - SYSTEM ADMIN)
            # ============================================================
            commission_result = None
            
            if admin:
                # Distribute commission between admin and system admin
                commission_result = distribute_commission(payment, admin, system_admin)
                logger.info(f"✅ Commission distribution result: {commission_result}")
            else:
                logger.warning(f"⚠️ Cannot distribute commission - no admin found")
                commission_result = {
                    'success': False,
                    'error': 'No admin found for commission distribution'
                }

            # ============================================================
            # CREATE NOTIFICATIONS (UPDATED - SYSTEM ADMIN)
            # ============================================================
            create_payment_notifications(payment, commission_result, system_admin)

            return Response(
                {
                    "status": "success",
                    "message": "Payment processed successfully",
                    "payment_status": payment.status,
                    "connection_status": connection.status,
                    "commission": commission_result if commission_result else None,
                },
                status=status.HTTP_200_OK
            )
        else:
            payment.status = "failed"
            payment.save()
            paystack_transaction.status = "failed"
            paystack_transaction.save()
            logger.warning(f"⚠️ Payment {reference} failed with status: {payment_status}")
            return Response(
                {"status": "error", "message": f"Payment status: {payment_status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    except PaystackTransaction.DoesNotExist:
        logger.error(f"❌ Paystack transaction not found for reference: {reference}")
        return Response(
            {"status": "error", "message": "Transaction not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Payment.DoesNotExist:
        logger.error(f"❌ Payment not found for transaction: {reference}")
        return Response(
            {"status": "error", "message": "Payment not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ Error processing Paystack webhook: {str(e)}", exc_info=True)
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def handle_paystack_failure(webhook_data):
    """
    Handle failed Paystack payment webhook.
    """
    reference = webhook_data.get("reference")

    try:
        paystack_transaction = PaystackTransaction.objects.get(reference=reference)
        paystack_transaction.status = "failed"
        paystack_transaction.paystack_data = webhook_data
        paystack_transaction.save()

        payment = Payment.objects.get(id=paystack_transaction.payment_id)
        payment.status = "failed"
        payment.save()

        # Create failure notification
        Notification.objects.create(
            user=payment.user,
            connection=payment.connection,
            title="Payment Failed ❌",
            message=f"Your payment of KES {payment.amount} failed. Please try again or contact support.",
            notification_type=Notification.NotificationType.PAYMENT_FAILED,
            is_read=False,
        )

        logger.info(f"❌ Paystack payment failed: {reference}")

    except (PaystackTransaction.DoesNotExist, Payment.DoesNotExist) as e:
        logger.error(f"❌ Error handling payment failure: {str(e)}")

    return Response({"status": "success", "message": "Failure processed"}, status=status.HTTP_200_OK)


def handle_paystack_cancelled(webhook_data):
    """
    Handle cancelled Paystack payment webhook.
    """
    reference = webhook_data.get("reference")

    try:
        paystack_transaction = PaystackTransaction.objects.get(reference=reference)
        paystack_transaction.status = "cancelled"
        paystack_transaction.paystack_data = webhook_data
        paystack_transaction.save()

        payment = Payment.objects.get(id=paystack_transaction.payment_id)
        payment.status = "cancelled"
        payment.save()

        logger.info(f"⚠️ Paystack payment cancelled: {reference}")

    except (PaystackTransaction.DoesNotExist, Payment.DoesNotExist) as e:
        logger.error(f"❌ Error handling payment cancellation: {str(e)}")

    return Response({"status": "success", "message": "Cancellation processed"}, status=status.HTTP_200_OK)


# =====================================================
# PAYSTACK PAYMENT SUCCESS REDIRECT (UPDATED - SYSTEM ADMIN)
# =====================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def paystack_success(request):
    """
    Handle Paystack success redirect (frontend).
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        logger.error("❌ Database connection error in payment success")
        error_url = f"{FRONTEND_BASE_URL}{PAYSTACK_ERROR_PATH}?message=Payment+failed"
        return redirect(error_url)

    # ============================================================
    # VALIDATE SYSTEM ADMIN BEFORE PROCESSING
    # ============================================================
    is_valid, system_admin, error_msg = validate_system_admin()
    if not is_valid:
        logger.error(f"❌ System admin validation failed: {error_msg}")
        error_url = f"{FRONTEND_BASE_URL}{PAYSTACK_ERROR_PATH}?message=Payment+failed"
        return redirect(error_url)

    reference = request.query_params.get("reference")
    trxref = request.query_params.get("trxref")

    logger.info("=" * 60)
    logger.info("PAYSTACK SUCCESS REDIRECT")
    logger.info(f"Reference: {reference}")
    logger.info(f"Trxref: {trxref}")
    logger.info("=" * 60)

    ref = reference or trxref

    if not ref:
        error_url = f"{FRONTEND_BASE_URL}{PAYSTACK_ERROR_PATH}?message=Payment+failed"
        return redirect(error_url)

    try:
        payment = Payment.objects.get(merchant_reference=ref)
        paystack_transaction = PaystackTransaction.objects.get(reference=ref)
    except (Payment.DoesNotExist, PaystackTransaction.DoesNotExist):
        logger.error(f"❌ Payment not found for reference: {ref}")
        error_url = f"{FRONTEND_BASE_URL}{PAYSTACK_ERROR_PATH}?message=Payment+failed"
        return redirect(error_url)

    commission_result = None

    # Verify payment status
    paystack_service = PaystackService()
    verification = paystack_service.verify_transaction(ref)

    if verification.get("success"):
        data = verification.get("data", {})
        if data.get("status") == "success" and payment.status != "completed":
            # Update payment
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save()

            # Update paystack transaction
            paystack_transaction.status = "success"
            paystack_transaction.paid_at = timezone.now()
            paystack_transaction.paystack_data = data
            paystack_transaction.save()

            # Update connection
            connection = payment.connection
            connection.status = Connection.Status.COMPLETED
            connection.save()

            # ============================================================
            # GET ADMIN FROM METADATA OR ASSIGNMENT
            # ============================================================
            paystack_metadata = paystack_transaction.metadata or {}
            admin_id = paystack_metadata.get('admin_id')
            
            if admin_id:
                try:
                    admin = Accounts.objects.get(id=admin_id)
                    logger.info(f"✅ Found admin from metadata: {admin.email}")
                    
                    # Verify this is a regular admin (not superadmin)
                    if admin.role == 'superadmin':
                        logger.error(f"❌ Admin from metadata is a superadmin: {admin.email}")
                        admin = None
                except Accounts.DoesNotExist:
                    logger.error(f"❌ Admin not found: {admin_id}")
                    admin = None
            else:
                # Fallback: derive from assignment
                admin, error = get_assigned_admin(payment.user)
                if admin is None:
                    logger.error(f"❌ Could not find admin for user: {payment.user.email}")
                else:
                    logger.info(f"✅ Derived admin from assignment: {admin.email}")

            # ============================================================
            # DISTRIBUTE COMMISSION (UPDATED - SYSTEM ADMIN)
            # ============================================================
            if admin:
                commission_result = distribute_commission(payment, admin, system_admin)
                logger.info(f"✅ Commission distribution result: {commission_result}")
            else:
                logger.warning(f"⚠️ Cannot distribute commission - no admin found")
                commission_result = {
                    'success': False,
                    'error': 'No admin found for commission distribution'
                }

            # Create notifications (UPDATED - SYSTEM ADMIN)
            create_payment_notifications(payment, commission_result, system_admin)

    # Redirect to frontend success page with Paystack-specific path
    redirect_url = (
        f"{FRONTEND_BASE_URL}{PAYSTACK_SUCCESS_PATH}"
        f"?reference={ref}"
        f"&payment_status={payment.status}"
        f"&amount={payment.amount}"
        f"&connection_id={payment.connection.connection_id}"
        f"&gateway=paystack"
    )

    # Add commission info if available
    if commission_result and commission_result.get('success'):
        redirect_url += f"&admin_amount={commission_result.get('admin_amount', 0)}"
        redirect_url += f"&system_admin_amount={commission_result.get('system_admin_amount', 0)}"
        redirect_url += f"&commission_percentage={commission_result.get('commission_percentage', 0)}"

    logger.info(f"🔀 Redirecting to: {redirect_url}")
    return redirect(redirect_url)


# =====================================================
# PAYSTACK PAYMENT FAILURE REDIRECT
# =====================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def paystack_failure(request):
    """
    Handle Paystack failure redirect (frontend).
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        logger.error("❌ Database connection error in payment failure")
        error_url = f"{FRONTEND_BASE_URL}{PAYSTACK_ERROR_PATH}?message=Payment+failed"
        return redirect(error_url)

    reference = request.query_params.get("reference")
    trxref = request.query_params.get("trxref")

    logger.info("=" * 60)
    logger.info("PAYSTACK FAILURE REDIRECT")
    logger.info(f"Reference: {reference}")
    logger.info("=" * 60)

    ref = reference or trxref

    if ref:
        try:
            payment = Payment.objects.get(merchant_reference=ref)
            payment.status = "failed"
            payment.save()

            paystack_transaction = PaystackTransaction.objects.get(reference=ref)
            paystack_transaction.status = "failed"
            paystack_transaction.save()

            # Create failure notification
            Notification.objects.create(
                user=payment.user,
                connection=payment.connection,
                title="Payment Failed ❌",
                message=f"Your payment of KES {payment.amount} failed. Please try again or contact support.",
                notification_type=Notification.NotificationType.PAYMENT_FAILED,
                is_read=False,
            )

            logger.info(f"❌ Payment {ref} marked as failed")
        except (Payment.DoesNotExist, PaystackTransaction.DoesNotExist):
            logger.warning(f"Payment not found for reference: {ref}")

    redirect_url = (
        f"{FRONTEND_BASE_URL}{PAYSTACK_FAILURE_PATH}"
        f"?reference={ref or ''}"
        f"&message=Payment+failed"
        f"&gateway=paystack"
    )

    logger.info(f"🔀 Redirecting to: {redirect_url}")
    return redirect(redirect_url)


# =====================================================
# VERIFY PAYSTACK PAYMENT
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_paystack_payment(request, reference):
    """
    Verify a Paystack payment status.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable. Please try again."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        # Find the paystack transaction
        paystack_transaction = PaystackTransaction.objects.get(reference=reference)
        payment = Payment.objects.get(id=paystack_transaction.payment_id)

        # Check if user owns this payment
        if payment.user != request.user:
            return Response(
                {"success": False, "message": "You do not have permission to view this transaction"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify with Paystack
        paystack_service = PaystackService()
        verification = paystack_service.verify_transaction(reference)

        if verification.get("success"):
            data = verification.get("data", {})
            status_map = {
                "success": "success",
                "failed": "failed",
                "pending": "pending",
            }
            paystack_status = status_map.get(data.get("status"), "pending")

            # Update paystack transaction
            paystack_transaction.status = paystack_status
            paystack_transaction.paystack_data = data
            paystack_transaction.save()

            # Update payment if status changed
            if paystack_status == "success" and payment.status != "completed":
                payment.status = "completed"
                payment.paid_at = timezone.now()
                payment.save()
            elif paystack_status == "failed" and payment.status != "failed":
                payment.status = "failed"
                payment.save()

        return Response({
            "success": True,
            "payment": {
                "id": payment.id,
                "merchant_reference": payment.merchant_reference,
                "amount": payment.amount,
                "status": payment.status,
                "gateway": payment.gateway,
            },
            "paystack": {
                "reference": reference,
                "status": paystack_transaction.status,
                "paid_at": paystack_transaction.paid_at,
            }
        }, status=status.HTTP_200_OK)

    except PaystackTransaction.DoesNotExist:
        return Response(
            {"success": False, "message": "Transaction not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Payment.DoesNotExist:
        return Response(
            {"success": False, "message": "Payment not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ Error verifying Paystack payment: {str(e)}")
        return Response(
            {"success": False, "message": "Unable to verify payment"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# GET PAYSTACK TRANSACTIONS
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_paystack_transactions(request):
    """
    Get Paystack transactions for the current user.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable. Please try again."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    user = request.user

    # Get all payments for this user that used paystack
    payments = Payment.objects.filter(user=user, gateway="paystack").order_by('-created_at')

    # Get related paystack transactions
    result = []
    for payment in payments:
        try:
            paystack_transaction = PaystackTransaction.objects.get(payment_id=payment.id)
            result.append({
                "payment": {
                    "id": payment.id,
                    "amount": payment.amount,
                    "status": payment.status,
                    "gateway": payment.gateway,
                    "merchant_reference": payment.merchant_reference,
                    "created_at": payment.created_at,
                    "paid_at": payment.paid_at,
                },
                "paystack": {
                    "reference": paystack_transaction.reference,
                    "status": paystack_transaction.status,
                    "paid_at": paystack_transaction.paid_at,
                }
            })
        except PaystackTransaction.DoesNotExist:
            # Payment exists but no paystack transaction (shouldn't happen)
            pass

    return Response({
        "success": True,
        "count": len(result),
        "transactions": result
    }, status=status.HTTP_200_OK)


# =====================================================
# HELPER: Create Payment Notifications (UPDATED - SYSTEM ADMIN)
# =====================================================

def create_payment_notifications(payment, commission_result=None, system_admin=None):
    """
    Create notifications for successful payment.
    """
    connection = payment.connection

    # Determine commission details
    if commission_result and commission_result.get('success'):
        admin_amount = commission_result.get('admin_amount', 0)
        system_admin_amount = commission_result.get('system_admin_amount', 0)
        admin_message = (
            f"{connection.sender.full_name} has completed payment for their hookup. "
            f"You have received KES {admin_amount:.2f} as your commission."
            if admin_amount > 0
            else f"{connection.sender.full_name} has completed payment for their hookup. "
            f"The connection is now ready for service."
        )
    else:
        admin_message = (
            f"{connection.sender.full_name} has completed payment for their hookup. "
            f"The connection is now ready for service."
        )

    # 1. Notification for SENDER
    Notification.objects.create(
        user=connection.sender,
        connection=connection,
        title="Payment Successful! 🎉",
        message=f"Your payment of KES {payment.amount} for hookup with {connection.receiver.full_name} has been completed successfully. Your connection is now active!",
        notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
        is_read=False,
    )

    # 2. Notification for RECEIVER (admin)
    Notification.objects.create(
        user=connection.receiver,
        connection=connection,
        title="New Completed Connection! 🎉",
        message=admin_message,
        notification_type=Notification.NotificationType.CONNECTION_COMPLETED,
        is_read=False,
    )

    # 3. Notification for System Admin
    if commission_result and commission_result.get('success'):
        system_admin_amount = commission_result.get('system_admin_amount', 0)
        if system_admin_amount > 0 and system_admin:
            Notification.objects.create(
                user=system_admin,
                connection=connection,
                title="💰 System Admin Commission Received!",
                message=f"System Admin received KES {system_admin_amount:.2f} from {connection.sender.full_name}'s payment.",
                notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                is_read=False,
            )

    # 4. Mark pending notifications as read
    Notification.objects.filter(
        connection=connection,
        user=connection.sender,
        notification_type__in=[
            Notification.NotificationType.CONNECTION_REQUEST,
            Notification.NotificationType.CONNECTION_ACCEPTED,
            Notification.NotificationType.PAYMENT_PENDING,
        ]
    ).update(is_read=True)

    logger.info(f"✅ Notifications created for payment {payment.merchant_reference}")