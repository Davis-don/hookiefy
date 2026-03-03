# accounts/urls.py

from django.urls import path
from .views import (
    # AUTH
    login_view,
    logout_view,
    check_auth,
    refresh_token_view,

    # USER
    fetch_user_profile,
    update_user_profile,
    update_password,

    # SUPERADMIN
    adminSignup,
    fetch_all_admins,
    update_admin,
    toggle_admin_status,
    delete_admin,

    # Bulk actions
    bulk_deactivate_admins,
    bulk_delete_admins,
)

urlpatterns = [

    # ---------------------------
    # AUTH
    # ---------------------------
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("check-auth/", check_auth, name="check_auth"),
    path("refresh/", refresh_token_view, name="refresh_token"),

    # ---------------------------
    # USER
    # ---------------------------
    path("profile/", fetch_user_profile, name="profile"),
    path("profile/update/", update_user_profile, name="update_profile"),
    path("password/update/", update_password, name="update_password"),

    # ---------------------------
    # SUPERADMIN
    # ---------------------------
    path("admin/signup/", adminSignup, name="admin_create"),
    path("admins/fetch/", fetch_all_admins, name="admins_list"),
    path("admin/<int:admin_id>/update/", update_admin, name="admin_update"),
    path("admin/<int:admin_id>/toggle-status/", toggle_admin_status, name="admin_toggle"),
    path("admin/<int:admin_id>/delete/", delete_admin, name="admin_delete"),

    # Bulk actions
    path("admins/bulk/deactivate/", bulk_deactivate_admins, name="admins_bulk_deactivate"),
    path("admins/bulk/delete/", bulk_delete_admins, name="admins_bulk_delete"),
]