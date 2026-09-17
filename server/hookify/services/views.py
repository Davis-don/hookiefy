# services/views.py
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response

from .models import ServiceCategory
from .serializers import ServiceCategorySerializer


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    """
    Return True only when the given user is a superadmin.
    """

    if not user or not user.is_authenticated:
        return False

    return getattr(user, "role", None) == "superadmin"


def _forbidden(message):
    """
    Consistent 403 response.
    """

    return Response(
        {"message": message},
        status=status.HTTP_403_FORBIDDEN,
    )


def _unauthorized(message="Authentication required."):
    """
    Consistent 401 response.
    """

    return Response(
        {"message": message},
        status=status.HTTP_401_UNAUTHORIZED,
    )


# ============================================================
# LIST + CREATE
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def service_categories_list_create(request):
    """
    GET  /services/service-categories/
        Public list of service categories.

        Query params:
            ?featured=true   → only featured categories
            ?search=teach    → case-insensitive name filter
            ?all=true        → (superadmin only) include inactive

    POST /services/service-categories/
        Create a new service category.
        Superadmin only.
    """

    # ── LIST ─────────────────────────────────────────────
    if request.method == "GET":

        qs = ServiceCategory.objects.all()

        include_all = (
            request.query_params.get("all") == "true"
            and _is_superadmin(request.user)
        )

        if not include_all:
            qs = qs.filter(is_active=True)

        if request.query_params.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search)

        qs = qs.order_by("display_order", "name")

        serializer = ServiceCategorySerializer(qs, many=True)

        return Response(
            {
                "count": qs.count(),
                "categories": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ── CREATE ───────────────────────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden(
            "Only superadmins can create service categories."
        )

    serializer = ServiceCategorySerializer(data=request.data)

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
            category = serializer.save()

    except Exception as e:
        logger.exception(
            "Failed to create service category by user_id=%s",
            request.user.id,
        )
        return Response(
            {
                "message": "Failed to create service category.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Service category created successfully.",
            "category": ServiceCategorySerializer(category).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE + UPDATE + DELETE
# ============================================================

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def service_category_detail(request, pk):
    """
    GET    /services/service-categories/<pk>/   → public read
    PUT    /services/service-categories/<pk>/   → full update (superadmin)
    PATCH  /services/service-categories/<pk>/   → partial update (superadmin)
    DELETE /services/service-categories/<pk>/   → delete (superadmin)
    """

    category = get_object_or_404(ServiceCategory, pk=pk)

    # ── READ ─────────────────────────────────────────────
    if request.method == "GET":

        # Inactive categories are only visible to superadmins.
        if not category.is_active and not _is_superadmin(request.user):
            return Response(
                {"message": "Category not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"category": ServiceCategorySerializer(category).data},
            status=status.HTTP_200_OK,
        )

    # ── AUTH GUARD FOR WRITE OPS ─────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden(
            "Only superadmins can modify service categories."
        )

    # ── DELETE ───────────────────────────────────────────
    if request.method == "DELETE":
        try:
            with transaction.atomic():
                category.delete()

        except Exception as e:
            logger.exception(
                "Failed to delete service_category_id=%s",
                category.id,
            )
            return Response(
                {
                    "message": "Failed to delete service category.",
                    "error": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "Service category deleted successfully."},
            status=status.HTTP_200_OK,
        )

    # ── UPDATE (PUT / PATCH) ─────────────────────────────
    partial = request.method == "PATCH"

    serializer = ServiceCategorySerializer(
        instance=category,
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
        logger.exception(
            "Failed to update service_category_id=%s",
            category.id,
        )
        return Response(
            {
                "message": "Failed to update service category.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Service category updated successfully.",
            "category": ServiceCategorySerializer(updated).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# TOGGLE ACTIVE (CONVENIENCE)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_service_category_active(request, pk):
    """
    POST /services/service-categories/<pk>/toggle-active/

    Quickly flip a category on/off without sending the
    whole payload. Superadmin only.
    """

    if not _is_superadmin(request.user):
        return _forbidden("Only superadmins can modify categories.")

    category = get_object_or_404(ServiceCategory, pk=pk)

    category.is_active = not category.is_active
    category.save(update_fields=["is_active", "updated_at"])

    return Response(
        {
            "message": (
                "Category activated."
                if category.is_active
                else "Category deactivated."
            ),
            "category": ServiceCategorySerializer(category).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# TOGGLE FEATURED (CONVENIENCE)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_service_category_featured(request, pk):
    """
    POST /services/service-categories/<pk>/toggle-featured/

    Flip the featured flag on a category. Superadmin only.
    """

    if not _is_superadmin(request.user):
        return _forbidden("Only superadmins can modify categories.")

    category = get_object_or_404(ServiceCategory, pk=pk)

    category.is_featured = not category.is_featured
    category.save(update_fields=["is_featured", "updated_at"])

    return Response(
        {
            "message": (
                "Category marked as featured."
                if category.is_featured
                else "Category removed from featured."
            ),
            "category": ServiceCategorySerializer(category).data,
        },
        status=status.HTTP_200_OK,
    )