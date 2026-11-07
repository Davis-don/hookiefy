# products/urls.py

from django.urls import path
from . import views


urlpatterns = [
    # ============================================================
    # PRODUCTS OF A BUSINESS
    # ============================================================

    # GET  /products/business/<business_id>/
    # POST /products/business/<business_id>/create/
    path(
        "business/<int:business_id>/",
        views.list_products,
        name="list_products",
    ),
    path(
        "business/<int:business_id>/create/",
        views.create_product,
        name="create_product",
    ),

    # GET /products/business/<business_id>/usage/
    path(
        "business/<int:business_id>/usage/",
        views.product_usage,
        name="product_usage",
    ),

    # ============================================================
    # SINGLE PRODUCT
    # ============================================================

    # GET /products/<product_id>/lookup/
    #
    # Admin-only minimal lookup used by the Add-order wizard.
    # MUST come before the bare <int:product_id>/ route below
    # so it's unambiguous and won't be shadowed if the bare
    # route's converter ever changes.
    path(
        "<int:product_id>/lookup/",
        views.lookup_product_for_admin,
        name="product-lookup-admin",
    ),

    # GET    /products/<product_id>/
    # PATCH  /products/<product_id>/update/
    # DELETE /products/<product_id>/delete/
    path(
        "<int:product_id>/",
        views.retrieve_product,
        name="retrieve_product",
    ),
    path(
        "<int:product_id>/update/",
        views.update_product,
        name="update_product",
    ),
    path(
        "<int:product_id>/delete/",
        views.delete_product,
        name="delete_product",
    ),
]