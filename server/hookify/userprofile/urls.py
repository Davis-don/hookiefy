from django.urls import path
from . import views

urlpatterns = [
    path('create-update/', views.create_or_update_profile, name='create_or_update_profile'),
    path('fetch-profile/', views.get_profile, name='get_profile'),
]