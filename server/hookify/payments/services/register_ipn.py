import requests
from django.conf import settings

def register_ipn_url():
    """
    Register IPN URL with Pesapal
    Returns ipn_id to be used in payment requests
    """
    # First get the token
    from .get_pesapal_token import get_pesapal_token
    
    token_response = get_pesapal_token()
    if token_response.get("status") != "200":
        raise Exception("Failed to get Pesapal token")
    
    token = token_response.get("token")
    
    # Register IPN URL
    url = f"{settings.PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN"
    
    payload = {
        "url": "https://yourdomain.com/api/payments/ipn/",  # Your IPN endpoint
        "ipn_notification_type": "POST"  # or "GET"
    }
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.post(
        url,
        json=payload,
        headers=headers,
    )
    
    return response.json()