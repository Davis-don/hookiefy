# subscription_payment/urls.py
from django.urls import path
from . import views

app_name = "subscription_payment"

urlpatterns = [
    # Initiate plan payment
    path(
        "plan/initiate/",
        views.initiate_plan_payment,
        name="initiate_plan_payment",
    ),

    # Live status poll
    path(
        "reconcile/<int:payment_id>/",
        views.reconcile_subscription_payment,
        name="reconcile_subscription_payment",
    ),

    # Single lookup
    path(
        "status/<int:payment_id>/",
        views.get_subscription_payment_status,
        name="get_subscription_payment_status",
    ),

    # Pesapal callbacks
    path(
        "ipn/",
        views.ipn_callback,
        name="ipn_callback",
    ),
    path(
        "payment-success/",
        views.payment_success,
        name="payment_success",
    ),
    path(
        "payment-failure/",
        views.payment_failure,
        name="payment_failure",
    ),

    # IPN registration (same service as payments app)
    path(
        "register-ipn/",
        views.register_ipn,
        name="register_ipn",
    ),
]