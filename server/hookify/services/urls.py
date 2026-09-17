# services/urls.py
from django.urls import path

from .views import (
    service_categories_list_create,
    service_category_detail,
    toggle_service_category_active,
    toggle_service_category_featured,
)


urlpatterns = [
    # List + create
    path(
        "service-categories/",
        service_categories_list_create,
        name="service-categories-list-create",
    ),

    # Retrieve + update + delete
    path(
        "service-categories/<int:pk>/",
        service_category_detail,
        name="service-category-detail",
    ),

    # Quick toggles
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
]