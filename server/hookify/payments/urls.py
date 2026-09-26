# payments/urls.py
from django.urls import path
from . import views


urlpatterns = [
    # ── Health & diagnostics ───────────────────────────
    path(
        "health/",
        views.database_health_check,
        name="database_health_check",
    ),
    path(
        "check-superadmin/",
        views.check_superadmin_status,
        name="check_superadmin_status",
    ),

    # ── Connection (hookup) payments ───────────────────
    path(
        "initiate/",
        views.initiate_payment,
        name="initiate_payment",
    ),

    # ── Service (contact-reveal) payments ──────────────
    path(
        "service/initiate/",
        views.initiate_service_payment,
        name="initiate_service_payment",
    ),

    # ── Pesapal callbacks ──────────────────────────────
    path("ipn/", views.ipn_callback, name="ipn_callback"),
    path(
        "register-ipn/",
        views.register_ipn,
        name="register_ipn",
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

    # ── Status ─────────────────────────────────────────
    # Legacy manual lookup
    path(
        "status/<int:payment_id>/",
        views.get_payment_status,
        name="get_payment_status",
    ),

    # NEW: reconcile / live poll (self-healing connection status)
    path(
        "reconcile/<int:payment_id>/",
        views.reconcile_payment,
        name="reconcile_payment",
    ),
]