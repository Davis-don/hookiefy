# paystack/urls.py
# ============================================================
# Paystack URLs
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Configuration status
    path('config-status/', views.paystack_config_status, name='paystack_config_status'),
    
    # Initiate payment
    path('initiate/', views.initiate_paystack_payment, name='initiate_paystack_payment'),
    
    # Webhook (no authentication required)
    path('webhook/', views.paystack_webhook, name='paystack_webhook'),
    
    # Redirect URLs (no authentication required)
    path('success/', views.paystack_success, name='paystack_success'),
    path('failure/', views.paystack_failure, name='paystack_failure'),
    
    # Verify payment (authenticated)
    path('verify/<str:reference>/', views.verify_paystack_payment, name='verify_paystack_payment'),
    
    # Get transactions (authenticated)
    path('transactions/', views.get_paystack_transactions, name='get_paystack_transactions'),
]