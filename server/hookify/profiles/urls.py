from django.urls import path
from . import views

urlpatterns = [
    path('all-profiles/', views.all_profiles, name='all-profiles'),
]