from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Case, When, Value, IntegerField, F
from django.db import connection
from accounts.models import ClientProfile, User
from clientbio.models import Bio
from .serializers import AllProfilesSerializer
import logging

logger = logging.getLogger(__name__)

class CustomPagination(PageNumberPagination):
    """
    Custom pagination class for profiles with 10 items per page
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_query_param = 'page'

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_profiles(request):
    """
    Endpoint to get all client profiles except the current user.
    Ordering logic:
    1. Same country AND same county as current user (highest priority)
    2. Same country only (medium priority)
    3. All other clients (lowest priority)
    
    Results are paginated with 10 items per page.
    """
    current_user = request.user
    
    # Only authenticated users can access this endpoint
    # Can be clients, admins, or superadmins
    
    # Get all client profiles that are not deleted and not the current user
    client_profiles = ClientProfile.objects.filter(
        is_deleted=False
    ).exclude(
        user=current_user
    ).select_related(
        'user'
    ).prefetch_related(
        'bio'
    )
    
    # Get current user's bio for location matching
    current_bio = None
    current_country = None
    current_county = None
    
    try:
        # Try to get bio for current user if they have one
        if hasattr(current_user, 'client_profile'):
            current_bio = Bio.objects.filter(
                client_profile=current_user.client_profile
            ).first()
            if current_bio:
                current_country = current_bio.country
                current_county = current_bio.county
    except Exception as e:
        logger.warning(f"Could not get current user bio: {e}")
    
    # Build annotation for ordering
    # Create ordering weights
    ordering_cases = []
    
    # Check if current user has location info
    if current_country and current_county:
        # Priority 1: Same country AND same county
        ordering_cases.append(
            When(
                Q(bio__country=current_country) & Q(bio__county=current_county),
                then=Value(1)
            )
        )
        # Priority 2: Same country only
        ordering_cases.append(
            When(
                Q(bio__country=current_country) & ~Q(bio__county=current_county),
                then=Value(2)
            )
        )
        # Priority 3: Everything else
        ordering_cases.append(
            When(
                Q(bio__country__isnull=False),
                then=Value(3)
            )
        )
        ordering_cases.append(
            When(
                Q(bio__country__isnull=True),
                then=Value(4)
            )
        )
        
        # Annotate with ordering priority
        client_profiles = client_profiles.annotate(
            order_priority=Case(
                *ordering_cases,
                default=Value(4),
                output_field=IntegerField()
            )
        )
        
        # Order by priority, then by creation date (newest first)
        client_profiles = client_profiles.order_by(
            'order_priority',
            '-user__date_joined'
        )
    else:
        # If current user has no bio, order by creation date only
        client_profiles = client_profiles.order_by(
            '-user__date_joined'
        )
    
    # Apply pagination
    paginator = CustomPagination()
    paginated_profiles = paginator.paginate_queryset(client_profiles, request)
    
    # Serialize the data
    serializer = AllProfilesSerializer(paginated_profiles, many=True, context={'request': request})
    
    # Return paginated response
    return paginator.get_paginated_response(serializer.data)