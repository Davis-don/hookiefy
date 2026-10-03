from django.urls import path
from . import views


urlpatterns = [
    path(
        "create/",
        views.create_business,
        name="create_business",
    ),
    path(
        "mine/",
        views.list_my_businesses,
        name="list_my_businesses",
    ),
    path(
        "all/",
        views.list_all_businesses,
        name="list_all_businesses",
    ),
    path(
        "<int:business_id>/",
        views.retrieve_business,
        name="retrieve_business",
    ),
    path(
        "<int:business_id>/update/",
        views.update_business,
        name="update_business",
    ),
    path(
        "<int:business_id>/delete/",
        views.delete_business,
        name="delete_business",
    ),
]