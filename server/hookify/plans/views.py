# plans/views.py

import logging

from django.db import models, transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.response import Response

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
        {
            "message": message,
        },
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _forbidden(
    message="You do not have permission to manage plans.",
):
    return Response(
        {
            "message": message,
        },
        status=status.HTTP_403_FORBIDDEN,
    )


# ============================================================
# LIST
# GET /plans/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plans_list(request):
    """
    Public list of plans.

    Query parameters:

        ?active=true
        ?active=false

        ?ordering=price
        ?ordering=-price
        ?ordering=display_order
        ?ordering=name
    """

    qs = Plan.objects.all()

    # --------------------------------------------------------
    # Active filter
    # --------------------------------------------------------

    active_param = request.query_params.get("active")

    if active_param is not None:

        if active_param.lower() in (
            "true",
            "1",
            "yes",
        ):
            qs = qs.filter(
                is_active=True
            )

        elif active_param.lower() in (
            "false",
            "0",
            "no",
        ):
            qs = qs.filter(
                is_active=False
            )

    # --------------------------------------------------------
    # Ordering
    # --------------------------------------------------------

    ordering = request.query_params.get(
        "ordering",
        "display_order",
    )

    allowed_ordering = {
        "display_order",
        "-display_order",
        "price",
        "-price",
        "name",
        "-name",
        "created_at",
        "-created_at",
    }

    if ordering not in allowed_ordering:
        ordering = "display_order"

    qs = qs.order_by(
        ordering,
        "price",
    )

    # --------------------------------------------------------
    # Serialize
    # --------------------------------------------------------

    serializer = PlanReadSerializer(
        qs,
        many=True,
    )

    return Response(
        {
            "count": qs.count(),
            "plans": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE
# POST /plans/create/
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_create(request):
    """
    Superadmin only.
    """

    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden()

    serializer = PlanCreateSerializer(
        data=request.data
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
            "plan": PlanReadSerializer(
                plan
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# DETAIL
# GET /plans/<pk>/
# ============================================================

@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_detail(request, pk):
    """
    Public plan detail.
    """

    plan = get_object_or_404(
        Plan,
        pk=pk,
    )

    return Response(
        {
            "plan": PlanReadSerializer(
                plan
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE
# PUT/PATCH /plans/<pk>/update/
# ============================================================

@api_view(["PUT", "PATCH"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_update(request, pk):
    """
    Superadmin only.
    """

    plan = get_object_or_404(
        Plan,
        pk=pk,
    )

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

        logger.exception(
            "Failed to update plan_id=%s",
            plan.id,
        )

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
            "plan": PlanReadSerializer(
                updated
            ).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE
# DELETE /plans/<pk>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def plan_delete(request, pk):
    """
    Superadmin only.
    """

    plan = get_object_or_404(
        Plan,
        pk=pk,
    )

    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden()

    try:

        with transaction.atomic():

            plan.delete()

    except Exception as e:

        logger.exception(
            "Failed to delete plan_id=%s",
            plan.id,
        )

        return Response(
            {
                "message": "Failed to delete plan.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Plan deleted successfully.",
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# SERVICE PROVIDER — AVAILABLE PLANS
#
# GET /plans/for-me/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def plans_for_me(request):
    """
    Return active plans according to the authenticated
    user's current subscription.

    Rules
    -----

    1. No subscription:
       - Return all active plans.
       - Free is available.
       - No plan is current.

    2. Free subscription:
       - Return all active plans.
       - Free is the current plan.
       - Free is disabled.
       - Paid plans are available.

    3. Active paid subscription:
       - Return active paid plans only.
       - Free is hidden because downgrading is not allowed.
       - Current paid plan is disabled.
       - Current paid plan CTA = "Current Plan".
       - Other paid plans are enabled.
       - Other paid plans CTA = "Upgrade".
       - The current paid plan can also be renewed through
         a separate renewal action if you want renewal.

    4. Expired paid subscription:
       - Return all active plans.
       - Free becomes available.
       - The expired plan is NOT treated as current.
       - All available plans are enabled.
    """

    # ========================================================
    # 1. AUTHENTICATED USER
    # ========================================================

    user = request.user

    # ========================================================
    # 2. GET CURRENT SUBSCRIPTION
    # ========================================================

    subscription = getattr(
        user,
        "subscription",
        None,
    )

    # ========================================================
    # 3. NO SUBSCRIPTION
    # ========================================================

    if subscription is None:

        qs = Plan.objects.filter(
            is_active=True
        ).order_by(
            "display_order",
            "price",
        )

        data = []

        for plan in qs:

            is_free = (
                (plan.name or "").strip().lower()
                == "free"
                or
                (plan.slug or "").strip().lower()
                == "free"
            )

            payload = PlanReadSerializer(
                plan
            ).data

            payload["is_current"] = False

            payload["cta"] = {
                "label": (
                    "Get Started"
                    if is_free
                    else "Upgrade"
                ),
                "disabled": False,
            }

            data.append(payload)

        return Response(
            {
                "count": len(data),
                "plans": data,
                "subscription": {
                    "has_subscription": False,
                    "is_free": False,
                    "is_active": False,
                    "is_expired": False,
                    "plan_id": None,
                },
            },
            status=status.HTTP_200_OK,
        )

    # ========================================================
    # 4. CURRENT PLAN
    # ========================================================

    current_plan = subscription.plan

    # ========================================================
    # 5. CHECK WHETHER CURRENT PLAN IS FREE
    # ========================================================

    is_free_plan = (
        (current_plan.name or "").strip().lower()
        == "free"
        or
        (current_plan.slug or "").strip().lower()
        == "free"
    )

    # ========================================================
    # 6. CHECK SUBSCRIPTION STATE
    # ========================================================

    is_active = subscription.is_active

    is_expired = subscription.is_expired

    # ========================================================
    # 7. ACTIVE PAID SUBSCRIPTION
    # ========================================================

    active_paid_subscription = (
        is_active
        and not is_free_plan
    )

    # ========================================================
    # 8. GET ACTIVE PLANS
    # ========================================================

    qs = Plan.objects.filter(
        is_active=True
    )

    # ========================================================
    # 9. ACTIVE PAID USER CANNOT DOWNGRADE TO FREE
    # ========================================================

    if active_paid_subscription:

        qs = qs.exclude(
            models.Q(
                name__iexact="free"
            )
            |
            models.Q(
                slug__iexact="free"
            )
        )

    # ========================================================
    # 10. ORDER PLANS
    # ========================================================

    qs = qs.order_by(
        "display_order",
        "price",
    )

    # ========================================================
    # 11. BUILD RESPONSE
    # ========================================================

    data = []

    for plan in qs:

        # ----------------------------------------------------
        # Is this the user's current plan?
        # ----------------------------------------------------

        is_current = (
            is_active
            and plan.id == current_plan.id
        )

        # ----------------------------------------------------
        # Is this plan free?
        # ----------------------------------------------------

        is_free = (
            (plan.name or "").strip().lower()
            == "free"
            or
            (plan.slug or "").strip().lower()
            == "free"
        )

        # ----------------------------------------------------
        # Default
        # ----------------------------------------------------

        cta_label = "Upgrade"

        cta_disabled = False

        # ====================================================
        # FREE CURRENT PLAN
        # ====================================================

        if is_current and is_free:

            cta_label = "Current Plan"

            cta_disabled = True

        # ====================================================
        # ACTIVE PAID CURRENT PLAN
        # ====================================================

        elif is_current and not is_free:

            cta_label = "Current Plan"

            cta_disabled = True

        # ====================================================
        # EXPIRED SUBSCRIPTION
        # ====================================================

        elif is_expired:

            if is_free:

                cta_label = "Get Started"

            else:

                cta_label = "Upgrade"

            cta_disabled = False

        # ====================================================
        # FREE PLAN
        # ====================================================

        elif is_free:

            # This branch mainly protects against
            # unexpected states.

            if active_paid_subscription:

                cta_label = "Cannot downgrade"

                cta_disabled = True

            else:

                cta_label = "Get Started"

                cta_disabled = False

        # ====================================================
        # OTHER PAID PLAN
        # ====================================================

        else:

            cta_label = "Upgrade"

            cta_disabled = False

        # ----------------------------------------------------
        # Serialize
        # ----------------------------------------------------

        payload = PlanReadSerializer(
            plan
        ).data

        payload["is_current"] = is_current

        payload["cta"] = {
            "label": cta_label,
            "disabled": cta_disabled,
        }

        data.append(payload)

    # ========================================================
    # 12. RETURN
    # ========================================================

    return Response(
        {
            "count": len(data),

            "plans": data,

            "subscription": {
                "has_subscription": True,

                "is_free": is_free_plan,

                "is_active": is_active,

                "is_expired": is_expired,

                "plan_id": current_plan.id,

                "plan_name": current_plan.name,
            },
        },
        status=status.HTTP_200_OK,
    )