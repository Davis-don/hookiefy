from decimal import Decimal
import uuid
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone

from assignments.models import ClientAssignment
from administration.models import PlatformConfig
from paymentconfigurations.models import PaymentConfiguration
from connections.models import Connection
from payments.models import Payment
from notification.models import Notification

from .services.register_ipn import register_ipn_url
from .services.submit_order import submit_order
from .services.get_transaction_status import get_transaction_status

# Set up logger
logger = logging.getLogger(__name__)


# =====================================================
# INITIATE PAYMENT
# =====================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):

    user = request.user

    connection_id = request.data.get("connection_id")
    phone_number = request.data.get("phone_number")

    if not connection_id:
        return Response(
            {
                "success": False,
                "message": "connection_id is required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if not phone_number:
        return Response(
            {
                "success": False,
                "message": "phone_number is required."
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

        return Response(
            {
                "success": False,
                "message": "Connection not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # ---------------------------------------------
    # Check ownership
    # ---------------------------------------------

    if connection.sender != user:

        return Response(
            {
                "success": False,
                "message": "You cannot pay for this connection."
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
                "message": "This connection is already paid."
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

    except ClientAssignment.DoesNotExist:

        return Response(
            {
                "success": False,
                "message": "You are not assigned to any admin."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Get hookup fee
    # ---------------------------------------------

    try:

        platform_config = PlatformConfig.objects.get(
            owner=assignment.assigned_admin
        )

    except PlatformConfig.DoesNotExist:

        return Response(
            {
                "success": False,
                "message": "Admin has not configured hookup fee."
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

        return Response(
            {
                "success": False,
                "message": "Pesapal configuration missing."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # ---------------------------------------------
    # Create merchant reference
    # ---------------------------------------------

    merchant_reference = (
        f"HOOK-{uuid.uuid4().hex[:12].upper()}"
    )

    # ---------------------------------------------
    # Create payment record
    # ---------------------------------------------

    payment = Payment.objects.create(

        user=user,

        connection=connection,

        merchant_reference=merchant_reference,

        amount=Decimal(
            platform_config.hookup_fee
        ),

        phone_number=phone_number,

        status="pending"
    )

    # ---------------------------------------------
    # Send order to Pesapal
    # ---------------------------------------------

    pesapal_response = submit_order(

        payment=payment,

        first_name=user.first_name,

        last_name=user.last_name,

        email=user.email,

    )

    if pesapal_response.get("status") != "200":

        payment.status = "failed"
        payment.save()

        return Response(
            {
                "success": False,
                "message": "Pesapal payment initialization failed.",
                "error": pesapal_response
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------------------------------------------
    # Save tracking ID
    # ---------------------------------------------

    payment.order_tracking_id = (
        pesapal_response.get(
            "order_tracking_id"
        )
    )

    payment.save()

    return Response(
        {
            "success": True,

            "message": "Payment initialized.",

            "payment": {

                "id": payment.id,

                "merchant_reference":
                    payment.merchant_reference,

                "amount":
                    payment.amount,

                "status":
                    payment.status,

                "order_tracking_id":
                    payment.order_tracking_id
            },

            "redirect_url":
                pesapal_response.get(
                    "redirect_url"
                )
        },

        status=status.HTTP_200_OK
    )


# =====================================================
# PESAPAL IPN CALLBACK
# =====================================================

@api_view(["GET", "POST"])
def ipn_callback(request):

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

        return Response(
            {
                "success": False,
                "message": "Missing order tracking id."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:

        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )

    except Payment.DoesNotExist:

        return Response(
            {
                "success": False,
                "message": "Payment not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    verification = get_transaction_status(
        order_tracking_id
    )

    payment_status = verification.get(
        "payment_status_description"
    )

    logger.info(f"Verified payment status: {payment_status}")

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
        Notification.objects.create(
            user=connection.receiver,
            connection=connection,
            title="New Completed Connection! 🎉",
            message=f"{connection.sender.full_name} has completed payment for their hookup. The connection is now ready for service.",
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
            "connection_status":
                payment.connection.status
        },
        status=status.HTTP_200_OK
    )


# =====================================================
# REGISTER PESAPAL IPN
# =====================================================

@api_view(["GET"])
def register_ipn(request):

    try:

        response = register_ipn_url()

        if response.get("status") != "200":

            return Response(
                {
                    "success": False,
                    "message": "Pesapal IPN registration failed.",
                    "error": response
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        config, created = (
            PaymentConfiguration.objects.update_or_create(

                gateway_name="Pesapal",

                defaults={

                    "ipn_id":
                        response.get("ipn_id"),

                    "ipn_url":
                        response.get("url"),

                    "is_active":
                        True
                }
            )
        )

        return Response(
            {
                "success": True,

                "message":
                    "IPN registered successfully.",

                "data": {

                    "ipn_id":
                        config.ipn_id,

                    "ipn_url":
                        config.ipn_url
                }
            }
        )

    except Exception as e:

        return Response(
            {
                "success": False,
                "message": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# PAYMENT SUCCESS - Redirect from PesaPal
# =====================================================

@api_view(["GET"])
def payment_success(request):
    """
    Handles the redirect from PesaPal after a user completes payment.
    This is where the user is sent after paying on PesaPal's site.
    """
    
    # Get the tracking ID and merchant reference from the URL
    order_tracking_id = request.query_params.get("OrderTrackingId")
    merchant_reference = request.query_params.get("OrderMerchantReference")
    
    logger.info("=" * 60)
    logger.info("PAYMENT SUCCESS REDIRECT")
    logger.info(f"OrderTrackingId: {order_tracking_id}")
    logger.info(f"OrderMerchantReference: {merchant_reference}")
    logger.info("=" * 60)
    
    if not order_tracking_id:
        return Response(
            {
                "success": False,
                "message": "Missing OrderTrackingId."
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Find the payment
        payment = Payment.objects.get(
            order_tracking_id=order_tracking_id
        )
        
        # Verify the payment status with PesaPal
        verification = get_transaction_status(order_tracking_id)
        payment_status = verification.get("payment_status_description")
        
        logger.info(f"Verified payment status: {payment_status}")
        
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
            
            # 2. Notification for the RECEIVER (admin who will provide the service)
            Notification.objects.create(
                user=connection.receiver,
                connection=connection,
                title="New Completed Connection! 🎉",
                message=f"{connection.sender.full_name} has completed payment for their hookup. The connection is now ready for service.",
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
            logger.info(f"   Sender: {connection.sender.full_name}")
            logger.info(f"   Receiver: {connection.receiver.full_name}")
            logger.info(f"   Amount: KES {payment.amount}")
            logger.info(f"   Connection ID: {connection.connection_id}")
        
        # Return a success response
        return Response(
            {
                "success": True,
                "message": "Payment processed successfully.",
                "data": {
                    "order_tracking_id": order_tracking_id,
                    "merchant_reference": merchant_reference,
                    "payment_status": payment.status,
                    "amount": payment.amount,
                    "currency": "KES",
                    "connection_id": str(payment.connection.connection_id),
                    "sender": payment.connection.sender.full_name,
                    "receiver": payment.connection.receiver.full_name,
                }
            },
            status=status.HTTP_200_OK
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
        
    except Exception as e:
        logger.error(f"❌ Error processing payment success: {e}")
        return Response(
            {
                "success": False,
                "message": "An error occurred while processing your payment.",
                "error": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# PAYMENT FAILURE - Redirect from PesaPal
# =====================================================

@api_view(["GET"])
def payment_failure(request):
    """
    Handles the redirect from PesaPal when a payment fails or is cancelled.
    """
    
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
            pass
    
    return Response(
        {
            "success": False,
            "message": "Payment was not completed. Please try again.",
            "data": {
                "order_tracking_id": order_tracking_id,
                "merchant_reference": merchant_reference,
            }
        },
        status=status.HTTP_200_OK
    )