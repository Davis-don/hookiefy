import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def get_pesapal_token():
    url = f"{settings.PESAPAL_BASE_URL}/api/Auth/RequestToken"
    
    # Debug: Print the actual URL
    print(f"🔍 Full URL being called: {url}")
    logger.info(f"Calling Pesapal URL: {url}")

    payload = {
        "consumer_key": settings.PESAPAL_CONSUMER_KEY,
        "consumer_secret": settings.PESAPAL_CONSUMER_SECRET,
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
    )

    print(f"📡 Response Status: {response.status_code}")
    print(f"📄 Response Text: {response.text[:200]}")  # First 200 chars

    try:
        return response.json()
    except:
        return {
            "status_code": response.status_code,
            "response_text": response.text
        }