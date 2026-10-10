# system_stats/urls.py

from django.urls import path

from .views import (
    system_users_count,
    system_businesses_count,
)


app_name = 'system_stats'


urlpatterns = [
    path(
        'users/',
        system_users_count,
        name='users-count',
    ),
    path(
        'businesses/',
        system_businesses_count,
        name='businesses-count',
    ),
]