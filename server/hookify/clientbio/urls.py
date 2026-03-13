from django.urls import path
from . import views

urlpatterns = [
    path("client-upload-image/", views.client_upload_image, name="client-img-upload"),
    path("client-bio/", views.client_get_bio, name="client-get-bio"),
    path("client-bio/update/", views.client_update_bio, name="client-update-bio"),
    path("client-image/delete/", views.client_delete_image, name="client-delete-image"),
]