# paystack/views.py
# ============================================================
# Paystack Views - Handle Paystack Payment Flow
# ============================================================

from decimal import Decimal
import uuid
import logging
import json

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
PAYSTACK_SUCCESS_PATH = "/payment-success"  # Or "/paystack-success" if you prefer
PAYSTACK_FAILURE_PATH = "/payment-failure"  # Or "/paystack-failure" if you prefer
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
# SUPERADMIN VALIDATION HELPER
# =====================================================

def validate_superadmin():
    """
    Validate that exactly one superadmin exists.
    Returns (is_valid, superadmin, error_message)
    """
    try:
        superadmins = Accounts.objects.filter(role='superadmin', is_active=True)
        count = superadmins.count()
        
        if count == 0:
            logger.error("❌ No superadmin found in the system")
            return False, None, "No superadmin configured. Please contact support."
        
        if count > 1:
            logger.error(f"❌ Multiple superadmins found: {count}")
            return False, None, "Multiple superadmins found. Please contact support."
        
        superadmin = superadmins.first()
        logger.info(f"✅ Superadmin validated: {superadmin.email}")
        return True, superadmin, None
        
    except Exception as e:
        logger.error(f"❌ Error validating superadmin: {str(e)}")
        return False, None, "Unable to validate superadmin configuration."


# =====================================================
# GET ASSIGNED ADMIN HELPER
# =====================================================

def get_assigned_admin_or_superadmin(user):
    """
    Get the assigned admin for a user, or return superadmin if the user is directly assigned to superadmin.
    
    Returns:
        tuple: (assigned_person, is_superadmin_direct)
            - assigned_person: The assigned admin or superadmin
            - is_superadmin_direct: True if user is directly assigned to superadmin
    """
    try:
        # Check if user has a client assignment
        assignment = ClientAssignment.objects.get(user=user)
        assigned_admin = assignment.assigned_admin
        
        # Check if assigned admin is a superadmin
        if assigned_admin.role == 'superadmin':
            logger.info(f"✅ User {user.email} is directly assigned to superadmin: {assigned_admin.email}")
            return assigned_admin, True
        
        logger.info(f"✅ Found assigned admin for user {user.email}: {assigned_admin.email}")
        return assigned_admin, False
        
    except ClientAssignment.DoesNotExist:
        logger.warning(f"⚠️ No assignment found for user: {user.email}")
        
        # If no assignment exists, check if user is a superadmin themselves
        if user.role == 'superadmin':
            logger.info(f"✅ User {user.email} is a superadmin")
            return user, True
        
        return None, False


# =====================================================
# COMMISSION DISTRIBUTION HELPER
# =====================================================

def distribute_commission(payment, admin_or_superadmin, is_superadmin_direct=False, superadmin=None):
    """
    Distribute commission based on assignment type.
    
    If the user is directly assigned to a superadmin (is_superadmin_direct=True),
    the ENTIRE amount goes to the superadmin.
    
    If the user is assigned to a regular admin (is_superadmin_direct=False),
    commission is split between the admin and superadmin.
    
    Args:
        payment: Payment object
        admin_or_superadmin: The assigned admin or superadmin
        is_superadmin_direct: Boolean indicating if assignment is directly to superadmin
        superadmin: The system superadmin (for regular admin split)
    
    Returns:
        dict: {
            'success': bool,
            'admin_amount': Decimal,
            'superadmin_amount': Decimal,
            'commission_percentage': Decimal,
            'admin': Accounts,
            'superadmin': Accounts,
            'is_superadmin_direct': bool,
            'error': str (if failed)
        }
    """
    try:
        total_amount = payment.amount
        
        # ============================================================
        # CASE 1: User is directly assigned to SUPERADMIN
        # Entire amount goes to superadmin
        # ============================================================
        if is_superadmin_direct:
            logger.info(f"💰 DIRECT SUPERADMIN ASSIGNMENT: {admin_or_superadmin.email}")
            logger.info(f"   Total amount: {total_amount} goes to superadmin")
            
            # Update superadmin balance with FULL amount
            superadmin_balance, created = UserBalance.objects.get_or_create(
                user=admin_or_superadmin,
                defaults={'balance': Decimal('0.00')}
            )
            superadmin_balance.balance += total_amount
            superadmin_balance.save()
            logger.info(f"✅ Superadmin {admin_or_superadmin.email} balance updated: +{total_amount}")
            
            return {
                'success': True,
                'admin_amount': Decimal('0.00'),
                'superadmin_amount': total_amount,
                'commission_percentage': Decimal('100.00'),  # 100% to superadmin
                'admin': None,
                'superadmin': admin_or_superadmin,
                'is_superadmin_direct': True,
                'is_commission_split': False,
            }
        
        # ============================================================
        # CASE 2: User is assigned to a REGULAR ADMIN
        # Split commission between admin and superadmin
        # ============================================================
        admin = admin_or_superadmin
        
        # Get commission configuration for the admin
        commission_config = Commission.get_admin_commission(admin)
        admin_percentage = commission_config.percentage
        
        # Calculate split
        admin_amount = (total_amount * admin_percentage) / 100
        superadmin_amount = total_amount - admin_amount
        
        logger.info(f"💰 REGULAR ADMIN ASSIGNMENT: {admin.email}")
        logger.info(f"   Total amount: {total_amount}")
        logger.info(f"   Admin {admin_percentage}% = {admin_amount}")
        logger.info(f"   Platform {commission_config.platform_percentage}% = {superadmin_amount}")
        
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
        else:
            logger.info(f"ℹ️ Admin commission is 0, no balance update needed")

        # ============================================================
        # UPDATE SUPERADMIN BALANCE
        # ============================================================
        if superadmin_amount > 0 and superadmin:
            superadmin_balance, created = UserBalance.objects.get_or_create(
                user=superadmin,
                defaults={'balance': Decimal('0.00')}
            )
            superadmin_balance.balance += superadmin_amount
            superadmin_balance.save()
            logger.info(f"✅ Superadmin {superadmin.email} balance updated: +{superadmin_amount}")
        elif superadmin_amount > 0:
            logger.warning(f"⚠️ Superadmin amount {superadmin_amount} > 0 but no superadmin found")
        else:
            logger.info(f"ℹ️ Platform commission is 0, no balance update needed")

        return {
            'success': True,
            'admin_amount': admin_amount,
            'superadmin_amount': superadmin_amount,
            'commission_percentage': admin_percentage,
            'admin': admin,
            'superadmin': superadmin,
            'is_superadmin_direct': False,
            'is_commission_split': True,
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
# INITIATE PAYSTACK PAYMENT
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
    # VALIDATE SUPERADMIN BEFORE PROCEEDING
    # ============================================================
    is_valid, superadmin, error_msg = validate_superadmin()
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

    # Get assigned admin or superadmin
    assigned_person, is_superadmin_direct = get_assigned_admin_or_superadmin(user)
    
    if assigned_person is None:
        logger.warning(f"No assignment found for user: {user.email}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed. No admin assigned."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get hookup fee from PlatformConfig
    # If user is directly assigned to superadmin, use superadmin's config
    # Otherwise, use the assigned admin's config
    try:
        if is_superadmin_direct:
            # Use superadmin's platform config
            platform_config = PlatformConfig.objects.get(owner=assigned_person)
        else:
            # Use assigned admin's platform config
            platform_config = PlatformConfig.objects.get(owner=assigned_person)
        
        hookup_fee = Decimal(platform_config.hookup_fee)
        logger.info(f"✅ Hookup fee: {hookup_fee} (using config from {assigned_person.email})")
    except PlatformConfig.DoesNotExist:
        logger.warning(f"No platform config for: {assigned_person.email}")
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
            "assigned_person_id": assigned_person.id,
            "assigned_person_email": assigned_person.email,
            "is_superadmin_direct": is_superadmin_direct,
        }
    )

    # Initialize Paystack transaction
    paystack_service = PaystackService()

    metadata = {
        "payment_id": payment.id,
        "connection_id": str(connection.connection_id),
        "user_id": user.id,
        "phone_number": phone_number,
        "assigned_person_id": assigned_person.id,
        "is_superadmin_direct": is_superadmin_direct,
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
            "is_superadmin_direct": is_superadmin_direct,
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
# HANDLE PAYSTACK PAYMENT SUCCESS
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
        # VALIDATE SUPERADMIN BEFORE PROCESSING PAYMENT
        # ============================================================
        is_valid, superadmin, error_msg = validate_superadmin()
        if not is_valid:
            logger.error(f"❌ Superadmin validation failed: {error_msg}")
            return Response(
                {"status": "error", "message": error_msg or "Superadmin validation failed"},
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
            # GET ASSIGNED ADMIN OR SUPERADMIN
            # ============================================================
            # Get from metadata or derive from assignment
            is_superadmin_direct = metadata.get('is_superadmin_direct', False)
            
            # Get the assigned person from metadata, or derive from assignment
            assigned_person_id = metadata.get('assigned_person_id')
            
            if assigned_person_id:
                try:
                    assigned_person = Accounts.objects.get(id=assigned_person_id)
                    logger.info(f"✅ Found assigned person from metadata: {assigned_person.email}")
                except Accounts.DoesNotExist:
                    logger.error(f"❌ Assigned person not found: {assigned_person_id}")
                    assigned_person = None
            else:
                # Fallback: derive from assignment
                assigned_person, is_superadmin_direct = get_assigned_admin_or_superadmin(payment.user)
                logger.info(f"✅ Derived assigned person: {assigned_person.email if assigned_person else 'None'}")

            # ============================================================
            # DISTRIBUTE COMMISSION
            # ============================================================
            commission_result = None
            
            if assigned_person:
                # Use the updated commission distribution
                commission_result = distribute_commission(
                    payment, 
                    assigned_person, 
                    is_superadmin_direct,
                    superadmin
                )
                logger.info(f"✅ Commission distribution result: {commission_result}")
            else:
                logger.warning(f"⚠️ Cannot distribute commission - no assigned person found")
                commission_result = {
                    'success': False,
                    'error': 'No assigned person found'
                }

            # ============================================================
            # CREATE NOTIFICATIONS
            # ============================================================
            create_payment_notifications(payment, commission_result, superadmin, is_superadmin_direct)

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
# PAYSTACK PAYMENT SUCCESS REDIRECT (UPDATED URLs)
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
    # VALIDATE SUPERADMIN BEFORE PROCESSING
    # ============================================================
    is_valid, superadmin, error_msg = validate_superadmin()
    if not is_valid:
        logger.error(f"❌ Superadmin validation failed: {error_msg}")
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
            # GET ASSIGNED ADMIN OR SUPERADMIN
            # ============================================================
            # Get from metadata or derive from assignment
            paystack_metadata = paystack_transaction.metadata or {}
            is_superadmin_direct = paystack_metadata.get('is_superadmin_direct', False)
            
            assigned_person_id = paystack_metadata.get('assigned_person_id')
            
            if assigned_person_id:
                try:
                    assigned_person = Accounts.objects.get(id=assigned_person_id)
                    logger.info(f"✅ Found assigned person from metadata: {assigned_person.email}")
                except Accounts.DoesNotExist:
                    logger.error(f"❌ Assigned person not found: {assigned_person_id}")
                    assigned_person = None
            else:
                # Fallback: derive from assignment
                assigned_person, is_superadmin_direct = get_assigned_admin_or_superadmin(payment.user)
                logger.info(f"✅ Derived assigned person: {assigned_person.email if assigned_person else 'None'}")

            # ============================================================
            # DISTRIBUTE COMMISSION
            # ============================================================
            if assigned_person:
                commission_result = distribute_commission(
                    payment, 
                    assigned_person, 
                    is_superadmin_direct,
                    superadmin
                )
                logger.info(f"✅ Commission distribution result: {commission_result}")
            else:
                logger.warning(f"⚠️ Cannot distribute commission - no assigned person found")
                commission_result = {
                    'success': False,
                    'error': 'No assigned person found'
                }

            # Create notifications
            create_payment_notifications(payment, commission_result, superadmin, is_superadmin_direct)

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
        redirect_url += f"&superadmin_amount={commission_result.get('superadmin_amount', 0)}"
        redirect_url += f"&commission_percentage={commission_result.get('commission_percentage', 0)}"
        redirect_url += f"&is_superadmin_direct={commission_result.get('is_superadmin_direct', False)}"

    logger.info(f"🔀 Redirecting to: {redirect_url}")
    return redirect(redirect_url)


# =====================================================
# PAYSTACK PAYMENT FAILURE REDIRECT (UPDATED URLs)
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
# HELPER: Create Payment Notifications
# =====================================================

def create_payment_notifications(payment, commission_result=None, superadmin=None, is_superadmin_direct=False):
    """
    Create notifications for successful payment.
    """
    connection = payment.connection

    # Determine who the commission went to
    if commission_result and commission_result.get('success'):
        if is_superadmin_direct:
            # Commission went entirely to superadmin
            superadmin_amount = commission_result.get('superadmin_amount', 0)
            admin_message = (
                f"{connection.sender.full_name} has completed payment for their hookup. "
                f"This connection was directly assigned to you (Superadmin). "
                f"You have received KES {superadmin_amount:.2f} as the full payment amount."
            )
        else:
            # Split commission
            admin_amount = commission_result.get('admin_amount', 0)
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

    # 2. Notification for RECEIVER (admin or superadmin)
    Notification.objects.create(
        user=connection.receiver,
        connection=connection,
        title="New Completed Connection! 🎉",
        message=admin_message,
        notification_type=Notification.NotificationType.CONNECTION_COMPLETED,
        is_read=False,
    )

    # 3. Notification for Superadmin (if split commission and not direct assignment)
    if commission_result and commission_result.get('success') and not is_superadmin_direct:
        superadmin_amount = commission_result.get('superadmin_amount', 0)
        if superadmin_amount > 0 and superadmin:
            Notification.objects.create(
                user=superadmin,
                connection=connection,
                title="💰 Platform Commission Received!",
                message=f"Platform received KES {superadmin_amount:.2f} from {connection.sender.full_name}'s payment.",
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