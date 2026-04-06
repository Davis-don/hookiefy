from django.urls import path
from . import views

urlpatterns = [
    path('all-profiles/', views.all_profiles, name='all-profiles'),
    path('profile/<int:profile_id>/', views.get_profile_by_id, name='profile-by-id'),
]