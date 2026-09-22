# plans/urls.py
from django.urls import path

from .views import (
    plans_list,
    plan_create,
    plan_detail,
    plan_update,
    plan_delete,
)


urlpatterns = [
    # ────────────────────────────────────────────────────────
    # LIST
    # ────────────────────────────────────────────────────────

    # GET /plans/                → public list of plans
    path(
        "",
        plans_list,
        name="plans-list",
    ),

    # ────────────────────────────────────────────────────────
    # CREATE
    # ────────────────────────────────────────────────────────

    # POST /plans/create/        → create (superadmin only)
    path(
        "create/",
        plan_create,
        name="plan-create",
    ),

    # ────────────────────────────────────────────────────────
    # DETAIL (READ)
    # ────────────────────────────────────────────────────────

    # GET /plans/<pk>/           → public read
    path(
        "<int:pk>/",
        plan_detail,
        name="plan-detail",
    ),

    # ────────────────────────────────────────────────────────
    # UPDATE
    # ────────────────────────────────────────────────────────

    # PUT    /plans/<pk>/update/ → full update (superadmin only)
    # PATCH  /plans/<pk>/update/ → partial update (superadmin only)
    path(
        "<int:pk>/update/",
        plan_update,
        name="plan-update",
    ),

    # ────────────────────────────────────────────────────────
    # DELETE
    # ────────────────────────────────────────────────────────

    # DELETE /plans/<pk>/delete/ → delete (superadmin only)
    path(
        "<int:pk>/delete/",
        plan_delete,
        name="plan-delete",
    ),
]