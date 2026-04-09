from django.urls import path
from . import views

urlpatterns = [
    path("create/", views.create_client_config),
    path("get/", views.get_client_config),
    path("update/", views.update_client_config),
    path("delete/", views.delete_client_config),
]