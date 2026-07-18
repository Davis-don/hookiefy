from django.urls import path
from . import views

urlpatterns = [
    # Current user balance endpoint
    path('current-balance/', views.get_current_user_balance, name='get_current_user_balance'),
    
    # Admin dashboard statistics endpoint
    path('admin-dashboard-stats/', views.get_admin_dashboard_stats, name='get_admin_dashboard_stats'),
]