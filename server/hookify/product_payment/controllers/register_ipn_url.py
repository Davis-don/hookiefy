# product_payment/controllers/register_ipn_url.py

import logging

import requests

from django.conf import settings


logger = logging.getLogger(__name__)


def register_ipn_url():
    """
    Register the (shared) IPN URL with PesaPal.

    Product payments and subscription payments share a single
    IPN endpoint — the URL stored in `settings.PESAPAL_IPN_URL`
    — and therefore a single `ipn_id` on the
    PaymentConfiguration row.

    Consequences:

      • You only need to run this ONCE per environment. If the
        URL is already registered, PesaPal returns the same
        `ipn_id` back (the endpoint is idempotent per URL), so
        calling it again is harmless but pointless.

      • The `ipn_id` returned here is stored on
        PaymentConfiguration.ipn_id and used by BOTH the
        subscription-payment and product-payment flows when
        building their SubmitOrderRequest payloads.

      • The receiving endpoint must dispatch on the
        merchant_reference prefix:

            SUB-…   → subscription payment
            PROD-…  → product payment

        Because otherwise the shared handler has no way to
        tell which table to sync. See
        `product_payment/views.py::payment_ipn` — or, if you
        keep the IPN handler in `subscription_payment`, extend
        that one.

    This function exists mainly so the product-payment vertical
    has a self-contained way to (re-)register the IPN if it
    ever gets unregistered by accident, without importing from
    the subscription side.

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

    ipn_url = getattr(settings, "PESAPAL_IPN_URL", None)
    if not ipn_url:
        raise Exception(
            "PESAPAL_IPN_URL is not set in Django settings. "
            "Product payments and subscription payments share "
            "this URL — set it before registering."
        )

    url = f"{settings.PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN"

    payload = {
        "url": ipn_url,
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