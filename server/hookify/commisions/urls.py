# commissions/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Get all commissions (superadmin only)
    path('get-all-commissions/', views.get_all_commissions, name='get-all-commissions'),
    
    # Get commission by admin ID
    path('get-commission/<int:admin_id>/', views.get_commission_by_admin_id, name='get-commission-by-admin'),
    
    # Update commission for specific admin (superadmin only)
    path('update-commission/<int:admin_id>/', views.update_commission, name='update-commission'),
    
    # Get my own commission (for authenticated admin/superadmin)
    path('my-commission/', views.get_my_commission, name='get-my-commission'),
    
    # Get commission summary (superadmin only)
    path('commission-summary/', views.get_commission_summary, name='commission-summary'),
    
    # Bulk update commissions (superadmin only)
    path('bulk-update-commissions/', views.bulk_update_commissions, name='bulk-update-commissions'),
]