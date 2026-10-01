# plans/urls.py
from django.urls import path

from .views import (
    plans_list,
    plans_for_me,
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

    # GET /plans/for-me/         → auth-required, filtered
    path(
        "for-me/",
        plans_for_me,
        name="plans-for-me",
    ),

    # ────────────────────────────────────────────────────────
    # CREATE
    # ────────────────────────────────────────────────────────

    path(
        "create/",
        plan_create,
        name="plan-create",
    ),

    # ────────────────────────────────────────────────────────
    # DETAIL (READ)
    # ────────────────────────────────────────────────────────

    path(
        "<int:pk>/",
        plan_detail,
        name="plan-detail",
    ),

    # ────────────────────────────────────────────────────────
    # UPDATE
    # ────────────────────────────────────────────────────────

    path(
        "<int:pk>/update/",
        plan_update,
        name="plan-update",
    ),

    # ────────────────────────────────────────────────────────
    # DELETE
    # ────────────────────────────────────────────────────────

    path(
        "<int:pk>/delete/",
        plan_delete,
        name="plan-delete",
    ),
]