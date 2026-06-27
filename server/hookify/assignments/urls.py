from django.urls import path
from . import views

urlpatterns = [
    path('assigned-users/', views.get_assigned_users, name='get_assigned_users'),
]