import requests
from django.conf import settings


def register_ipn(token):
    url = f"{settings.PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN"

    payload = {
        "url": settings.PESAPAL_CALLBACK_URL,
        "ipn_notification_type": "POST"
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    response = requests.post(url, json=payload, headers=headers)

    print("IPN REGISTER STATUS:", response.status_code)
    print("IPN REGISTER RAW:", response.text)

    try:
        data = response.json()
    except Exception as e:
        print("IPN JSON ERROR:", e)
        return None

    return data


def get_token():
    url = f"{settings.PESAPAL_BASE_URL}/api/Auth/RequestToken"

    payload = {
        "consumer_key": settings.PESAPAL_CONSUMER_KEY,
        "consumer_secret": settings.PESAPAL_CONSUMER_SECRET
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    print("TOKEN STATUS:", response.status_code)
    print("TOKEN RAW:", response.text)

    try:
        data = response.json()
    except Exception as e:
        print("JSON ERROR:", e)
        return None

    return data.get("token")


def get_ipn_list(token):
    url = f"{settings.PESAPAL_BASE_URL}/api/URLSetup/GetIpnList"

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(url, headers=headers)

    print("IPN STATUS:", response.status_code)
    print("IPN RAW:", response.text)

    try:
        return response.json()
    except:
        return None