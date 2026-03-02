# accounts/urls.py
from django.urls import path
from .views import (
    signup,
    login_view,
    check_auth,
    refresh_token_view,
    logout_view,
    fetch_user_profile,
    update_user_profile,
    update_password,
)

urlpatterns = [
    # Authentication
    path('signup/', signup, name='signup'),
    path('login/', login_view, name='login'),
    path('check-auth/', check_auth, name='check-auth'),
    path('refresh-token/', refresh_token_view, name='refresh-token'),
    path('logout/', logout_view, name='logout'),
    
    # Profile management
    path('profile/', fetch_user_profile, name='fetch-profile'),
    path('profile/update/', update_user_profile, name='update-profile'),
    path('password/update/', update_password, name='update-password'),
]