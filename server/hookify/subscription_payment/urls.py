# subscription_payment/urls.py

from django.urls import path

from . import views


urlpatterns = [
    path(
        "initiate/",
        views.initiate_payment,
        name="initiate-payment",
    ),
    path(
        "<str:merchant_reference>/status/",
        views.payment_status,
        name="payment-status",
    ),
    path(
        "<str:merchant_reference>/sync/",
        views.sync_payment,
        name="sync-payment",
    ),
    path(
        "payment-success/",
        views.payment_success_callback,
        name="payment-success",
    ),
    path(
        "ipn/",
        views.payment_ipn,
        name="payment-ipn",
    ),
]