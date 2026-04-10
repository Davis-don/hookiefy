import requests
from django.conf import settings


def get_token():
    url = "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken"

    payload = {
        "consumer_key": settings.PESAPAL_CONSUMER_KEY,
        "consumer_secret": settings.PESAPAL_CONSUMER_SECRET
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    # 🔥 PRINT REAL RESPONSE (VERY IMPORTANT)
    print("STATUS CODE:", response.status_code)
    print("RAW RESPONSE:", response.text)

    try:
        data = response.json()
    except Exception as e:
        print("JSON ERROR:", e)
        return None

    return data.get("token")