from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from django.db.models import Q, Case, When, Value, IntegerField
from accounts.models import ClientProfile
from clientbio.models import Bio
from hookup.models import Hookup

from .serializers import AllProfilesSerializer, SingleProfileSerializer

import logging

logger = logging.getLogger(__name__)


# =========================
# PAGINATION
# =========================
class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_query_param = 'page'


# =========================
# ALL PROFILES (🔥 SMART MATCHING)
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_profiles(request):
    current_user = request.user

    # Ensure user is a client
    if not hasattr(current_user, "client_profile"):
        return Response({"error": "Only clients can access profiles"}, status=403)

    current_client = current_user.client_profile

    # =========================
    # GET CURRENT USER LOCATION
    # =========================
    current_bio = Bio.objects.filter(client_profile=current_client).first()

    current_country = current_bio.country if current_bio else None
    current_county = current_bio.county if current_bio else None

    # =========================
    # EXCLUDE USERS WITH EXISTING HOOKUPS 🔥
    # =========================
    existing_connections = Hookup.objects.filter(
        Q(sender=current_client) | Q(receiver=current_client)
    ).values_list('sender_id', 'receiver_id')

    excluded_ids = set()

    for sender_id, receiver_id in existing_connections:
        excluded_ids.add(sender_id)
        excluded_ids.add(receiver_id)

    # Remove self if present
    excluded_ids.discard(current_client.id)

    # =========================
    # BASE QUERYSET
    # =========================
    profiles = ClientProfile.objects.filter(
        is_deleted=False
    ).exclude(
        id__in=excluded_ids
    ).exclude(
        user=current_user
    ).select_related(
        "user"
    ).prefetch_related(
        "bio"
    )

    # =========================
    # FILTER: MUST HAVE CONTACT INFO 📞
    # =========================
    profiles = profiles.filter(
        bio__phone_number__isnull=False
    ).exclude(
        bio__phone_number=""
    )

    # Also ensure email exists
    profiles = profiles.exclude(
        user__email__isnull=True
    ).exclude(
        user__email=""
    )

    # =========================
    # ORDERING LOGIC 🎯
    # =========================
    if current_country and current_county:
        profiles = profiles.annotate(
            priority=Case(
                # SAME COUNTRY + COUNTY
                When(
                    Q(bio__country=current_country) & Q(bio__county=current_county),
                    then=Value(1)
                ),
                # SAME COUNTRY
                When(
                    Q(bio__country=current_country),
                    then=Value(2)
                ),
                # OTHERS
                default=Value(3),
                output_field=IntegerField()
            )
        ).order_by("priority", "-user__date_joined")

    elif current_country:
        profiles = profiles.annotate(
            priority=Case(
                When(
                    Q(bio__country=current_country),
                    then=Value(1)
                ),
                default=Value(2),
                output_field=IntegerField()
            )
        ).order_by("priority", "-user__date_joined")

    else:
        profiles = profiles.order_by("-user__date_joined")

    # =========================
    # PAGINATION
    # =========================
    paginator = CustomPagination()
    paginated = paginator.paginate_queryset(profiles, request)

    serializer = AllProfilesSerializer(
        paginated,
        many=True,
        context={"request": request}
    )

    return paginator.get_paginated_response(serializer.data)


# =========================
# SINGLE PROFILE
# =========================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile_by_id(request, profile_id):
    try:
        profile = ClientProfile.objects.filter(
            is_deleted=False
        ).select_related(
            "user"
        ).prefetch_related(
            "bio"
        ).get(id=profile_id)

        serializer = SingleProfileSerializer(
            profile,
            context={"request": request}
        )

        return Response(serializer.data)

    except ClientProfile.DoesNotExist:
        return Response(
            {"error": "Profile not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return Response(
            {"error": "Something went wrong"},
            status=500
        )