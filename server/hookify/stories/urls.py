# stories/urls.py

from django.urls import path
from . import views

app_name = "stories"

urlpatterns = [
    # ============================================================
    # USER STORIES
    # ============================================================

    # List stories authored by the authenticated user
    # GET /stories/mine/
    path(
        "mine/",
        views.list_my_stories,
        name="list-my-stories",
    ),

    # Public feed — all stories
    # GET /stories/
    path(
        "",
        views.list_all_stories,
        name="list-all-stories",
    ),

    # Create a new story
    # POST /stories/create/
    path(
        "create/",
        views.create_story,
        name="create-story",
    ),

    # Retrieve a single story (author only)
    # GET /stories/<story_id>/
    path(
        "<int:story_id>/",
        views.retrieve_story,
        name="retrieve-story",
    ),

    # Update a story (author only)
    # PATCH/PUT /stories/<story_id>/update/
    path(
        "<int:story_id>/update/",
        views.update_story,
        name="update-story",
    ),

    # Delete a story (author only)
    # DELETE /stories/<story_id>/delete/
    path(
        "<int:story_id>/delete/",
        views.delete_story,
        name="delete-story",
    ),

    # ============================================================
    # ADMIN
    # ============================================================

    # Superadmin list — every story
    # GET /stories/admin/all/
    path(
        "admin/all/",
        views.admin_list_stories,
        name="admin-list-stories",
    ),
]