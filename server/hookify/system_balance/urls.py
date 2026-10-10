# system_balance/urls.py

from django.urls import path
from .views import system_balance_view, initialize_system_balance_view

app_name = 'system_balance'

urlpatterns = [
    path('fetch/', system_balance_view, name='system-balance'),
    path('initialize/', initialize_system_balance_view, name='system-balance-initialize'),
]