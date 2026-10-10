# subscription_payment/urls.py

from django.urls import path

from . import views


urlpatterns = [
    # ── Start a payment ───────────────────────────────────
    path(
        "initiate/",
        views.initiate_payment,
        name="initiate-payment",
    ),

    # ── Read a payment's status ───────────────────────────
    path(
        "<str:merchant_reference>/status/",
        views.payment_status,
        name="payment-status",
    ),

    # ── Gateway browser callback ──────────────────────────
    path(
        "payment-success/",
        views.payment_success_callback,
        name="payment-success",
    ),

    # ── Gateway server-to-server IPN ──────────────────────
    path(
        "ipn/",
        views.payment_ipn,
        name="payment-ipn",
    ),
    path(
    "<str:merchant_reference>/sync/",
    views.sync_payment,
    name="sync-payment",
),
]