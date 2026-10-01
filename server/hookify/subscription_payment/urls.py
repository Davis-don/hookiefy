# subscription_payment/urls.py
from django.urls import path

from .views import (
    create_subscription_payment,
    subscription_payment_status,
    pesapal_ipn,
    pesapal_callback,
)


urlpatterns = [
    path(
        "initialize/",
        create_subscription_payment,
        name="create-subscription-payment",
    ),
    path(
        "status/<str:merchant_reference>/",
        subscription_payment_status,
        name="subscription-payment-status",
    ),
    path(
        "ipn/",
        pesapal_ipn,
        name="pesapal-ipn",
    ),
    path(
        "payment-success/",
        pesapal_callback,
        name="pesapal-callback",
    ),
]