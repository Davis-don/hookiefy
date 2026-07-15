from django.urls import path
from . import views

urlpatterns = [
    # Fetch hookup fee for regular users
    path('hookup-fee/', views.get_hookup_fee_view, name='get_hookup_fee'),
    
    # Fetch hookup fee for admin/superadmin (own fee)
    path('admin-hookup-fee/', views.get_admin_hookup_fee_view, name='get_admin_hookup_fee'),
    
    # Update hookup fee for a specific user (for admins/superadmins)
    path('hookup-fee/update/<int:user_id>/', views.update_hookup_fee_view, name='update_hookup_fee_for_user'),
    
    # Update the admin's own hookup fee (for admins/superadmins)
    path('hookup-fee/update/', views.update_hookup_fee_view, name='update_hookup_fee'),
]