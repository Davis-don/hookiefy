import logging
import requests

from django.conf import settings

from .get_pesapal_token import get_pesapal_token
from paymentconfigurations.models import PaymentConfiguration


logger = logging.getLogger(__name__)


def get_pesapal_configuration():
    """
    Get the active Pesapal payment configuration.

    Uses case-insensitive matching so values such as:
    Pesapal, PesaPal, PESAPAL, pesapal
    are treated as the same gateway.
    """

    try:
        config = (
            PaymentConfiguration.objects
            .filter(
                gateway_name__iexact="Pesapal",
                is_active=True,
            )
            .first()
        )

        if config:
            logger.info(
                f"✅ Active Pesapal configuration found. "
                f"IPN ID: {config.ipn_id}"
            )
            return config

        logger.error(
            "❌ No active Pesapal Payment Configuration found."
        )

        return None

    except Exception as e:
        logger.exception(
            f"❌ Error while loading Pesapal configuration: {str(e)}"
        )
        return None


def submit_order(
    payment,
    first_name,
    last_name,
    email,
):
    """
    Creates a payment order on Pesapal.

    Args:
        payment: Payment object containing:
            - amount
            - merchant_reference
            - phone_number

        first_name: Customer first name
        last_name: Customer last name
        email: Customer email

    Returns:
        dict: Pesapal response
    """

    logger.info("=" * 60)
    logger.info("SUBMITTING ORDER TO PESAPAL")
    logger.info(f"Merchant Reference: {payment.merchant_reference}")
    logger.info(f"Amount: {payment.amount}")
    logger.info(f"Phone: {payment.phone_number}")
    logger.info("=" * 60)

    # ============================================================
    # STEP 1: GET PESAPAL TOKEN
    # ============================================================

    try:
        token_response = get_pesapal_token()

    except Exception as e:
        logger.exception(
            f"❌ Exception while getting Pesapal token: {str(e)}"
        )

        return {
            "status": "500",
            "message": f"Failed to get Pesapal token: {str(e)}",
        }

    if not token_response:
        logger.error(
            "❌ Empty response received while getting Pesapal token."
        )

        return {
            "status": "500",
            "message": "Empty response while getting Pesapal token.",
        }

    if token_response.get("status") != "200":
        logger.error(
            f"❌ Failed to get Pesapal token: {token_response}"
        )

        return token_response

    token = token_response.get("token")

    if not token:
        logger.error(
            "❌ Pesapal token was not returned."
        )

        return {
            "status": "500",
            "message": "Pesapal authentication token was not returned.",
        }

    logger.info(
        "✅ Pesapal token obtained successfully"
    )

    # ============================================================
    # STEP 2: GET ACTIVE PESAPAL CONFIGURATION
    # ============================================================

    config = get_pesapal_configuration()

    if not config:
        return {
            "status": "400",
            "message": (
                "No active Pesapal Payment Configuration found. "
                "Please configure Pesapal in Django admin."
            ),
        }

    # ============================================================
    # STEP 3: CHECK IPN ID
    # ============================================================

    if not config.ipn_id:
        logger.error(
            "❌ Pesapal configuration does not have an IPN ID."
        )

        return {
            "status": "400",
            "message": (
                "Pesapal IPN ID is missing. "
                "Register the Pesapal IPN before initiating payments."
            ),
        }

    logger.info(
        f"✅ Pesapal IPN ID available: {config.ipn_id}"
    )

    # ============================================================
    # STEP 4: GET PESAPAL BASE URL
    # ============================================================

    base_url = getattr(
        settings,
        "PESAPAL_BASE_URL",
        None,
    )

    if not base_url:
        logger.error(
            "❌ PESAPAL_BASE_URL is not configured."
        )

        return {
            "status": "500",
            "message": "PESAPAL_BASE_URL is not configured.",
        }

    base_url = base_url.rstrip("/")

    url = (
        f"{base_url}"
        "/api/Transactions/SubmitOrderRequest"
    )

    logger.info(
        f"📡 Submitting order to: {url}"
    )

    # ============================================================
    # STEP 5: CALLBACK URLS
    # ============================================================

    callback_url = getattr(
        settings,
        "PESAPAL_CALLBACK_URL",
        "https://hookiefy-server.onrender.com/payments/payment-success/",
    )

    cancellation_url = getattr(
        settings,
        "PESAPAL_CANCELLATION_URL",
        "https://hookiefy-server.onrender.com/payments/payment-failure/",
    )

    logger.info(
        f"🔗 Callback URL: {callback_url}"
    )

    logger.info(
        f"❌ Cancellation URL: {cancellation_url}"
    )

    # ============================================================
    # STEP 6: VALIDATE PHONE NUMBER
    # ============================================================

    phone_number = getattr(
        payment,
        "phone_number",
        None,
    )

    if not phone_number:
        logger.error(
            "❌ Payment does not contain a phone number."
        )

        return {
            "status": "400",
            "message": "Customer phone number is required.",
        }

    # ============================================================
    # STEP 7: NORMALIZE CUSTOMER DATA
    # ============================================================

    first_name = first_name or ""
    last_name = last_name or ""
    email = email or ""

    # ============================================================
    # STEP 8: BUILD PESAPAL PAYLOAD
    # ============================================================

    payload = {
        "id": payment.merchant_reference,

        "currency": "KES",

        "amount": float(payment.amount),

        "description": "Hookup payment",

        "callback_url": callback_url,

        "cancellation_url": cancellation_url,

        "notification_id": config.ipn_id,

        "billing_address": {
            "email_address": email,

            "phone_number": phone_number,

            "country_code": "KE",

            "first_name": first_name,

            "middle_name": "",

            "last_name": last_name,

            "line_1": "",

            "line_2": "",

            "city": "",

            "state": "",

            "postal_code": "",

            "zip_code": "",
        },
    }

    logger.info(
        f"📤 Pesapal payload: {payload}"
    )

    # ============================================================
    # STEP 9: REQUEST HEADERS
    # ============================================================

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    # ============================================================
    # STEP 10: SEND REQUEST
    # ============================================================

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=30,
        )

        logger.info(
            f"📥 Pesapal response status: {response.status_code}"
        )

        # ========================================================
        # STEP 11: PARSE RESPONSE
        # ========================================================

        try:
            response_data = response.json()

            logger.info(
                f"📥 Pesapal response data: {response_data}"
            )

        except ValueError:
            logger.error(
                "❌ Pesapal returned a non-JSON response."
            )

            logger.error(
                f"Raw response: {response.text}"
            )

            return {
                "status": str(response.status_code),
                "message": "Invalid response received from Pesapal.",
                "raw_response": response.text,
            }

        # ========================================================
        # STEP 12: SUCCESS
        # ========================================================

        if response.status_code == 200:

            order_tracking_id = response_data.get(
                "order_tracking_id"
            )

            redirect_url = response_data.get(
                "redirect_url"
            )

            if not order_tracking_id:
                logger.error(
                    "❌ Pesapal response missing order_tracking_id."
                )

                return {
                    "status": "400",
                    "message": (
                        "Pesapal did not return an "
                        "order_tracking_id."
                    ),
                    "response": response_data,
                }

            if not redirect_url:
                logger.error(
                    "❌ Pesapal response missing redirect_url."
                )

                return {
                    "status": "400",
                    "message": (
                        "Pesapal did not return a redirect URL."
                    ),
                    "response": response_data,
                }

            logger.info(
                "✅ Pesapal order submitted successfully."
            )

            logger.info(
                f"🔑 Order Tracking ID: {order_tracking_id}"
            )

            logger.info(
                f"🔀 Redirect URL: {redirect_url}"
            )

            return response_data

        # ========================================================
        # STEP 13: PESAPAL ERROR
        # ========================================================

        logger.error(
            f"❌ Pesapal returned HTTP {response.status_code}"
        )

        logger.error(
            f"Pesapal error response: {response_data}"
        )

        return {
            "status": str(response.status_code),

            "message": response_data.get(
                "message",
                "Pesapal request failed.",
            ),

            "error": response_data,
        }

    # ============================================================
    # STEP 14: TIMEOUT
    # ============================================================

    except requests.exceptions.Timeout:

        logger.error(
            "❌ Request to Pesapal timed out."
        )

        return {
            "status": "408",
            "message": "Request to Pesapal timed out.",
        }

    # ============================================================
    # STEP 15: CONNECTION ERROR
    # ============================================================

    except requests.exceptions.ConnectionError:

        logger.error(
            "❌ Could not connect to Pesapal."
        )

        return {
            "status": "503",
            "message": "Could not connect to Pesapal.",
        }

    # ============================================================
    # STEP 16: REQUEST ERROR
    # ============================================================

    except requests.exceptions.RequestException as e:

        logger.exception(
            f"❌ Pesapal request error: {str(e)}"
        )

        return {
            "status": "500",
            "message": f"Pesapal request error: {str(e)}",
        }

    # ============================================================
    # STEP 17: UNEXPECTED ERROR
    # ============================================================

    except Exception as e:

        logger.exception(
            f"❌ Unexpected Pesapal error: {str(e)}"
        )

        return {
            "status": "500",
            "message": f"Unexpected Pesapal error: {str(e)}",
        }


# ============================================================
# SUBMIT ORDER WITH RETRY
# ============================================================

def submit_order_with_retry(
    payment,
    first_name,
    last_name,
    email,
    max_retries=3,
):
    """
    Submit a Pesapal order with retry logic.

    4xx errors are returned immediately.
    Other errors are retried.
    """

    if max_retries < 1:
        max_retries = 1

    retry_count = 0
    last_error = None

    while retry_count < max_retries:

        retry_count += 1

        logger.info(
            f"🔄 Pesapal order attempt "
            f"{retry_count}/{max_retries}"
        )

        try:

            result = submit_order(
                payment=payment,
                first_name=first_name,
                last_name=last_name,
                email=email,
            )

            if not result:

                last_error = (
                    "Empty response from submit_order."
                )

                logger.warning(
                    f"⚠️ {last_error}"
                )

            else:

                status = str(
                    result.get("status", "")
                )

                # ==================================================
                # SUCCESS
                # ==================================================

                if status == "200":

                    logger.info(
                        "✅ Pesapal order submission successful."
                    )

                    return result

                # ==================================================
                # CLIENT ERROR - DO NOT RETRY
                # ==================================================

                if status.startswith("4"):

                    logger.error(
                        "❌ Pesapal returned a client/configuration "
                        f"error: {result}"
                    )

                    return result

                # ==================================================
                # SERVER/OTHER ERROR - RETRY
                # ==================================================

                last_error = result.get(
                    "message",
                    "Pesapal order submission failed.",
                )

                logger.warning(
                    f"⚠️ Pesapal attempt failed: {result}"
                )

        except Exception as e:

            last_error = str(e)

            logger.exception(
                f"❌ Exception during Pesapal attempt "
                f"{retry_count}: {last_error}"
            )

        # ========================================================
        # RETRY
        # ========================================================

        if retry_count < max_retries:

            logger.warning(
                f"⏳ Retrying Pesapal order submission "
                f"({retry_count}/{max_retries})..."
            )

    # ============================================================
    # ALL RETRIES FAILED
    # ============================================================

    logger.error(
        f"❌ Pesapal order failed after "
        f"{max_retries} attempt(s)."
    )

    return {
        "status": "500",

        "message": (
            f"Failed after {max_retries} Pesapal "
            f"order submission attempt(s)."
        ),

        "error": last_error,
    }