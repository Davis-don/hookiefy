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
from django.db import transaction

from assignments.models import ClientAssignment
from administration.models import PlatformConfig
from paymentconfigurations.models import PaymentConfiguration
from connections.models import Connection
from payments.models import Payment
from notification.models import Notification
from account.models import Accounts
from UserBalance.models import UserBalance

from .services import PaystackService
from .models import PaystackTransaction
from .serializers import InitiatePaymentSerializer

logger = logging.getLogger(__name__)


# =====================================================
# PAYSTACK CONFIGURATION STATUS
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def paystack_config_status(request):
    """
    Check Paystack configuration status.
    """
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
                "message": "Connection not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # Check ownership
    if connection.sender != user:
        return Response(
            {
                "success": False,
                "message": "You do not have permission to pay for this connection."
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

    # Get assigned admin
    try:
        assignment = ClientAssignment.objects.get(user=user)
        assigned_admin = assignment.assigned_admin
    except ClientAssignment.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "User not assigned to any admin."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get hookup fee
    try:
        platform_config = PlatformConfig.objects.get(owner=assigned_admin)
        hookup_fee = Decimal(platform_config.hookup_fee)
    except PlatformConfig.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Platform configuration not found."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ FIX: Check Paystack configuration with lowercase "paystack"
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
        }
    )

    # Initialize Paystack transaction
    paystack_service = PaystackService()
    
    metadata = {
        "payment_id": payment.id,
        "connection_id": str(connection.connection_id),
        "user_id": user.id,
        "phone_number": phone_number,
    }
    
    paystack_response = paystack_service.initialize_transaction(
        email=email,
        amount=hookup_fee,
        reference=merchant_reference,
        metadata=metadata
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
    from commisions.services.commission_service import CommissionService, CommissionDistributionError
    
    reference = webhook_data.get("reference")
    amount = webhook_data.get("amount", 0) / 100  # Convert back from cents
    metadata = webhook_data.get("metadata", {})
    
    try:
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
            
            # Distribute commission
            try:
                commission_result = CommissionService.distribute_commission_for_payment(payment)
                logger.info(f"✅ Commission distributed: {commission_result}")
            except CommissionDistributionError as e:
                logger.error(f"❌ Commission distribution failed: {str(e)}")
                commission_result = {"success": False, "error": str(e)}
            except Exception as e:
                logger.error(f"❌ Unexpected error in commission distribution: {str(e)}")
                commission_result = {"success": False, "error": str(e)}
            
            # Create notifications
            create_payment_notifications(payment, commission_result)
            
            return Response(
                {
                    "status": "success",
                    "message": "Payment processed successfully",
                    "payment_status": payment.status,
                    "connection_status": connection.status,
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
# PAYSTACK PAYMENT SUCCESS REDIRECT
# =====================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def paystack_success(request):
    """
    Handle Paystack success redirect (frontend).
    """
    reference = request.query_params.get("reference")
    trxref = request.query_params.get("trxref")
    
    logger.info("=" * 60)
    logger.info("PAYSTACK SUCCESS REDIRECT")
    logger.info(f"Reference: {reference}")
    logger.info(f"Trxref: {trxref}")
    logger.info("=" * 60)
    
    ref = reference or trxref
    
    if not ref:
        return redirect("https://hookiefy.netlify.app/payment-error?message=Payment+failed")
    
    try:
        payment = Payment.objects.get(merchant_reference=ref)
        paystack_transaction = PaystackTransaction.objects.get(reference=ref)
    except (Payment.DoesNotExist, PaystackTransaction.DoesNotExist):
        logger.error(f"❌ Payment not found for reference: {ref}")
        return redirect("https://hookiefy.netlify.app/payment-error?message=Payment+failed")
    
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
            
            # Distribute commission
            from commisions.services.commission_service import CommissionService, CommissionDistributionError
            try:
                commission_result = CommissionService.distribute_commission_for_payment(payment)
                logger.info(f"✅ Commission distributed: {commission_result}")
            except CommissionDistributionError as e:
                logger.error(f"❌ Commission distribution failed: {str(e)}")
                commission_result = {"success": False, "error": str(e)}
            except Exception as e:
                logger.error(f"❌ Unexpected error in commission distribution: {str(e)}")
                commission_result = {"success": False, "error": str(e)}
            
            # Create notifications
            create_payment_notifications(payment, commission_result)
    
    # Redirect to frontend success page
    return redirect(
        f"https://hookiefy.netlify.app/payment-success"
        f"?reference={ref}"
        f"&payment_status={payment.status}"
        f"&amount={payment.amount}"
        f"&connection_id={payment.connection.connection_id}"
        f"&gateway=paystack"
    )


# =====================================================
# PAYSTACK PAYMENT FAILURE REDIRECT
# =====================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def paystack_failure(request):
    """
    Handle Paystack failure redirect (frontend).
    """
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
            
            logger.info(f"❌ Payment {ref} marked as failed")
        except (Payment.DoesNotExist, PaystackTransaction.DoesNotExist):
            logger.warning(f"Payment not found for reference: {ref}")
    
    return redirect("https://hookiefy.netlify.app/payment-failure?message=Payment+failed")


# =====================================================
# VERIFY PAYSTACK PAYMENT
# =====================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_paystack_payment(request, reference):
    """
    Verify a Paystack payment status.
    """
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

def create_payment_notifications(payment, commission_result=None):
    """
    Create notifications for successful payment.
    """
    connection = payment.connection
    
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
    
    # 3. Notification for Superadmin
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
    
    logger.info(f"✅ Notifications created for payment {payment.merchant_reference}")