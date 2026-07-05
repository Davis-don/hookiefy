from django.urls import path
from . import views

urlpatterns = [
    # Profile endpoints
    path('create-update/', views.create_or_update_profile, name='create_or_update_profile'),
    path('fetch-profile/', views.get_profile, name='get_profile'),
    path('has-profile/', views.has_profile, name='has_profile'),
    
    # Comprehensive user data endpoints
    path('current-user-full-data/', views.get_current_user_full_data, name='current_user_full_data'),
    path('user-full-data/<int:user_id>/', views.get_user_full_data_by_id, name='get_user_full_data_by_id'),
]