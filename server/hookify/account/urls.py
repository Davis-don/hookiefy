from django.urls import path
from . import views

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health_check'),
    
    # Authentication
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('refresh/', views.refresh_token_view, name='refresh_token'),
    path('auth-check/', views.auth_check, name='auth_check'),
    
    # Current user
    path('current-user/', views.get_current_logged_in_user, name='current_user'),
    
    # User management
    path('new/', views.create_new_user, name='create_user'),
    path('update-user/', views.update_user_details, name='update_user'),
    path('update-password/', views.update_user_password, name='update_password'),
    
    # Delete current user account
    path('delete-account/', views.delete_current_user, name='delete_current_user'),
    
    # User management by ID (GET, PUT, DELETE) - MUST come before role/all paths
    path('user/<int:id>/', views.manage_user_by_id, name='manage_user_by_id'),
    
    # Get users by role OR all users with pagination (superadmin only)
    path('role/<str:role>/', views.get_users_by_role_or_all, name='get_users_by_role_or_all'),
    
    # Get all users with pagination (superadmin only)
    path('all/', views.get_all_users_paginated, name='get_all_users_paginated'),

# Profile image upload
path('upload-profile-image/', views.upload_profile_image, name='upload_profile_image'),
]