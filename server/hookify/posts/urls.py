from django.urls import path
from . import views


urlpatterns = [
    # ============================================================
    # POSTS OF A BUSINESS
    # ============================================================

    # GET  /posts/business/<business_id>/
    # POST /posts/business/<business_id>/create/
    path(
        "business/<int:business_id>/",
        views.list_posts,
        name="list_posts",
    ),
    path(
        "business/<int:business_id>/create/",
        views.create_post,
        name="create_post",
    ),

    # ============================================================
    # SINGLE POST
    # ============================================================

    # GET    /posts/<post_id>/
    # PATCH  /posts/<post_id>/update/
    # DELETE /posts/<post_id>/delete/
    path(
        "<int:post_id>/",
        views.retrieve_post,
        name="retrieve_post",
    ),
    path(
        "<int:post_id>/update/",
        views.update_post,
        name="update_post",
    ),
    path(
        "<int:post_id>/delete/",
        views.delete_post,
        name="delete_post",
    ),
]