# urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ============================================
    # AUTHENTICATION ENDPOINTS (NEW)
    # ============================================
    
    # Login - returns access and refresh tokens in response body
    path(
        'login/',
        views.login_view,
        name='login'
    ),
    
    # Logout - blacklists refresh token
    path(
        'logout/',
        views.logout_view,
        name='logout'
    ),
    
    # Refresh token - get new access token using refresh token
    path(
        'refresh/',
        views.refresh_token_view,
        name='refresh_token'
    ),
    
    # Auth check - verify token and get user info
    path(
        'auth-check/',
        views.auth_check,
        name='auth_check'
    ),
    
    # ============================================
    # USER MANAGEMENT ENDPOINTS (KEPT FROM ORIGINAL)
    # ============================================
    
    # Get current logged-in user
    path(
        'current-user/',
        views.get_current_logged_in_user,
        name='get_current_logged_in_user'
    ),
    
    # Create new user (admin/superadmin only)
    path(
        'new/',
        views.create_new_user,
        name='create_new_user'
    ),
    
    # Update user details
    path(
        'update-user/',
        views.update_user_details,
        name='update_user_details'
    ),
    
    # Update password
    path(
        'update-password/',
        views.update_user_password,
        name='update_user_password'
    ),
    
    # Get user by ID (admin/superadmin only)
    path(
        'get_user/<int:id>/',
        views.fetch_user_by_id,
        name='fetch_user_by_id'
    ),
    
    # Get users by role (superadmin only)
    path(
        'role/<str:role>/',
        views.get_users_by_role,
        name='get_users_by_role'
    ),
    
    # ============================================
    # HEALTH CHECK
    # ============================================
    
    path(
        'health/',
        views.health_check,
        name='health_check'
    ),
]