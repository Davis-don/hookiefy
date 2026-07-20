# payments/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ============================================================
    # PAYMENT ENDPOINTS
    # ============================================================
    
    # Initiate a new payment
    path(
        "initiate-payment/",
        views.initiate_payment,
        name="initiate_payment",
    ),
    
    # PesaPal IPN (Instant Payment Notification) callback
    path(
        "ipn/",
        views.ipn_callback,
        name="ipn_callback",
    ),
    
    # Register IPN URL with PesaPal
    path(
        "register-ipn/",
        views.register_ipn,
        name="register_ipn",
    ),
    
    # Payment success redirect (called by PesaPal after successful payment)
    path(
        "payment-success/",
        views.payment_success,
        name="payment_success",
    ),
    
    # Payment failure redirect (called by PesaPal after failed payment)
    path(
        "payment-failure/",
        views.payment_failure,
        name="payment_failure",
    ),
    
    # Get payment status by payment ID
    path(
        "payment-status/<str:payment_id>/",
        views.get_payment_status,
        name="payment_status",
    ),
    
    # ============================================================
    # SYSTEM HEALTH ENDPOINTS
    # ============================================================
    
    # Database health check (for monitoring and debugging)
    path(
        "db-health/",
        views.database_health_check,
        name="db_health",
    ),
]