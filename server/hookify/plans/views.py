# plans/views.py

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Plan
from .serializers import (
    PlanSerializer,
    PlanCreateSerializer,
    PlanUpdateSerializer,
)


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    return (
        getattr(user, "is_superuser", False)
        or getattr(user, "role", "") == "superadmin"
    )


# ============================================================
# LIST — GET /plans/
# Public. Only active plans, ordered.
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def list_plans(request):
    qs = (
        Plan.objects
        .filter(is_active=True)
        .prefetch_related("properties")
    )
    return Response(
        PlanSerializer(qs, many=True).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# RETRIEVE — GET /plans/<slug>/
# Public.
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def retrieve_plan(request, slug):
    plan = get_object_or_404(
        Plan.objects.prefetch_related("properties"),
        slug=slug,
        is_active=True,
    )
    return Response(
        PlanSerializer(plan).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# ADMIN — LIST EVERY PLAN
# GET /plans/admin/all/
# Superadmin only. Includes inactive plans.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_list_plans(request):
    if not _is_superadmin(request.user):
        return Response(
            {"message": "Not permitted."},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = Plan.objects.all().prefetch_related("properties")
    return Response(
        {
            "count": qs.count(),
            "results": PlanSerializer(qs, many=True).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE — POST /plans/create/
# Superadmin only.
#
# Special behaviour:
#   If this is the first plan in the DB, it is automatically
#   marked as the default.
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_plan(request):
    if not _is_superadmin(request.user):
        return Response(
            {"message": "Not permitted."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = PlanCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_first = not Plan.objects.exists()
    plan = serializer.save()

    return Response(
        {
            "message": (
                "Plan created successfully."
                + (" This is the default plan." if is_first else "")
            ),
            "plan": PlanSerializer(plan).data,
            "was_first_plan": is_first,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# UPDATE — PATCH /plans/<slug>/update/
# Superadmin only.
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_plan(request, slug):
    if not _is_superadmin(request.user):
        return Response(
            {"message": "Not permitted."},
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = get_object_or_404(Plan, slug=slug)

    serializer = PlanUpdateSerializer(
        plan,
        data=request.data,
        partial=(request.method == "PATCH"),
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    plan = serializer.save()

    return Response(
        {
            "message": "Plan updated successfully.",
            "plan": PlanSerializer(plan).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE — DELETE /plans/<slug>/delete/
# Superadmin only.
#
# Safety gates (each returns 400 with a clear message):
#   1. Subscription FK — anyone currently subscribed to it.
#   2. User.plan FK    — if the user model links directly.
#   3. Default plan    — refuse to delete the default without
#                        a replacement active plan.
#   4. ProtectedError  — catch any other FK block at delete.
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_plan(request, slug):
    if not _is_superadmin(request.user):
        return Response(
            {"message": "Not permitted."},
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = get_object_or_404(Plan, slug=slug)

    # ── 1. Subscriptions currently on this plan ─────────────
    from subscription.models import Subscription

    subs = Subscription.objects.filter(plan=plan)
    sub_count = subs.count()

    if sub_count > 0:
        active_count = subs.filter(is_active=True).count() if hasattr(
            Subscription, "is_active"
        ) else sub_count

        return Response(
            {
                "message": (
                    "This plan cannot be deleted because users are "
                    "currently subscribed to it. Cancel or move "
                    "all subscriptions to another plan first."
                ),
                "code": "plan_in_use",
                "subscription_count": sub_count,
                "active_subscriptions": active_count,
                "suggested_action": (
                    "Use POST /subscriptions/<id>/cancel/ or "
                    "reassign subscriptions to another plan."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 2. Users directly linked via User.plan (if that field exists)
    try:
        from account.models import User
        if hasattr(User, "plan"):
            user_qs = User.objects.filter(plan=plan)
            user_count = user_qs.count()
            if user_count > 0:
                return Response(
                    {
                        "message": (
                            "This plan cannot be deleted because "
                            "users are directly assigned to it."
                        ),
                        "code": "plan_in_use",
                        "user_count": user_count,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
    except Exception:
        # User model doesn't have `.plan`, or import fails — skip.
        pass

    # ── 3. Refuse to delete the default plan ────────────────
    if plan.is_default:
        # Do we have another active plan we could promote instead?
        replacement = (
            Plan.objects
            .filter(is_active=True)
            .exclude(pk=plan.pk)
            .order_by("price", "display_order")
            .first()
        )

        if replacement is None:
            return Response(
                {
                    "message": (
                        "This is the default plan and no other "
                        "active plan exists to replace it. "
                        "Create or activate another plan first."
                    ),
                    "code": "default_plan_undeletable",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Auto-promote the cheapest active plan to default,
        # then proceed to delete.
        with transaction.atomic():
            replacement.is_default = True
            replacement.save(
                update_fields=["is_default", "updated_at"]
            )

    # ── 4. Delete ───────────────────────────────────────────
    from django.db.models import ProtectedError

    try:
        plan.delete()
    except ProtectedError:
        return Response(
            {
                "message": (
                    "Cannot delete this plan — it is protected by "
                    "related records. Remove the references first."
                ),
                "code": "plan_protected",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "message": f"{plan.plan_name} deleted.",
            "replacement_default": (
                replacement.plan_name
                if 'replacement' in locals()
                and replacement is not None
                else None
            ),
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# SET DEFAULT — POST /plans/<slug>/set-default/
# Superadmin only.
#
# Makes this plan the default. Un-marks any other plan that
# was previously the default.
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_default_plan(request, slug):
    if not _is_superadmin(request.user):
        return Response(
            {"message": "Not permitted."},
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = get_object_or_404(Plan, slug=slug)

    with transaction.atomic():
        Plan.objects.filter(is_default=True).exclude(
            pk=plan.pk
        ).update(is_default=False)

        plan.is_default = True

        if not plan.is_active:
            plan.is_active = True

        plan.save(update_fields=["is_default", "is_active", "updated_at"])

    return Response(
        {
            "message": f"{plan.plan_name} is now the default plan.",
            "plan": PlanSerializer(plan).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CLEAR DEFAULT — POST /plans/<slug>/clear-default/
# Superadmin only.
#
# Removes the default flag. Useful when you want to have
# no default at all for a while (e.g. between configurations).
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clear_default_plan(request, slug):
    if not _is_superadmin(request.user):
        return Response(
            {"message": "Not permitted."},
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = get_object_or_404(Plan, slug=slug)

    if not plan.is_default:
        return Response(
            {"message": "This plan is not the default."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    plan.is_default = False
    plan.save(update_fields=["is_default", "updated_at"])

    return Response(
        {
            "message": f"{plan.plan_name} is no longer the default.",
            "plan": PlanSerializer(plan).data,
        },
        status=status.HTTP_200_OK,
    )