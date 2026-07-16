import requests
from django.conf import settings

from .get_pesapal_token import get_pesapal_token


def get_transaction_status(order_tracking_id):
    """
    Verify a transaction directly with Pesapal.
    """

    token_response = get_pesapal_token()

    if token_response.get("status") != "200":
        return token_response

    token = token_response["token"]

    url = (
        f"{settings.PESAPAL_BASE_URL}"
        f"/api/Transactions/GetTransactionStatus"
        f"?orderTrackingId={order_tracking_id}"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    response = requests.get(
        url,
        headers=headers,
    )

    return response.json()