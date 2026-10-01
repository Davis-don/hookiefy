import requests
from django.conf import settings


def submit_the_order(order_data):
    """
    Submit an order to Pesapal and get back a redirect_url.
    """
    from .fetch_pesapal_token import get_pesapal_token

    token_response = get_pesapal_token()
    if token_response.get("status") != "200":
        raise Exception("Failed to get Pesapal token")

    token = token_response.get("token")

    url = f"{settings.PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest"

    payload = {
        "id": order_data["merchant_reference"],      # your unique ref
        "currency": "KES",
        "amount": order_data["amount"],
        "description": order_data["description"],
        "callback_url": settings.PESAPAL_CALLBACK_URL,
        "cancellation_url": settings.PESAPAL_CANCELLATION_URL,
        "notification_id": order_data["notification_id"],  # from register_ipn_url()
        "billing_address": {
            "email_address": order_data["email"],
            "phone_number": order_data.get("phone", ""),
            "country_code": "KE",
            "first_name": order_data.get("first_name", ""),
            "last_name": order_data.get("last_name", ""),
        },
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()

    data = response.json()

    # Pesapal returns the payment page URL + tracking id
    return {
        "redirect_url": data.get("redirect_url"),
        "order_tracking_id": data.get("order_tracking_id"),
        "merchant_reference": data.get("merchant_reference"),
    }