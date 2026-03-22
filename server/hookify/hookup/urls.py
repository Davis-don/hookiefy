from django.urls import path
from . import views

urlpatterns = [
    # Main create hookup endpoint
    path('create-hookup/', views.create_hookup, name='create_hookup'),
    
    # Additional helper endpoints (optional)
    path('/my-hookups/', views.my_hookups, name='my_hookups'),
    path('/hookup/<int:hookup_id>/accept/', views.accept_hookup, name='accept_hookup'),
    path('/hookup/<int:hookup_id>/reject/', views.reject_hookup, name='reject_hookup'),
    path('/hookup/<int:hookup_id>/cancel/', views.cancel_hookup, name='cancel_hookup'),
]