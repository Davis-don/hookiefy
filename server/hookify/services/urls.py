# services/urls.py
from django.urls import path

from .views import (
    # Categories
    service_categories_list_create,
    service_category_detail,
    toggle_service_category_active,
    toggle_service_category_featured,

    # Listings
    services_list_create,
    service_detail,

    # Listing images
    upload_service_images,
    delete_service_image,
    bulk_delete_service_images_view,
    set_primary_service_image,
    reorder_service_images,
)


urlpatterns = [
    # ══════════════════════════════════════════════════════
    # CATEGORIES
    # ══════════════════════════════════════════════════════
    path(
        "service-categories/",
        service_categories_list_create,
        name="service-categories-list-create",
    ),
    path(
        "service-categories/<int:pk>/",
        service_category_detail,
        name="service-category-detail",
    ),
    path(
        "service-categories/<int:pk>/toggle-active/",
        toggle_service_category_active,
        name="service-category-toggle-active",
    ),
    path(
        "service-categories/<int:pk>/toggle-featured/",
        toggle_service_category_featured,
        name="service-category-toggle-featured",
    ),

    # ══════════════════════════════════════════════════════
    # LISTINGS
    # ══════════════════════════════════════════════════════
    path(
        "",
        services_list_create,
        name="services-list-create",
    ),
    path(
        "<int:pk>/",
        service_detail,
        name="service-detail",
    ),

    # ══════════════════════════════════════════════════════
    # LISTING IMAGES
    # ══════════════════════════════════════════════════════
    path(
        "<int:pk>/images/upload/",
        upload_service_images,
        name="service-images-upload",
    ),
    path(
        "<int:pk>/images/bulk-delete/",
        bulk_delete_service_images_view,
        name="service-images-bulk-delete",
    ),
    path(
        "<int:pk>/images/<int:image_id>/",
        delete_service_image,
        name="service-image-delete",
    ),
    path(
        "<int:pk>/images/<int:image_id>/set-primary/",
        set_primary_service_image,
        name="service-image-set-primary",
    ),
    path(
        "<int:pk>/images/reorder/",
        reorder_service_images,
        name="service-images-reorder",
    ),
]