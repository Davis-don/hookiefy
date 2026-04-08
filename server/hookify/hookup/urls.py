from django.urls import path
from . import views

urlpatterns = [
    # CREATE ONLY
    path('create-hookup/', views.create_hookup, name='create_hookup'),
]