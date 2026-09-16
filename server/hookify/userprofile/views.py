from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserProfile
from .serializers import UserProfileSerializer
from userpreference.models import Preference
from assignments.models import ClientAssignment

User = get_user_model()

# ============================================
# PROFILE VIEWS
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_update_profile(request):
    """
    Create or update the profile for the currently authenticated user.
    Only users with role 'user' can have a profile.
    """
    user = request.user
    
    # Check if user has role 'user'
    if user.role != 'user':
        return Response(
            {"message": "Only users with role 'user' can have a profile."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create the user's profile
    profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Update profile fields from request data
    bio = request.data.get('bio')
    country = request.data.get('country')
    county = request.data.get('county')
    city = request.data.get('city')
    date_of_birth = request.data.get('date_of_birth')
    
    if bio is not None:
        profile.bio = bio
    if country is not None:
        profile.country = country
    if county is not None:
        profile.county = county
    if city is not None:
        profile.city = city
    if date_of_birth is not None:
        profile.date_of_birth = date_of_birth
    
    profile.save()
    
    # Serialize and return the profile data
    serializer = UserProfileSerializer(profile)
    
    return Response({
        "message": "Profile updated successfully" if not created else "Profile created successfully",
        "data": serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """
    Get the profile of the currently authenticated user.
    Only users with role 'user' have profiles.
    """
    user = request.user
    
    # Check if user has role 'user'
    if user.role != 'user':
        return Response(
            {"message": "Only users with role 'user' have profiles."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get the user's profile
        profile = UserProfile.objects.get(user=user)
        
        # Serialize and return the profile data
        serializer = UserProfileSerializer(profile)
        
        return Response({
            "message": "Profile fetched successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {"message": "Profile not found. Please create one first."},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_profile(request):
    """
    Check if the currently authenticated user has a profile.
    Returns true if profile exists, false otherwise.
    """
    user = request.user
    
    # Check if user has role 'user'
    if user.role != 'user':
        return Response(
            {"has_profile": False, "message": "Only users with role 'user' can have profiles."},
            status=status.HTTP_200_OK
        )
    
    # Check if profile exists
    profile_exists = UserProfile.objects.filter(user=user).exists()
    
    return Response({
        "has_profile": profile_exists,
        "message": "Profile status checked successfully"
    }, status=status.HTTP_200_OK)


# userprofile/views.py

from django.contrib.auth import get_user_model
from django.db import models

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import UserProfile
from .serializers import UserProfileSerializer

User = get_user_model()


# ============================================================
# HELPER — SERIALIZE ACCOUNT DATA
# ============================================================

def build_account_data(user):
    """
    Return the public account payload for a user.
    Shared by the full-data endpoints.
    """

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "gender": user.gender,
        "profile_image_url": user.profile_image_url,
        "profile_image_public_id": user.profile_image_public_id,
        "has_profile_image": user.has_profile_image,
        "auth_provider": user.auth_provider,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }


# ============================================================
# HELPER — SERIALIZE PROFILE DATA
# ============================================================

def build_profile_data(user):
    """
    Return the profile payload for a user, or None if
    the user has no profile yet.
    """

    try:

        profile = UserProfile.objects.get(user=user)

    except UserProfile.DoesNotExist:

        return None

    return {
        "bio": profile.bio,
        "country": profile.country,
        "county": profile.county,
        "city": profile.city,
        "date_of_birth": profile.date_of_birth,
        "age": profile.age,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


# ============================================================
# CREATE OR UPDATE PROFILE
# ============================================================

@api_view(["POST", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def create_or_update_profile(request):
    """
    Create or update the profile for the currently
    authenticated user.

    Request body (all fields optional):
        {
            "bio": "...",
            "country": "Kenya",
            "county": "Nairobi",
            "city": "Westlands",
            "date_of_birth": "1995-06-12"
        }

    Response:
        {
            "message": "Profile updated successfully",
            "data": { ...serialized profile... }
        }
    """

    user = request.user

    if not user.is_active:

        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get or create the profile
    profile, created = UserProfile.objects.get_or_create(
        user=user
    )

    serializer = UserProfileSerializer(
        instance=profile,
        data=request.data,
        partial=True,
    )

    if not serializer.is_valid():

        return Response(
            {
                "message": "Validation failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer.save()

    return Response(
        {
            "message": (
                "Profile created successfully."
                if created
                else "Profile updated successfully."
            ),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# GET MY PROFILE
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """
    Return the profile of the currently authenticated user.

    Response:
        {
            "message": "Profile fetched successfully",
            "data": { ...serialized profile... }
        }

    404 if the user has no profile yet.
    """

    user = request.user

    if not user.is_active:

        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:

        profile = UserProfile.objects.get(user=user)

    except UserProfile.DoesNotExist:

        return Response(
            {
                "message": (
                    "Profile not found. Please create one first."
                ),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = UserProfileSerializer(profile)

    return Response(
        {
            "message": "Profile fetched successfully",
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# HAS PROFILE
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def has_profile(request):
    """
    Return whether the authenticated user has a profile.

    Response:
        {
            "has_profile": true|false
        }
    """

    user = request.user

    if not user.is_active:

        return Response(
            {
                "has_profile": False,
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    profile_exists = UserProfile.objects.filter(
        user=user
    ).exists()

    return Response(
        {
            "has_profile": profile_exists,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# GET CURRENT USER FULL DATA
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user_full_data(request):
    """
    Return ALL data for the currently authenticated user:

        - account: the user's account details
        - profile: the user's profile (or null)

    Response:
        {
            "message": "...",
            "data": {
                "account": { ... },
                "profile": { ... } | null
            }
        }
    """

    user = request.user

    if not user.is_active:

        return Response(
            {"message": "This account is inactive."},
            status=status.HTTP_403_FORBIDDEN,
        )

    response_data = {
        "message": "User full data fetched successfully",
        "data": {
            "account": build_account_data(user),
            "profile": build_profile_data(user),
        },
    }

    return Response(response_data, status=status.HTTP_200_OK)


# ============================================================
# GET USER FULL DATA BY ID
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_full_data_by_id(request, user_id):
    """
    Return ALL data for a specific user by ID:

        - account: the target user's account details
        - profile: the target user's profile (or null)

    404 if the user does not exist.
    """

    try:

        user = User.objects.get(id=user_id)

    except User.DoesNotExist:

        return Response(
            {"message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    response_data = {
        "message": "User full data fetched successfully",
        "data": {
            "account": build_account_data(user),
            "profile": build_profile_data(user),
        },
    }

    return Response(response_data, status=status.HTTP_200_OK)


# ============================================================
# SEARCH USERS BY NAME
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_users_by_name(request):
    """
    Search users by first_name / last_name.

    Query parameters:
        q      — required search string
        limit  — optional, default 20, max 100

    Response:
        {
            "message": "Found N users matching '...'",
            "count": N,
            "query": "...",
            "results": [
                {
                    "id": 12,
                    "full_name": "Brian Kamau",
                    "profile_image_url": "https://...",
                    "location": "Westlands, Nairobi, Kenya",
                    "city": "Westlands",
                    "county": "Nairobi",
                    "country": "Kenya"
                },
                ...
            ]
        }
    """

    search_query = request.query_params.get("q", "").strip()

    if not search_query:

        return Response(
            {"message": "Search query parameter 'q' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Parse limit
    try:

        limit = int(request.query_params.get("limit", 20))
        limit = max(1, min(limit, 100))

    except (TypeError, ValueError):

        limit = 20

    # Build the search Q object — each word can match
    # first_name OR last_name.
    search_words = search_query.split()
    q_objects = models.Q()

    for word in search_words:

        q_objects |= models.Q(first_name__icontains=word)
        q_objects |= models.Q(last_name__icontains=word)

    # For very short queries, also match starts-with.
    if len(search_query) <= 2:

        q_objects |= models.Q(first_name__istartswith=search_query)
        q_objects |= models.Q(last_name__istartswith=search_query)

    users = (
        User.objects
        .filter(q_objects)
        .exclude(id=request.user.id)
        .distinct()[:limit]
    )

    results = []

    for user in users:

        # Pull location from the profile if it exists.
        city = None
        county = None
        country = None

        try:

            profile = UserProfile.objects.get(user=user)

            city = profile.city
            county = profile.county
            country = profile.country

        except UserProfile.DoesNotExist:

            pass

        location_parts = [
            part for part in (city, county, country) if part
        ]

        results.append(
            {
                "id": user.id,
                "full_name": user.full_name,
                "profile_image_url": user.profile_image_url,
                "location": (
                    ", ".join(location_parts)
                    if location_parts
                    else None
                ),
                "city": city,
                "county": county,
                "country": country,
            }
        )

    return Response(
        {
            "message": (
                f"Found {len(results)} users "
                f"matching '{search_query}'"
            ),
            "count": len(results),
            "query": search_query,
            "results": results,
        },
        status=status.HTTP_200_OK,
    )