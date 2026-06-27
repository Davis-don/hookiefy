from django.urls import path
from . import views

urlpatterns = [
    # Preference endpoints
    path('create-update/', views.create_or_update_preference, name='create_or_update_preference'),
    path('get/', views.get_preference, name='get_preference'),
]