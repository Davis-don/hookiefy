# plans/views.py
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Adjust the import path if OptionalJWTAuthentication lives elsewhere
from stories.authentication import OptionalJWTAuthentication

from .models import Plan
from .serializers import (
    PlanReadSerializer,
    PlanCreateSerializer,
    PlanUpdateSerializer,
)


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    if not user or not user.is_authenticated:
        return False
    return getattr(user, "role", None) == "superadmin"


def _unauthorized(message="Authentication required."):
    return Response(
        {"message": message},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _forbidden(
    message="You do not have permission to manage plans.",
):
    return Response(
        {"message": message},
        status=status.HTTP_403_FORBIDDEN,
    )


# ============================================================
# LIST  —  GET /plans/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plans_list(request):
    """
    GET /plans/
        Public list of plans.
        ?active=true   → only active plans
        ?ordering=price | -price | display_order | name
    """
    qs = Plan.objects.all()

    active_param = request.query_params.get("active")
    if active_param is not None:
        if active_param.lower() in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif active_param.lower() in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

    ordering = request.query_params.get("ordering", "display_order")
    allowed_ordering = {
        "display_order", "-display_order",
        "price", "-price",
        "name", "-name",
        "created_at", "-created_at",
    }
    if ordering not in allowed_ordering:
        ordering = "display_order"

    qs = qs.order_by(ordering, "price")

    serializer = PlanReadSerializer(qs, many=True)
    return Response(
        {
            "count": qs.count(),
            "plans": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE  —  POST /plans/create/
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_create(request):
    """
    POST /plans/create/
        Superadmin only — create a new plan.
    """
    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden()

    serializer = PlanCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "message": "Validation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            plan = serializer.save()
    except Exception as e:
        logger.exception(
            "Failed to create plan by user_id=%s",
            request.user.id,
        )
        return Response(
            {
                "message": "Failed to create plan.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Plan created successfully.",
            "plan": PlanReadSerializer(plan).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# DETAIL  —  GET /plans/<pk>/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_detail(request, pk):
    """
    GET /plans/<pk>/
        Public read.
    """
    plan = get_object_or_404(Plan, pk=pk)
    return Response(
        {"plan": PlanReadSerializer(plan).data},
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE  —  PUT/PATCH /plans/<pk>/update/
# ============================================================

@api_view(["PUT", "PATCH"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_update(request, pk):
    """
    PUT/PATCH /plans/<pk>/update/
        Superadmin only.
        PUT   → full update
        PATCH → partial update
    """
    plan = get_object_or_404(Plan, pk=pk)

    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden()

    partial = request.method == "PATCH"

    serializer = PlanUpdateSerializer(
        instance=plan,
        data=request.data,
        partial=partial,
    )

    if not serializer.is_valid():
        return Response(
            {
                "message": "Validation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            updated = serializer.save()
    except Exception as e:
        logger.exception("Failed to update plan_id=%s", plan.id)
        return Response(
            {
                "message": "Failed to update plan.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Plan updated successfully.",
            "plan": PlanReadSerializer(updated).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE  —  DELETE /plans/<pk>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_delete(request, pk):
    """
    DELETE /plans/<pk>/delete/
        Superadmin only.
    """
    plan = get_object_or_404(Plan, pk=pk)

    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden()

    try:
        with transaction.atomic():
            plan.delete()
    except Exception as e:
        logger.exception("Failed to delete plan_id=%s", plan.id)
        return Response(
            {
                "message": "Failed to delete plan.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Plan deleted successfully."},
        status=status.HTTP_200_OK,
    )