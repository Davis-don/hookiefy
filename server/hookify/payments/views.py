# payments/views.py - Complete corrected version with proper imports
from decimal import Decimal
import uuid
import logging
import sys

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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

# Fix: Import UserBalance from the correct app (UserBalance)
from UserBalance.models import UserBalance

from .services.register_ipn import register_ipn_url
from .services.submit_order import submit_order
from .services.get_transaction_status import get_transaction_status
from .services.check_superadmin import SuperAdminValidator
from .services.commission_service import CommissionService, CommissionDistributionError

# Set up logger
logger = logging.getLogger(__name__)


# =====================================================
# DATABASE CONNECTION HELPER
# =====================================================

def ensure_db_connection():
    """
    Ensure database connection is healthy before proceeding.
    Attempts to reconnect if connection is broken.
    """
    try:
        # Close old connections
        close_old_connections()
        
        # Check if connection is alive
        connection.ensure_connection()
        
        # Test connection with a simple query
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return True
        
    except (OperationalError, InterfaceError) as e:
        logger.warning(f"⚠️ Database connection error detected: {str(e)}")
        try:
            # Close the broken connection
            connection.close()
            # Reconnect
            connection.ensure_connection()
            # Verify reconnection
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
        # Close old connections
        close_old_connections()
        
        # Check connection
        health_status = {
            'status': 'ok',
            'database': 'connected',
            'timestamp': timezone.now().isoformat(),
            'details': {}
        }
        
        try:
            # Ensure connection is alive
            connection.ensure_connection()
            
            # Get connection info
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
                
                # Get connection pool stats
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
            
            # Attempt to reconnect
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
# CHECK SUPERADMIN STATUS ENDPOINT
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_superadmin_status(request):
    """
    Check the status of superadmin configuration.
    Returns whether payment can be initiated.
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
    
    # Get superadmin status using the service
    status_data = SuperAdminValidator.get_superadmin_status()
    
    # Return user-friendly response
    if status_data.get('can_initiate_payment'):
        return Response(
            {
                "success": True,
                "message": "Payment service is ready.",
                "can_initiate": True
            },
            status=status.HTTP_200_OK
        )
    else:
        return Response(
            {
                "success": False,
                "message": "Payment service is currently unavailable. Please try again later.",
                "can_initiate": False
            },
            status=status.HTTP_400_BAD_REQUEST
        )


# =====================================================
# INITIATE PAYMENT
# =====================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """
    Initiate a payment for a connection.
    Validates superadmin configuration before initiating payment.
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

    user = request.user
    connection_id = request.data.get("connection_id")
    phone_number = request.data.get("phone_number")

    # Validate required fields
    if not connection_id:
        return Response(
            {
                "success": False,
                "message": "Invalid request. Missing required fields."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not phone_number:
        return Response(
            {
                "success": False,
                "message": "Invalid request. Missing required fields."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ============================================================
    # VALIDATE SUPERADMIN CONFIGURATION BEFORE PROCEEDING
    # ============================================================
    eligible, message, data = SuperAdminValidator.check_payment_eligibility()
    
    if not eligible:
        # Log the detailed error for debugging
        logger.error(f"❌ Payment blocked: {message}")
        if data and data.get('count', 0) > 1:
            logger.error(f"   Multiple superadmins found: {data.get('superadmins', [])}")
        
        # Return generic message to client
        return Response(
            {
                "success": False,
                "message": "Payment service is currently unavailable. Please try again later."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Get connection using UUID
    # ---------------------------------------------
    try:
        connection = Connection.objects.get(
            connection_id=connection_id
        )
    except Connection.DoesNotExist:
        logger.warning(f"Connection not found: {connection_id}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # ---------------------------------------------
    # Check ownership
    # ---------------------------------------------
    if connection.sender != user:
        logger.warning(f"User {user.email} attempted to pay for connection they don't own")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # ---------------------------------------------
    # Prevent duplicate payment
    # ---------------------------------------------
    if Payment.objects.filter(
        connection=connection,
        status="completed"
    ).exists():
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed. This connection has already been paid for."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Find assigned admin
    # ---------------------------------------------
    try:
        assignment = ClientAssignment.objects.get(
            user=user
        )
        assigned_admin = assignment.assigned_admin
    except ClientAssignment.DoesNotExist:
        logger.warning(f"No assignment found for user: {user.email}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Get hookup fee
    # ---------------------------------------------
    try:
        platform_config = PlatformConfig.objects.get(
            owner=assigned_admin
        )
        hookup_fee = Decimal(platform_config.hookup_fee)
    except PlatformConfig.DoesNotExist:
        logger.warning(f"No platform config for admin: {assigned_admin.email}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Check Pesapal configuration
    # ---------------------------------------------
    try:
        PaymentConfiguration.objects.get(
            gateway_name="Pesapal",
            is_active=True
        )
    except PaymentConfiguration.DoesNotExist:
        logger.error("Pesapal configuration missing")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed. Please try again later."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # ---------------------------------------------
    # Create merchant reference
    # ---------------------------------------------
    merchant_reference = f"HOOK-{uuid.uuid4().hex[:12].upper()}"

    # ---------------------------------------------
    # Create payment record
    # ---------------------------------------------
    payment = Payment.objects.create(
        user=user,
        connection=connection,
        merchant_reference=merchant_reference,
        amount=hookup_fee,
        phone_number=phone_number,
        status="pending"
    )

    # ---------------------------------------------
    # Send order to Pesapal
    # ---------------------------------------------
    try:
        pesapal_response = submit_order(
            payment=payment,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
        )
    except Exception as e:
        payment.status = "failed"
        payment.save()
        logger.error(f"❌ Pesapal submit order error: {str(e)}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed. Please try again."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if pesapal_response.get("status") != "200":
        payment.status = "failed"
        payment.save()
        logger.error(f"❌ Pesapal response error: {pesapal_response}")
        return Response(
            {
                "success": False,
                "message": "Payment initiation failed. Please try again."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Save tracking ID
    # ---------------------------------------------
    payment.order_tracking_id = pesapal_response.get("order_tracking_id")
    payment.save()

    return Response(
        {
            "success": True,
            "message": "Payment initiated successfully.",
            "payment": {
                "id": payment.id,
                "merchant_reference": payment.merchant_reference,
                "amount": payment.amount,
                "status": payment.status,
                "order_tracking_id": payment.order_tracking_id
            },
            "redirect_url": pesapal_response.get("redirect_url")
        },
        status=status.HTTP_200_OK
    )

















# =====================================================
# PESAPAL IPN CALLBACK
# =====================================================

@api_view(["GET", "POST"])
def ipn_callback(request):
    """
    Handle PesaPal IPN (Instant Payment Notification) callbacks.
    Now with commission distribution on successful payment.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        logger.error("❌ Database connection error in IPN callback")
        return Response(
            {
                "success": False,
                "message": "Service temporarily unavailable."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                "message": "Invalid IPN notification."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )
    except Payment.DoesNotExist:
        logger.error(f"❌ Payment not found for tracking ID: {order_tracking_id}")
        return Response(
            {
                "success": False,
                "message": "Payment not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        verification = get_transaction_status(order_tracking_id)
        payment_status = verification.get("payment_status_description")
        logger.info(f"Verified payment status: {payment_status}")

        commission_result = None

        if payment_status == "Completed":
            # Update payment
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save()

            # Update connection
            connection = payment.connection
            connection.status = Connection.Status.COMPLETED
            connection.save()

            logger.info(f"✅ Payment {order_tracking_id} marked as completed")
            logger.info(f"✅ Connection {connection.connection_id} marked as completed")

            # ============================================================
            # DISTRIBUTE COMMISSION USING COMMISSION SERVICE
            # ============================================================
            try:
                commission_result = CommissionService.distribute_commission_for_payment(payment)
                logger.info(f"✅ Commission distributed successfully: {commission_result}")
            except CommissionDistributionError as e:
                logger.error(f"❌ Commission distribution failed: {str(e)}")
                commission_result = {
                    "success": False,
                    "error": str(e)
                }

            # ============================================================
            # CREATE NOTIFICATIONS FOR IPN
            # ============================================================

            # 1. Notification for the SENDER (user who paid)
            Notification.objects.create(
                user=connection.sender,
                connection=connection,
                title="Payment Successful! 🎉",
                message=f"Your payment of KES {payment.amount} for hookup with {connection.receiver.full_name} has been completed successfully. Your connection is now active!",
                notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                is_read=False,
            )

            # 2. Notification for the RECEIVER (admin)
            admin_amount = commission_result.get('admin_amount', 0) if commission_result and commission_result.get('success') else 0
            admin_message = (
                f"{connection.sender.full_name} has completed payment for their hookup. "
                f"You have received KES {admin_amount:.2f} as your commission." 
                if admin_amount > 0 
                else f"{connection.sender.full_name} has completed payment for their hookup. "
                f"The connection is now ready for service."
            )
            
            Notification.objects.create(
                user=connection.receiver,
                connection=connection,
                title="New Completed Connection! 🎉",
                message=admin_message,
                notification_type=Notification.NotificationType.CONNECTION_COMPLETED,
                is_read=False,
            )

            # 3. Notification for Superadmin (if commission was distributed)
            if commission_result and commission_result.get('success'):
                superadmin_amount = commission_result.get('superadmin_amount', 0)
                if superadmin_amount > 0:
                    superadmin = Accounts.objects.filter(role='superadmin', is_active=True).first()
                    if superadmin:
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

            logger.info(f"✅ IPN: Notifications created for completed payment")

        elif payment_status == "Failed":
            payment.status = "failed"
            payment.save()

            # Create failure notification for sender
            Notification.objects.create(
                user=payment.user,
                connection=payment.connection,
                title="Payment Failed ❌",
                message=f"Your payment of KES {payment.amount} failed. Please try again or contact support.",
                notification_type=Notification.NotificationType.PAYMENT_FAILED,
                is_read=False,
            )
            logger.info("❌ IPN: Payment failed")

        elif payment_status == "Cancelled":
            payment.status = "cancelled"
            payment.save()
            logger.info("⚠️ IPN: Payment cancelled")

        else:
            payment.status = "pending"
            payment.save()
            logger.info("⏳ IPN: Payment still pending")

        return Response(
            {
                "success": True,
                "message": "IPN processed.",
                "payment_status": payment.status,
                "connection_status": payment.connection.status,
                "commission_distribution": commission_result if commission_result else None
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"❌ IPN processing error: {str(e)}", exc_info=True)
        return Response(
            {
                "success": False,
                "message": "IPN processing failed."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

























# =====================================================
# REGISTER PESAPAL IPN
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def register_ipn(request):
    """
    Register IPN URL with PesaPal.
    """
    try:
        response = register_ipn_url()

        if response.get("status") != "200":
            return Response(
                {
                    "success": False,
                    "message": "IPN registration failed. Please try again."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        config, created = PaymentConfiguration.objects.update_or_create(
            gateway_name="Pesapal",
            defaults={
                "ipn_id": response.get("ipn_id"),
                "ipn_url": response.get("url"),
                "is_active": True
            }
        )

        return Response(
            {
                "success": True,
                "message": "IPN registered successfully.",
                "data": {
                    "ipn_id": config.ipn_id,
                    "ipn_url": config.ipn_url
                }
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"❌ IPN registration error: {str(e)}", exc_info=True)
        return Response(
            {
                "success": False,
                "message": "IPN registration failed. Please try again."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# PAYMENT SUCCESS - Redirect from PesaPal to Frontend
# =====================================================

@api_view(["GET"])
def payment_success(request):
    """
    Handles the redirect from PesaPal after a user completes payment.
    Redirects to the frontend success page with payment details.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        logger.error("❌ Database connection error in payment success")
        error_url = "https://hookiefy.netlify.app/payment-error?message=Payment+failed"
        return redirect(error_url)

    # Get the tracking ID and merchant reference from the URL
    order_tracking_id = request.query_params.get("OrderTrackingId")
    merchant_reference = request.query_params.get("OrderMerchantReference")

    logger.info("=" * 60)
    logger.info("PAYMENT SUCCESS REDIRECT")
    logger.info(f"OrderTrackingId: {order_tracking_id}")
    logger.info(f"OrderMerchantReference: {merchant_reference}")
    logger.info("=" * 60)

    if not order_tracking_id:
        error_url = "https://hookiefy.netlify.app/payment-error?message=Payment+failed"
        return redirect(error_url)

    try:
        # Find the payment
        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )

        # Verify the payment status with PesaPal
        verification = get_transaction_status(order_tracking_id)
        payment_status = verification.get("payment_status_description")

        logger.info(f"Verified payment status: {payment_status}")

        commission_result = None

        # Update payment status if needed
        if payment_status == "Completed" and payment.status != "completed":
            # Update payment
            payment.status = "completed"
            payment.paid_at = timezone.now()
            payment.save()

            # Update connection status
            connection = payment.connection
            connection.status = Connection.Status.COMPLETED
            connection.save()

            logger.info(f"✅ Payment {order_tracking_id} marked as completed")
            logger.info(f"✅ Connection {connection.connection_id} marked as completed")

            # ============================================================
            # DISTRIBUTE COMMISSION USING COMMISSION SERVICE
            # ============================================================
            try:
                commission_result = CommissionService.distribute_commission_for_payment(payment)
                logger.info(f"✅ Commission distributed successfully: {commission_result}")
            except CommissionDistributionError as e:
                logger.error(f"❌ Commission distribution failed: {str(e)}")
                commission_result = {
                    "success": False,
                    "error": str(e)
                }

            # ============================================================
            # CREATE NOTIFICATIONS FOR SUCCESS REDIRECT
            # ============================================================

            # 1. Notification for the SENDER (user who paid)
            Notification.objects.create(
                user=connection.sender,
                connection=connection,
                title="Payment Successful! 🎉",
                message=f"Your payment of KES {payment.amount} for hookup with {connection.receiver.full_name} has been completed successfully. Your connection is now active!",
                notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                is_read=False,
            )

            # 2. Notification for the RECEIVER (admin)
            admin_amount = commission_result.get('admin_amount', 0) if commission_result and commission_result.get('success') else 0
            admin_message = (
                f"{connection.sender.full_name} has completed payment for their hookup. "
                f"You have received KES {admin_amount:.2f} as your commission." 
                if admin_amount > 0 
                else f"{connection.sender.full_name} has completed payment for their hookup. "
                f"The connection is now ready for service."
            )
            
            Notification.objects.create(
                user=connection.receiver,
                connection=connection,
                title="New Completed Connection! 🎉",
                message=admin_message,
                notification_type=Notification.NotificationType.CONNECTION_COMPLETED,
                is_read=False,
            )

            # 3. Mark pending notifications as read
            Notification.objects.filter(
                connection=connection,
                user=connection.sender,
                notification_type__in=[
                    Notification.NotificationType.CONNECTION_REQUEST,
                    Notification.NotificationType.CONNECTION_ACCEPTED,
                    Notification.NotificationType.PAYMENT_PENDING,
                ]
            ).update(is_read=True)

            logger.info(f"✅ Notifications created for both parties")
            logger.info(f"🎉 Payment and connection completed successfully!")

        # ============================================================
        # REDIRECT TO FRONTEND SUCCESS PAGE
        # ============================================================

        frontend_url = "https://hookiefy.netlify.app/payment-success"

        redirect_url = (
            f"{frontend_url}"
            f"?order_tracking_id={order_tracking_id}"
            f"&merchant_reference={merchant_reference or payment.merchant_reference}"
            f"&payment_status={payment.status}"
            f"&amount={payment.amount}"
            f"&connection_id={payment.connection.connection_id}"
        )

        # Add commission info if available
        if commission_result and commission_result.get('success'):
            redirect_url += f"&admin_amount={commission_result.get('admin_amount', 0)}"
            redirect_url += f"&superadmin_amount={commission_result.get('superadmin_amount', 0)}"
            redirect_url += f"&commission_percentage={commission_result.get('commission_percentage', 0)}"

        logger.info(f"🔀 Redirecting to: {redirect_url}")

        return redirect(redirect_url)

    except Payment.DoesNotExist:
        logger.error(f"❌ Payment not found for tracking ID: {order_tracking_id}")
        error_url = f"https://hookiefy.netlify.app/payment-error?message=Payment+failed"
        return redirect(error_url)

    except Exception as e:
        logger.error(f"❌ Error processing payment success: {e}", exc_info=True)
        error_url = f"https://hookiefy.netlify.app/payment-error?message=Payment+failed"
        return redirect(error_url)


# =====================================================
# PAYMENT FAILURE - Redirect from PesaPal to Frontend
# =====================================================

@api_view(["GET"])
def payment_failure(request):
    """
    Handles the redirect from PesaPal when a payment fails or is cancelled.
    Redirects to the frontend failure page.
    """
    # Ensure database connection is healthy
    if not ensure_db_connection():
        logger.error("❌ Database connection error in payment failure")
        error_url = "https://hookiefy.netlify.app/payment-error?message=Payment+failed"
        return redirect(error_url)

    order_tracking_id = request.query_params.get("OrderTrackingId")
    merchant_reference = request.query_params.get("OrderMerchantReference")

    logger.info("=" * 60)
    logger.info("PAYMENT FAILURE REDIRECT")
    logger.info(f"OrderTrackingId: {order_tracking_id}")
    logger.info(f"OrderMerchantReference: {merchant_reference}")
    logger.info("=" * 60)

    if order_tracking_id:
        try:
            payment = Payment.objects.get(order_tracking_id=order_tracking_id)
            payment.status = "failed"
            payment.save()
            logger.info(f"❌ Payment {order_tracking_id} marked as failed")

            # Create failure notification for sender
            Notification.objects.create(
                user=payment.user,
                connection=payment.connection,
                title="Payment Failed ❌",
                message=f"Your payment of KES {payment.amount} failed. Please try again or contact support.",
                notification_type=Notification.NotificationType.PAYMENT_FAILED,
                is_read=False,
            )
            logger.info(f"✅ Notification created for payment failure")

        except Payment.DoesNotExist:
            logger.warning(f"Payment not found for tracking ID: {order_tracking_id}")

    # Redirect to frontend failure page
    frontend_url = "https://hookiefy.netlify.app/payment-failure"

    redirect_url = (
        f"{frontend_url}"
        f"?order_tracking_id={order_tracking_id or ''}"
        f"&merchant_reference={merchant_reference or ''}"
        f"&message=Payment+was+not+completed"
    )

    logger.info(f"🔀 Redirecting to: {redirect_url}")

    return redirect(redirect_url)


# =====================================================
# GET PAYMENT STATUS
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_payment_status(request, payment_id):
    """
    Get the status of a specific payment.
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
        payment = Payment.objects.get(
            id=payment_id,
            user=request.user
        )

        # Optionally verify with PesaPal
        if payment.order_tracking_id:
            verification = get_transaction_status(payment.order_tracking_id)
            payment_status = verification.get("payment_status_description")
            
            # Update status if different
            if payment_status:
                status_map = {
                    "Completed": "completed",
                    "Failed": "failed",
                    "Cancelled": "cancelled",
                    "Pending": "pending"
                }
                new_status = status_map.get(payment_status)
                if new_status and new_status != payment.status:
                    payment.status = new_status
                    if new_status == "completed":
                        payment.paid_at = timezone.now()
                    payment.save()

        return Response(
            {
                "success": True,
                "payment": {
                    "id": payment.id,
                    "merchant_reference": payment.merchant_reference,
                    "amount": payment.amount,
                    "status": payment.status,
                    "order_tracking_id": payment.order_tracking_id,
                    "paid_at": payment.paid_at,
                    "created_at": payment.created_at,
                    "updated_at": payment.updated_at
                }
            },
            status=status.HTTP_200_OK
        )

    except Payment.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Payment not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        logger.error(f"❌ Error getting payment status: {str(e)}", exc_info=True)
        return Response(
            {
                "success": False,
                "message": "Unable to retrieve payment status. Please try again."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )