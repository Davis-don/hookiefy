# deliveries/urls.py

from django.urls import path

from . import views


urlpatterns = [
    path(
        "",
        views.my_deliveries,
        name="delivery-list",
    ),
    path(
        "all/",
        views.all_deliveries,
        name="delivery-list-all",
    ),
    path(
        "all/<uuid:pk>/",
        views.all_delivery_detail,
        name="delivery-detail-all",
    ),
    path(
        "all/<uuid:pk>/status/",
        views.all_delivery_update_status,
        name="delivery-status-all",
    ),
]