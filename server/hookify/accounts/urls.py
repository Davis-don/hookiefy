# accounts/urls.py
from django.urls import path
from accounts.views.auth_views import (
    login_view,
    logout_view,
    check_auth,
    refresh_token_view,
)
from accounts.views.user_views import (
    fetch_user_profile,
    update_user_profile,
    update_password,
)
from accounts.views.superadmin_views import (
    adminSignup,
    fetch_all_admins,
    update_admin,
    toggle_admin_status,
    delete_admin,
    bulk_deactivate_admins,
    bulk_delete_admins,
)
from accounts.views.admin_views import (
    create_client,
    fetch_all_clients,
    fetch_client_details,
    update_client,
    delete_client,
    restore_client,
    transfer_client_management,
    bulk_deactivate_clients,
    bulk_delete_clients,
    get_client_history,
)

urlpatterns = [
    # ================== AUTH ==================
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("check-auth/", check_auth, name="check_auth"),
    path("refresh/", refresh_token_view, name="refresh_token"),

    # ================== USER ==================
    path("profile/", fetch_user_profile, name="fetch_user_profile"),
    path("profile/update/", update_user_profile, name="update_user_profile"),
    path("password/update/", update_password, name="update_password"),

    # ================== SUPERADMIN ==================
    path("admin/signup/", adminSignup, name="admin_signup"),
    path("admins/fetch/", fetch_all_admins, name="fetch_all_admins"),
    path("admin/<int:admin_id>/update/", update_admin, name="update_admin"),
    path("admin/<int:admin_id>/toggle-status/", toggle_admin_status, name="toggle_admin_status"),
    path("admin/<int:admin_id>/delete/", delete_admin, name="delete_admin"),
    path("admins/bulk/deactivate/", bulk_deactivate_admins, name="bulk_deactivate_admins"),
    path("admins/bulk/delete/", bulk_delete_admins, name="bulk_delete_admins"),

    # ================== ADMIN → CLIENT MANAGEMENT ==================
    path("client/create/", create_client, name="create_client"),
    path("clients/fetch/", fetch_all_clients, name="fetch_all_clients"),
    path("client/<int:client_id>/", fetch_client_details, name="fetch_client_details"),
    path("client/<int:client_id>/update/", update_client, name="update_client"),
    path("client/<int:client_id>/delete/", delete_client, name="delete_client"),
    path("client/<int:client_id>/restore/", restore_client, name="restore_client"),
    path("client/<int:client_id>/transfer/", transfer_client_management, name="transfer_client_management"),
    path("client/<int:client_id>/history/", get_client_history, name="get_client_history"),
    path("clients/bulk/deactivate/", bulk_deactivate_clients, name="bulk_deactivate_clients"),
    path("clients/bulk/delete/", bulk_delete_clients, name="bulk_delete_clients"),
]