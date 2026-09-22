from django.urls import path
from . import views


urlpatterns = [

    # ============================================================
    # CONNECTION FEE
    # ============================================================

    # Regular authenticated users:
    # Fetch the current connection fee
    path(
        "connection-fee/",
        views.get_connection_fee_view,
        name="get_connection_fee",
    ),

    # ============================================================
    # SUPERADMIN MANAGEMENT
    # ============================================================

    # Superadmin:
    # Fetch all platform configurations
    path(
        "connection-fee/all/",
        views.get_all_platform_configs_view,
        name="get_all_platform_configs",
    ),

    # Superadmin:
    # Create the connection fee configuration
    path(
        "connection-fee/create/",
        views.create_connection_fee_view,
        name="create_connection_fee",
    ),

    # Superadmin:
    # Update the current connection fee
    path(
        "connection-fee/update/",
        views.update_connection_fee_view,
        name="update_connection_fee",
    ),

    # Superadmin:
    # Update a specific configuration by ID
    path(
        "connection-fee/update/<int:config_id>/",
        views.update_connection_fee_view,
        name="update_connection_fee_by_id",
    ),

    # Superadmin:
    # Delete the current connection fee configuration
    path(
        "connection-fee/delete/",
        views.delete_connection_fee_view,
        name="delete_connection_fee",
    ),

    # Superadmin:
    # Delete a specific configuration by ID
    path(
        "connection-fee/delete/<int:config_id>/",
        views.delete_connection_fee_view,
        name="delete_connection_fee_by_id",
    ),
]