# deliveries/urls.py

from django.urls import path

from . import views


urlpatterns = [
    path(
        "",
        views.my_deliveries,
        name="delivery-list",
    ),
]