# subscription_payment/controllers/fetch_pesapal_token.py

import logging

import requests

from django.conf import settings


logger = logging.getLogger(__name__)


def get_pesapal_token():
    """
    Request a bearer token from PesaPal.

    Returns the parsed JSON dict on success. On failure the
    dict contains `status_code` and `response_text` so callers
    can surface the actual problem.
    """

    url = f"{settings.PESAPAL_BASE_URL}/api/Auth/RequestToken"

    logger.info("Requesting PesaPal token from %s", url)

    payload = {
        "consumer_key": settings.PESAPAL_CONSUMER_KEY,
        "consumer_secret": settings.PESAPAL_CONSUMER_SECRET,
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )
    except requests.RequestException as e:
        logger.error("PesaPal token request failed: %s", e)
        return {
            "status_code": None,
            "response_text": str(e),
        }

    logger.info(
        "PesaPal token HTTP status=%s | body=%s",
        response.status_code,
        response.text,
    )

    try:
        data = response.json()
    except Exception:
        logger.error(
            "PesaPal token response was not JSON: %s",
            response.text,
        )
        return {
            "status_code": response.status_code,
            "response_text": response.text,
        }

    return data