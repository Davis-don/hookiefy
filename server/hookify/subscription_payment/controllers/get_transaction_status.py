# subscription_payment/controllers/get_transaction_status.py
import logging

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


def get_transaction_status(order_tracking_id):
    """
    Fetch the status of a PesaPal transaction.

    PesaPal's endpoint is a GET with the orderTrackingId as a
    query parameter:

        GET {PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus
            ?orderTrackingId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

    Returns a normalized dict:
      - status_code (int or None)
      - is_completed (bool)
      - normalized_status ("COMPLETED" / "FAILED" / ...)
      - raw (the original JSON)
    """

    from .fetch_pesapal_token import get_pesapal_token

    # --------------------------------------------------------
    # Token
    # --------------------------------------------------------
    token_response = get_pesapal_token()
    if token_response.get("status") != "200":
        raise Exception("Failed to get PesaPal token")

    token = token_response.get("token")
    if not token:
        raise Exception("PesaPal token missing in response.")

    # --------------------------------------------------------
    # Request
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

    params = {"orderTrackingId": order_tracking_id}

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=30,
    )

    try:
        response.raise_for_status()
    except requests.HTTPError as e:
        logger.error(
            "PesaPal GetTransactionStatus HTTP error | "
            "tracking=%s | status=%s | body=%s",
            order_tracking_id,
            response.status_code,
            response.text,
        )
        raise Exception(
            f"PesaPal GetTransactionStatus failed: {e}"
        )

    data = response.json()

    # --------------------------------------------------------
    # Normalize status_code to int (PesaPal sometimes
    # returns a string, sometimes an int)
    # --------------------------------------------------------
    raw_code = data.get("status_code")
    try:
        code_int = int(raw_code) if raw_code is not None else None
    except (TypeError, ValueError):
        code_int = None

    normalized = {
        0: "INVALID",
        1: "COMPLETED",
        2: "FAILED",
        3: "REVERSED",
    }.get(code_int, "UNKNOWN")

    data["status_code"] = code_int
    data["is_completed"] = code_int == 1
    data["normalized_status"] = normalized

    logger.info(
        "PesaPal status | tracking=%s | code=%s | %s",
        order_tracking_id,
        code_int,
        normalized,
    )

    return data