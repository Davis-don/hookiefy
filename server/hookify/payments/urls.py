from django.urls import path
from . import views

urlpatterns = [
    path(
        "initiate-payment/",
        views.initiate_payment,
        name="initiate_payment",
    ),
    path(
        "ipn/",
        views.ipn_callback,
        name="ipn_callback",
    ),
    path(
        "register-ipn/",
        views.register_ipn,
        name="register_ipn",
    ),
    # Add this new endpoint for payment success redirect
    path(
        "payment-success/",
        views.payment_success,
        name="payment_success",
    ),
    # Optional: Add a payment failure endpoint
    path(
        "payment-failure/",
        views.payment_failure,
        name="payment_failure",
    ),
]