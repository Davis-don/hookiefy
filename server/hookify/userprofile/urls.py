# userprofile/urls.py

from django.urls import path

from .views import (
    create_or_update_profile,
    get_profile,
    has_profile,
    get_current_user_full_data,
    get_user_full_data_by_id,
    search_users_by_name,
)

urlpatterns = [
    path("create-or-update/", create_or_update_profile, name="profile-create-or-update"),
    path("me/", get_profile, name="profile-me"),
    path("has-profile/", has_profile, name="profile-has-profile"),
    path("full-data/", get_current_user_full_data, name="profile-full-data"),
    path("full-data/<int:user_id>/", get_user_full_data_by_id, name="profile-full-data-by-id"),
    path("search/", search_users_by_name, name="profile-search"),
]