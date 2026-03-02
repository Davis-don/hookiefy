# accounts/urls.py
from django.urls import path
from .views import (
    adminSignup,
    login_view,
    check_auth,
    refresh_token_view,
    logout_view,
    fetch_user_profile,
    update_user_profile,
    update_password,
)

urlpatterns = [
    path('admin/signup/', adminSignup, name='signup'),
    path('login/', login_view, name='login'),
    path('check-auth/', check_auth, name='check-auth'),
    path('refresh-token/', refresh_token_view, name='refresh-token'),
    path('logout/', logout_view, name='logout'),

    path('profile/', fetch_user_profile),
    path('profile/update/', update_user_profile),
    path('password/update/', update_password),
]