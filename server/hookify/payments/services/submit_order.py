import requests
import logging
from django.conf import settings

from .get_pesapal_token import get_pesapal_token
from paymentconfigurations.models import PaymentConfiguration

# Set up logging
logger = logging.getLogger(__name__)


def submit_order(
    payment,
    first_name,
    last_name,
    email,
):
    """
    Creates a payment order on Pesapal.
    
    Args:
        payment: Payment object with amount, merchant_reference, phone_number
        first_name: User's first name
        last_name: User's last name
        email: User's email address
    
    Returns:
        dict: Response from Pesapal with status, order_tracking_id, redirect_url
    """
    
    logger.info("=" * 60)
    logger.info("SUBMITTING ORDER TO PESAPAL")
    logger.info(f"Merchant Reference: {payment.merchant_reference}")
    logger.info(f"Amount: {payment.amount}")
    logger.info(f"Phone: {payment.phone_number}")
    logger.info("=" * 60)

    # Get authentication token
    token_response = get_pesapal_token()

    if token_response.get("status") != "200":
        logger.error(f"Failed to get Pesapal token: {token_response}")
        return token_response

    token = token_response["token"]
    logger.info("✅ Pesapal token obtained successfully")

    # Get active payment configuration
    try:
        config = PaymentConfiguration.objects.get(
            gateway_name="Pesapal",
            is_active=True,
        )
        logger.info(f"✅ Active configuration found with IPN ID: {config.ipn_id}")
    except PaymentConfiguration.DoesNotExist:
        logger.error("❌ No active Payment Configuration found")
        return {
            "status": "400",
            "message": "No active Payment Configuration found."
        }

    # Build the request URL
    url = (
        f"{settings.PESAPAL_BASE_URL}"
        "/api/Transactions/SubmitOrderRequest"
    )
    logger.info(f"📡 Submitting order to: {url}")

    # ============================================================
    # GET CALLBACK URLs FROM SETTINGS (with fallbacks)
    # ============================================================
    
    # Try to get from settings, with fallback to hardcoded production URLs
    callback_url = getattr(
        settings, 
        'PESAPAL_CALLBACK_URL', 
        'https://hookiefy-server.onrender.com/payments/payment-success/'  # Updated with /payments/ prefix
    )
    
    cancellation_url = getattr(
        settings, 
        'PESAPAL_CANCELLATION_URL', 
        'https://hookiefy-server.onrender.com/payments/payment-failure/'  # Updated with /payments/ prefix
    )
    
    # Log the URLs being used
    logger.info(f"🔗 Callback URL: {callback_url}")
    logger.info(f"❌ Cancellation URL: {cancellation_url}")

    # Prepare the payload
    payload = {
        "id": payment.merchant_reference,
        "currency": "KES",
        "amount": float(payment.amount),
        "description": "Hookup payment",
        
        # Success and failure redirect URLs - Now using settings
        "callback_url": callback_url,
        "cancellation_url": cancellation_url,
        
        # IPN notification ID
        "notification_id": config.ipn_id,

        "billing_address": {
            "email_address": email,
            "phone_number": payment.phone_number,
            "country_code": "KE",
            "first_name": first_name or "",
            "middle_name": "",
            "last_name": last_name or "",
            "line_1": "",
            "line_2": "",
            "city": "",
            "state": "",
            "postal_code": "",
            "zip_code": "",
        },
    }

    logger.info(f"📤 Payload: {payload}")

    # Prepare headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    # Make the request to Pesapal
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,  # 30 second timeout
        )
        
        logger.info(f"📥 Response Status Code: {response.status_code}")
        
        # Try to parse the response
        try:
            response_data = response.json()
            logger.info(f"📥 Response Data: {response_data}")
        except ValueError:
            logger.error(f"❌ Failed to parse JSON response: {response.text}")
            return {
                "status": str(response.status_code),
                "message": "Invalid response from Pesapal",
                "raw_response": response.text
            }

        # Check if the request was successful
        if response.status_code == 200:
            # PesaPal returns order_tracking_id and redirect_url
            order_tracking_id = response_data.get("order_tracking_id")
            redirect_url = response_data.get("redirect_url")
            
            if order_tracking_id and redirect_url:
                logger.info(f"✅ Order submitted successfully")
                logger.info(f"🔑 Order Tracking ID: {order_tracking_id}")
                logger.info(f"🔀 Redirect URL: {redirect_url}")
                return response_data
            else:
                logger.error(f"❌ Missing order_tracking_id or redirect_url in response")
                return {
                    "status": "400",
                    "message": "Incomplete response from Pesapal",
                    "response": response_data
                }
        else:
            logger.error(f"❌ Pesapal returned error status: {response.status_code}")
            return {
                "status": str(response.status_code),
                "message": response_data.get("message", "Pesapal request failed"),
                "error": response_data
            }

    except requests.exceptions.Timeout:
        logger.error("❌ Request to Pesapal timed out")
        return {
            "status": "408",
            "message": "Request to Pesapal timed out"
        }
    
    except requests.exceptions.ConnectionError:
        logger.error("❌ Connection error to Pesapal")
        return {
            "status": "503",
            "message": "Could not connect to Pesapal"
        }
    
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Request error: {str(e)}")
        return {
            "status": "500",
            "message": f"Request error: {str(e)}"
        }
    
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return {
            "status": "500",
            "message": f"Unexpected error: {str(e)}"
        }


def submit_order_with_retry(
    payment,
    first_name,
    last_name,
    email,
    max_retries=3,
):
    """
    Submits an order to Pesapal with retry logic.
    
    Args:
        payment: Payment object
        first_name: User's first name
        last_name: User's last name
        email: User's email address
        max_retries: Maximum number of retry attempts
    
    Returns:
        dict: Response from Pesapal
    """
    
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        try:
            result = submit_order(
                payment,
                first_name,
                last_name,
                email,
            )
            
            # If successful, return immediately
            if result.get("status") == "200":
                return result
            
            # If it's a client error (4xx), don't retry
            status = result.get("status", "")
            if status.startswith("4"):
                return result
            
            # Otherwise, retry
            retry_count += 1
            logger.warning(f"Retry {retry_count}/{max_retries} for order submission")
            
        except Exception as e:
            last_error = str(e)
            retry_count += 1
            logger.warning(f"Retry {retry_count}/{max_retries} due to error: {last_error}")
    
    # If we've exhausted all retries
    return {
        "status": "500",
        "message": f"Failed after {max_retries} retries. Last error: {last_error}"
    }