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

    # ============================================================
    # SINGLE PRODUCT
    # ============================================================

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