# payments/pesapal.py - Updated for production
import requests
import uuid
import logging
from django.conf import settings
from requests.exceptions import Timeout, ConnectionError, RequestException

logger = logging.getLogger(__name__)


def get_token():
    """Get Pesapal token with proper error handling"""
    try:
        # For production: https://pay.pesapal.com/v3/api/Auth/RequestToken
        url = f"{settings.PESAPAL_BASE_URL}/v3/api/Auth/RequestToken"
        
        payload = {
            "consumer_key": settings.PESAPAL_CONSUMER_KEY,
            "consumer_secret": settings.PESAPAL_CONSUMER_SECRET
        }
        
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        
        logger.info(f"Requesting token from: {url}")
        logger.info(f"Using consumer key: {settings.PESAPAL_CONSUMER_KEY[:10]}...")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        logger.info(f"Token response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Token error response: {response.text}")
            return None
            
        data = response.json()
        token = data.get("token")
        
        if not token:
            logger.error(f"No token in response: {data}")
            return None
            
        logger.info("Token obtained successfully")
        return token
        
    except Timeout:
        logger.error("Token request timeout")
        return None
    except ConnectionError:
        logger.error("Connection error to Pesapal")
        return None
    except Exception as e:
        logger.error(f"Unexpected error getting token: {str(e)}")
        return None


def register_ipn(token):
    """Register IPN URL with Pesapal"""
    try:
        url = f"{settings.PESAPAL_BASE_URL}/v3/api/URLSetup/RegisterIPN"
        
        payload = {
            "url": settings.PESAPAL_CALLBACK_URL,
            "ipn_notification_type": "POST"
        }
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Registering IPN at: {url}")
        logger.info(f"IPN URL: {settings.PESAPAL_CALLBACK_URL}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        logger.info(f"IPN registration response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"IPN registration failed: {response.text}")
            return {"error": f"HTTP {response.status_code}: {response.text}"}
            
        data = response.json()
        logger.info(f"IPN registration response: {data}")
        
        # Handle different response formats from Pesapal
        ipn_id = data.get("ipn_id") or data.get("Id") or data.get("ipnId")
        
        if not ipn_id:
            logger.error(f"No IPN ID in response: {data}")
            return {"error": "No IPN ID returned from Pesapal"}
            
        logger.info(f"IPN registered successfully with ID: {ipn_id}")
        
        return {"ipn_id": ipn_id}
        
    except Exception as e:
        logger.error(f"Error registering IPN: {str(e)}", exc_info=True)
        return {"error": str(e)}


def submit_order_request(token, ipn_id, amount, email, phone, first_name="User", use_direct_url=True):
    """Submit order request to Pesapal"""
    try:
        url = f"{settings.PESAPAL_BASE_URL}/v3/api/Transactions/SubmitOrderRequest"
        
        merchant_ref = str(uuid.uuid4())
        
        # Ensure amount is properly formatted
        amount_str = f"{float(amount):.2f}"
        
        payload = {
            "id": merchant_ref,
            "currency": "KES",
            "amount": amount_str,
            "description": "Hookup Payment",
            "callback_url": settings.PESAPAL_CALLBACK_URL,
            "notification_id": ipn_id,
            "billing_address": {
                "email_address": email,
                "phone_number": phone,
                "first_name": first_name,
                "last_name": "Customer",
                "line_1": "N/A",
                "city": "Nairobi",
                "state": "Nairobi",
                "postal_code": "00100",
                "country_code": "KE"
            }
        }
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Submitting order request to: {url}")
        logger.info(f"Amount: {amount_str}, IPN ID: {ipn_id}")
        logger.info(f"Merchant reference: {merchant_ref}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        logger.info(f"Order response status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"Order submission HTTP error: {response.text}")
            return {"error": f"HTTP {response.status_code}: {response.text}"}, merchant_ref
            
        data = response.json()
        logger.info(f"Order response data: {data}")
        
        # Check for successful response (has redirect_url)
        if data.get("redirect_url"):
            # For production, the redirect_url should be a direct payment page
            # No conversion needed - use as is
            logger.info(f"Order submitted successfully. Tracking ID: {data.get('order_tracking_id')}")
            logger.info(f"Payment URL: {data.get('redirect_url')}")
            
            # Test if the URL is accessible (don't follow redirects)
            test_response = requests.head(data.get('redirect_url'), timeout=10)
            logger.info(f"Payment URL status check: {test_response.status_code}")
            
            return data, merchant_ref
        else:
            # Log the error but still return the data for debugging
            error_msg = data.get("error", "Missing redirect_url in response")
            logger.error(f"Order submission failed: {error_msg}")
            logger.error(f"Full response: {data}")
            return {"error": error_msg, "full_response": data}, merchant_ref
        
    except Timeout:
        logger.error("Order submission timeout")
        return {"error": "Request timeout"}, None
    except ConnectionError:
        logger.error("Connection error during order submission")
        return {"error": "Connection error"}, None
    except Exception as e:
        logger.error(f"Error submitting order: {str(e)}", exc_info=True)
        return {"error": str(e)}, None


def query_payment_status(token, order_tracking_id):
    """Query payment status from Pesapal"""
    try:
        url = f"{settings.PESAPAL_BASE_URL}/v3/api/Transactions/GetTransactionStatus"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        params = {
            "orderTrackingId": order_tracking_id
        }
        
        logger.info(f"Querying payment status for: {order_tracking_id}")
        
        response = requests.get(url, headers=headers, params=params, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"Status query failed: {response.text}")
            return None
            
        data = response.json()
        logger.info(f"Payment status response: {data}")
        
        return data
        
    except Exception as e:
        logger.error(f"Error querying payment status: {str(e)}")
        return None