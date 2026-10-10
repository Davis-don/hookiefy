# plans/urls.py

from django.urls import path

from . import views


urlpatterns = [
    # ─────────────────────────────────────────────────────────
    # ADMIN / WRITE ROUTES FIRST
    # ─────────────────────────────────────────────────────────
    # These MUST come before <slug:slug>/, otherwise Django
    # treats "create", "admin", etc. as slugs and matches the
    # read-only retrieve view.
    # ─────────────────────────────────────────────────────────

    path(
        "admin/all/",
        views.admin_list_plans,
        name="admin-list-plans",
    ),
    path(
        "create/",
        views.create_plan,
        name="create-plan",
    ),

    # ─────────────────────────────────────────────────────────
    # PUBLIC LIST
    # ─────────────────────────────────────────────────────────
    # Empty prefix → matches /plans/ exactly.
    # ─────────────────────────────────────────────────────────

    path(
        "",
        views.list_plans,
        name="list-plans",
    ),

    # ─────────────────────────────────────────────────────────
    # SINGLE PLAN — must come LAST
    # ─────────────────────────────────────────────────────────

    path(
        "<slug:slug>/",
        views.retrieve_plan,
        name="retrieve-plan",
    ),
    path(
        "<slug:slug>/update/",
        views.update_plan,
        name="update-plan",
    ),
    path(
        "<slug:slug>/delete/",
        views.delete_plan,
        name="delete-plan",
    ),
    path(
        "<slug:slug>/set-default/",
        views.set_default_plan,
        name="set-default-plan",
    ),
    path(
        "<slug:slug>/clear-default/",
        views.clear_default_plan,
        name="clear-default-plan",
    ),
]