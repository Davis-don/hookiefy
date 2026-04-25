from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import redirect
from decouple import config
import logging
import json

from .models import Payment
from .pesapal import get_token, register_ipn, submit_order_request, query_payment_status
from adminconfig.models import ClientConfig

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def Make_payment(request):
    """Create payment and redirect to Pesapal"""
    try:
        logger.info(f"Payment request received from user: {request.user.email}")
        
        # Get client profile
        if not hasattr(request.user, 'client_profile'):
            logger.error(f"User {request.user.email} has no client profile")
            return JsonResponse({"error": "Client profile not found"}, status=400)
        
        client = request.user.client_profile
        
        # Get hookup_id from request
        hookup_id = request.data.get("hookup_id")
        
        # Get configuration
        try:
            config_obj = ClientConfig.get_config()
            if not config_obj:
                logger.error("ClientConfig missing")
                return JsonResponse({"error": "System configuration missing"}, status=400)
            
            amount = config_obj.hookup_fee
            logger.info(f"Amount from config: {amount}")
        except Exception as e:
            logger.error(f"Error getting config: {str(e)}")
            return JsonResponse({"error": "Configuration error"}, status=500)
        
        # Get customer details
        email = request.user.email
        phone = request.data.get("phone", "0700000000")
        first_name = request.user.first_name or "User"
        
        # Get token from Pesapal
        logger.info("Getting Pesapal token...")
        token = get_token()
        if not token:
            logger.error("Failed to get token from Pesapal")
            return JsonResponse({"error": "Payment gateway authentication failed"}, status=500)
        
        # Register IPN
        logger.info("Registering IPN...")
        ipn_response = register_ipn(token)
        ipn_id = ipn_response.get("ipn_id")
        
        if not ipn_id:
            logger.error(f"IPN registration failed: {ipn_response}")
            return JsonResponse({"error": "IPN registration failed", "details": ipn_response}, status=500)
        
        # Submit order
        logger.info("Submitting order...")
        order_response, merchant_ref = submit_order_request(
            token, ipn_id, amount, email, phone, first_name
        )
        
        # Check if order was successful
        if not merchant_ref or not order_response.get("redirect_url"):
            error_msg = order_response.get("error", "Order creation failed")
            logger.error(f"Order submission failed: {error_msg}")
            return JsonResponse(
                {"error": error_msg, "details": order_response.get("full_response", {})}, 
                status=400
            )
        
        # Create payment record
        try:
            hookup = None
            if hookup_id:
                from hookup.models import Hookup
                try:
                    hookup = Hookup.objects.get(id=hookup_id)
                    logger.info(f"Found hookup: {hookup.id}")
                except Hookup.DoesNotExist:
                    logger.warning(f"Hookup {hookup_id} not found")
            
            payment = Payment.objects.create(
                client=client,
                hookup=hookup,
                amount=amount,
                email=email,
                phone_number=phone,
                merchant_reference=merchant_ref,
                order_tracking_id=order_response.get("order_tracking_id"),
                redirect_url=order_response.get("redirect_url"),
                callback_url=settings.PESAPAL_CALLBACK_URL,
                ipn_id=ipn_id,
                pesapal_response=order_response,
                status="pending"
            )
            logger.info(f"Payment record created successfully: {payment.id}")
        except Exception as e:
            logger.error(f"Error creating payment record: {str(e)}", exc_info=True)
            return JsonResponse({"error": f"Failed to save payment record: {str(e)}"}, status=500)
        
        # Return success response with redirect URL
        return JsonResponse({
            "success": True,
            "message": "Payment initiated successfully",
            "redirect_url": payment.redirect_url,
            "order_tracking_id": payment.order_tracking_id,
            "merchant_reference": payment.merchant_reference,
            "payment_id": payment.id
        })
        
    except Exception as e:
        logger.error(f"Unexpected error in Make_payment: {str(e)}", exc_info=True)
        return JsonResponse({"error": f"Internal server error: {str(e)}"}, status=500)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def pesapal_callback(request):
    """Handle Pesapal callback after payment - Redirects to client dashboard"""
    try:
        logger.info(f"=== CALLBACK RECEIVED ===")
        logger.info(f"Method: {request.method}")
        logger.info(f"GET params: {dict(request.GET)}")
        
        if request.method == "POST" and request.body:
            try:
                body_json = json.loads(request.body)
                logger.info(f"POST JSON body: {body_json}")
            except:
                logger.info(f"POST raw body: {request.body}")
        
        # Get order tracking ID
        order_tracking_id = (
            request.GET.get("OrderTrackingId") or 
            request.GET.get("order_tracking_id") or
            request.POST.get("OrderTrackingId") or
            request.POST.get("order_tracking_id")
        )
        
        if not order_tracking_id:
            logger.error("Missing OrderTrackingId in callback")
            return JsonResponse({"status": "OK"}, status=200)
        
        logger.info(f"Processing payment for OrderTrackingId: {order_tracking_id}")
        
        # Find payment
        try:
            payment = Payment.objects.get(order_tracking_id=order_tracking_id)
            logger.info(f"Payment found: ID={payment.id}, Current Status={payment.status}")
        except Payment.DoesNotExist:
            logger.error(f"Payment not found for tracking ID: {order_tracking_id}")
            # Redirect to dashboard with error
            frontend_url = config("FRONTEND_URL", default="http://localhost:5173")
            return redirect(f"{frontend_url}/client/dashboard?payment=error&message=Payment+not+found")
        
        # Query Pesapal for latest status
        token = get_token()
        if token:
            status_data = query_payment_status(token, order_tracking_id)
            
            if status_data:
                logger.info(f"PesaPal Status Response: {status_data}")
                
                pesapal_status = status_data.get("status_code")
                
                if pesapal_status == 1:
                    if payment.status != "completed":
                        payment.mark_completed(status_data)
                        logger.info(f"✅ Payment {payment.id} marked as COMPLETED")
                        
                        # Update hookup if exists
                        if payment.hookup:
                            try:
                                payment.hookup.mark_as_paid()
                                logger.info(f"✅ Hookup {payment.hookup.id} marked as PAID")
                            except Exception as e:
                                logger.error(f"Error updating hookup: {str(e)}")
                    else:
                        logger.info(f"Payment already completed")
                        
                elif pesapal_status == 3:
                    if payment.status != "failed":
                        payment.mark_failed(status_data)
                        logger.info(f"❌ Payment {payment.id} marked as FAILED")
                else:
                    logger.info(f"⏳ Payment pending (status: {pesapal_status})")
                    payment.pesapal_status_response = status_data
                    payment.save()
        
        # Redirect to frontend dashboard
        frontend_url = config("FRONTEND_URL", default="http://localhost:5173")
        
        if request.method == "GET":
            if payment.status == "completed":
                # Redirect to client dashboard on success
                return redirect(f"{frontend_url}/client/dashboard?payment=success&order_tracking_id={order_tracking_id}")
            elif payment.status == "failed":
                # Redirect to client dashboard on failure
                return redirect(f"{frontend_url}/client/dashboard?payment=failed&order_tracking_id={order_tracking_id}")
            else:
                # Still pending
                return redirect(f"{frontend_url}/client/dashboard?payment=pending&order_tracking_id={order_tracking_id}")
        
        return JsonResponse({
            "status": "OK",
            "payment_status": payment.status,
            "order_tracking_id": order_tracking_id
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error in callback: {str(e)}", exc_info=True)
        frontend_url = config("FRONTEND_URL", default="http://localhost:5173")
        return redirect(f"{frontend_url}/client/dashboard?payment=error&message={str(e)}")


@api_view(["GET"])
def check_payment_by_email(request, email):
    """Check payment status by email - For frontend to poll"""
    try:
        # Get latest payment for this email
        payment = Payment.objects.filter(email=email).order_by('-created_at').first()
        
        if not payment:
            return JsonResponse({
                "found": False,
                "message": "No payment found for this email"
            }, status=404)
        
        # Query fresh status from Pesapal
        token = get_token()
        if token:
            status_data = query_payment_status(token, payment.order_tracking_id)
            if status_data and status_data.get("status_code") == 1:
                if payment.status != "completed":
                    payment.mark_completed(status_data)
                    if payment.hookup:
                        try:
                            payment.hookup.mark_as_paid()
                        except:
                            pass
        
        return JsonResponse({
            "found": True,
            "payment_id": payment.id,
            "status": payment.status,
            "amount": str(payment.amount),
            "paid_at": payment.paid_at,
            "has_hookup": payment.hookup is not None,
            "hookup_paid": payment.hookup.payment_status == "paid" if payment.hookup else False
        })
        
    except Exception as e:
        logger.error(f"Error checking payment by email: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def sync_all_payments(request):
    """Sync all pending payments with Pesapal - Run this periodically"""
    try:
        pending_payments = Payment.objects.filter(status="pending")
        updated_count = 0
        
        token = get_token()
        if not token:
            return JsonResponse({"error": "Failed to get token"}, status=500)
        
        for payment in pending_payments:
            status_data = query_payment_status(token, payment.order_tracking_id)
            
            if status_data and status_data.get("status_code") == 1:
                payment.mark_completed(status_data)
                updated_count += 1
                
                if payment.hookup:
                    try:
                        payment.hookup.mark_as_paid()
                    except:
                        pass
                
                logger.info(f"Synced payment {payment.id} to completed")
        
        return JsonResponse({
            "success": True,
            "synced_count": updated_count,
            "total_pending": pending_payments.count()
        })
        
    except Exception as e:
        logger.error(f"Error syncing payments: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def payment_status(request, order_tracking_id):
    """Check payment status"""
    try:
        payment = Payment.objects.get(order_tracking_id=order_tracking_id)
        
        return JsonResponse({
            "status": payment.status,
            "paid_at": payment.paid_at,
            "amount": payment.amount,
            "currency": payment.currency,
            "order_tracking_id": payment.order_tracking_id,
            "merchant_reference": payment.merchant_reference,
            "created_at": payment.created_at
        })
        
    except Payment.DoesNotExist:
        return JsonResponse({"error": "Payment not found"}, status=404)
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)