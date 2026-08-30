# system_admin/urls.py
# ============================================================
# System Admin URLs
# ============================================================

from django.urls import path
from . import views

app_name = 'system_admin'

urlpatterns = [
    # Create/Update System Admin (Superadmin Only)
    path('create/', views.create_system_admin, name='create_system_admin'),
]