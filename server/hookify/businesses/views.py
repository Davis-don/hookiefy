from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Businesses
from .serializers import (
    BusinessSerializer,
    BusinessCreateSerializer,
    BusinessUpdateSerializer,
)


# ============================================================
# CREATE — POST /businesses/create/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_business(request):
    serializer = BusinessCreateSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    business = serializer.save()

    return Response(
        {
            "message": "Business created successfully.",
            "business": BusinessSerializer(business).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# LIST MINE — GET /businesses/mine/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_my_businesses(request):
    """
    List every business owned by the authenticated user,
    regardless of status.

    Optional query params:
        ?status=active|paused|draft|closed|suspended
    """

    qs = (
        Businesses.objects
        .filter(owner=request.user)
        .order_by("-created_at")
    )

    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    serializer = BusinessSerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LIST ALL — GET /businesses/all/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_all_businesses(request):
    """
    Public marketplace listing. By default, only ACTIVE businesses
    are returned. Pass ?status=... to override, or ?status=all to
    see every status.

    Optional query params:
        ?category=goods|services
        ?county=Nairobi
        ?region=Kasuku
        ?status=active|paused|draft|closed|suspended|all
    """

    qs = Businesses.objects.all().order_by("-created_at")

    status_filter = request.query_params.get("status", "active")
    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)

    category = request.query_params.get("category")
    county = request.query_params.get("county")
    region = request.query_params.get("region")

    if category:
        qs = qs.filter(business_category=category)
    if county:
        qs = qs.filter(county__iexact=county)
    if region:
        qs = qs.filter(region__iexact=region)

    serializer = BusinessSerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RETRIEVE — GET /businesses/<id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_business(request, business_id):
    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        BusinessSerializer(business).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE — PATCH/PUT /businesses/<id>/update/
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_business(request, business_id):
    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = BusinessUpdateSerializer(
        business,
        data=request.data,
        partial=(request.method == "PATCH"),
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    business = serializer.save()

    return Response(
        {
            "message": "Business updated successfully.",
            "business": BusinessSerializer(business).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE STATUS — PATCH /businesses/<id>/status/
# ============================================================

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_business_status(request, business_id):
    """
    Change only the status of a business owned by the user.
    Body: { "status": "active" | "paused" | "draft" | "closed" | "suspended" }
    """

    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    new_status = request.data.get("status")

    valid = {choice[0] for choice in Businesses.STATUS_CHOICES}
    if new_status not in valid:
        return Response(
            {"message": f"Status must be one of: {', '.join(sorted(valid))}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    business.status = new_status
    business.save(update_fields=["status", "updated_at"])

    return Response(
        {
            "message": "Business status updated.",
            "business": BusinessSerializer(business).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE — DELETE /businesses/<id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_business(request, business_id):
    business = (
        Businesses.objects
        .filter(id=business_id, owner=request.user)
        .first()
    )

    if business is None:
        return Response(
            {"message": "Business not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    business.delete()

    return Response(
        {"message": "Business deleted successfully."},
        status=status.HTTP_200_OK,
    )