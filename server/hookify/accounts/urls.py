from django.urls import path
from .views import (
    adminSignup,
    login_view,
    check_auth,
    refresh_token_view,
    logout_view,
    fetch_user_profile,
    update_user_profile,
    update_password,
    fetch_all_admins,
    update_admin,
    toggle_admin_status,
    delete_admin,
    bulk_deactivate_admins,
    bulk_delete_admins,
)

urlpatterns = [
    # Auth endpoints
    path('admin/signup/', adminSignup, name='signup'),
    path('login/', login_view, name='login'),
    path('check-auth/', check_auth, name='check-auth'),
    path('refresh-token/', refresh_token_view, name='refresh-token'),
    path('logout/', logout_view, name='logout'),

    # Profile endpoints
    path('profile/', fetch_user_profile, name='fetch-profile'),
    path('profile/update/', update_user_profile, name='update-profile'),
    path('password/update/', update_password, name='update-password'),

    # Admin management endpoints (SuperAdmin only)
    path('admins/fetch/', fetch_all_admins, name='fetch-all-admins'),
    path('admin/<int:admin_id>/update/', update_admin, name='update-admin'),
    path('admin/<int:admin_id>/toggle-status/', toggle_admin_status, name='toggle-admin-status'),
    path('admin/<int:admin_id>/delete/', delete_admin, name='delete-admin'),
    path('admins/bulk/deactivate/', bulk_deactivate_admins, name='bulk-deactivate-admins'),
    path('admins/bulk/delete/', bulk_delete_admins, name='bulk-delete-admins'),
]