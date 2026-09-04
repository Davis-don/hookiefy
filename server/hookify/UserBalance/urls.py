# account/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Balance endpoints
    path('current-balance/', views.get_current_user_balance, name='get_current_user_balance'),
    
    # Superadmin balance (system admin from env)
    path('superadmin/', views.get_superadmin_balance, name='get_superadmin_balance'),
    
    # Get balance by email (admin only)
    path('balance/<str:email>/', views.get_user_balance_by_email, name='get_user_balance_by_email'),
    
    # Get all admin balances (superadmin only)
    path('balances/all/', views.get_all_admin_balances, name='get_all_admin_balances'),
]