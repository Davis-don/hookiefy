# subscription_payment/controllers/register_ipn_url.py

import logging
import requests

from django.conf import settings


logger = logging.getLogger(__name__)


def register_ipn_url():
    """
    Register the IPN URL with PesaPal.
    Returns the full PesaPal JSON response, which contains
    `ipn_id` on success.
    """

    from .fetch_pesapal_token import get_pesapal_token

    token_response = get_pesapal_token()

    logger.info("PesaPal token response: %s", token_response)

    # PesaPal returns {"token": "...", "status": "200", ...} on
    # success, and a very different shape on failure.
    status = str(token_response.get("status", "")).strip()
    if status != "200":
        raise Exception(
            "Failed to get PesaPal token. "
            f"Response: {token_response}"
        )

    token = token_response.get("token")
    if not token:
        raise Exception(
            "PesaPal token missing in response. "
            f"Response: {token_response}"
        )

    url = f"{settings.PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN"

    payload = {
        "url": settings.PESAPAL_IPN_URL,
        "ipn_notification_type": "POST",
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=30,
    )

    logger.info(
        "PesaPal RegisterIPN | status=%s | body=%s",
        response.status_code,
        response.text,
    )

    response.raise_for_status()

    return response.json()