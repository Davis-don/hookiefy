import requests
from django.conf import settings


def get_transaction_status(order_tracking_id):
    """
    Get the status of a Pesapal transaction.

    The endpoint is a GET with the orderTrackingId as a query
    parameter:

        GET {PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus
            ?orderTrackingId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

    Returns the parsed JSON response.
    """
    from .fetch_pesapal_token import get_pesapal_token

    # --------------------------------------------------------
    # Get a fresh token
    # --------------------------------------------------------
    token_response = get_pesapal_token()
    if token_response.get("status") != "200":
        raise Exception("Failed to get Pesapal token")

    token = token_response.get("token")

    # --------------------------------------------------------
    # Build the request
    # --------------------------------------------------------
    url = (
        f"{settings.PESAPAL_BASE_URL}"
        f"/api/Transactions/GetTransactionStatus"
    )

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    params = {
        "orderTrackingId": order_tracking_id,
    }

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()

    # --------------------------------------------------------
    # Normalize the status into something predictable
    # --------------------------------------------------------
    status_code = data.get("status_code")

    status_map = {
        0: "INVALID",
        1: "COMPLETED",
        2: "FAILED",
        3: "REVERSED",
    }

    data["normalized_status"] = status_map.get(
        status_code,
        "UNKNOWN",
    )
    data["is_completed"] = status_code == 1

    return data