# product_payment/controllers/get_registered_ipns.py

import logging

import requests

from django.conf import settings


logger = logging.getLogger(__name__)


def get_registered_ipns(token):
    """
    Fetch all registered IPNs from PesaPal.

    Used to confirm which IPN URLs are registered on the
    account — typically when checking that the endpoint you
    intend to receive product-payment notifications on is
    actually active. Returns the parsed JSON body of the
    PesaPal response, or raises on network / non-JSON errors.
    """

    url = (
        f"{settings.PESAPAL_BASE_URL}"
        "/api/URLSetup/GetIpnList"
    )

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    logger.info(
        "Fetching registered PesaPal IPNs from: %s",
        url,
    )

    response = requests.get(
        url,
        headers=headers,
        timeout=30,
    )

    logger.info(
        "PesaPal IPN response status: %s",
        response.status_code,
    )

    logger.info(
        "PesaPal IPN response body: %s",
        response.text,
    )

    response.raise_for_status()

    try:
        return response.json()

    except requests.exceptions.JSONDecodeError:
        logger.error(
            "PesaPal returned a non-JSON response: %s",
            response.text,
        )

        raise Exception(
            f"PesaPal returned an invalid response. "
            f"Status: {response.status_code}, "
            f"Response: {response.text[:500]}"
        )