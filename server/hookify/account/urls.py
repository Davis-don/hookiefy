from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health_check),
    # User creation
    path(
        'new/',
        views.create_new_user,
        name='create_new_user'
    ),

    # Current logged-in user
    path(
        'current-user/',
        views.get_current_logged_in_user,
        name='get_current_logged_in_user'
    ),

    # Logout
    path(
        'logout/',
        views.logout_user,
        name='logout_user'
    ),

    # Update profile
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

    path(
        'get_user/<int:id>/',
        views.fetch_user_by_id,
        name='fetch_user_by_id'
    ),

    # Superadmin only
    path(
        'role/<str:role>/',
        views.get_users_by_role,
        name='get_users_by_role'
    ),
    
]