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


# ============================================
# COMPREHENSIVE USER FULL DATA VIEW
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user_full_data(request):
    """
    Get ALL data for the currently logged in user in one response:
    - Account details (id, email, role, name, phone, gender, profile image, is_active, etc.)
    - Profile details (bio, country, county, city, date_of_birth, age)
    - Preferences (interested_in_gender, minimum_age, maximum_age)
    - Assignment info (for users with role 'user')
    """
    user = request.user
    
    # --- 1. ACCOUNT DATA ---
    account_data = {
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
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }
    
    # --- 2. PROFILE DATA ---
    profile_data = None
    if user.role == 'user':
        try:
            profile = UserProfile.objects.get(user=user)
            profile_data = {
                "bio": profile.bio,
                "country": profile.country,
                "county": profile.county,
                "city": profile.city,
                "date_of_birth": profile.date_of_birth,
                "age": profile.age,  # Using the property from UserProfile model
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
            }
        except UserProfile.DoesNotExist:
            profile_data = None
    else:
        # Non-user roles don't have profiles
        profile_data = {
            "message": f"Profile not available for users with role '{user.role}'"
        }
    
    # --- 3. PREFERENCE DATA ---
    preference_data = None
    if user.role == 'user':
        try:
            preference = Preference.objects.get(user=user)
            preference_data = {
                "interested_in_gender": preference.interested_in_gender,
                "interested_in_gender_display": preference.get_interested_in_gender_display() if preference.interested_in_gender else None,
                "minimum_age": preference.minimum_age,
                "maximum_age": preference.maximum_age,
                "created_at": preference.created_at,
                "updated_at": preference.updated_at,
            }
        except Preference.DoesNotExist:
            preference_data = None
    else:
        # Non-user roles don't have preferences
        preference_data = {
            "message": f"Preferences not available for users with role '{user.role}'"
        }
    
    # --- 4. ASSIGNMENT DATA (only for users with role 'user') ---
    assignment_data = None
    if user.role == 'user':
        try:
            assignment = ClientAssignment.objects.get(user=user)
            assignment_data = {
                "assigned_to_id": assignment.assigned_admin.id,
                "assigned_to_email": assignment.assigned_admin.email,
                "assigned_to_name": assignment.assigned_admin.full_name,
                "assigned_to_role": assignment.assigned_admin.role,
                "assigned_at": assignment.assigned_at,
            }
        except ClientAssignment.DoesNotExist:
            assignment_data = None
    else:
        assignment_data = {
            "message": f"Assignment not available for users with role '{user.role}'"
        }
    
    # --- 5. BUILD COMPLETE RESPONSE ---
    response_data = {
        "message": "User full data fetched successfully",
        "data": {
            "account": account_data,
            "profile": profile_data,
            "preference": preference_data,
            "assignment": assignment_data,
        }
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


# ============================================
# GET USER FULL DATA BY ID
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_full_data_by_id(request, user_id):
    """
    Get ALL data for a specific user by ID in one response:
    - Account details (id, email, role, name, phone, gender, profile image, is_active, etc.)
    - Profile details (bio, country, county, city, date_of_birth, age)
    - Preferences (interested_in_gender, minimum_age, maximum_age)
    - Assignment info (for users with role 'user')
    
    This is the same as get_current_user_full_data but for any user ID.
    """
    
    # Try to find the target user
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"message": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # --- 1. ACCOUNT DATA ---
    account_data = {
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
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }
    
    # --- 2. PROFILE DATA ---
    profile_data = None
    if user.role == 'user':
        try:
            profile = UserProfile.objects.get(user=user)
            profile_data = {
                "bio": profile.bio,
                "country": profile.country,
                "county": profile.county,
                "city": profile.city,
                "date_of_birth": profile.date_of_birth,
                "age": profile.age,  # Using the property from UserProfile model
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
            }
        except UserProfile.DoesNotExist:
            profile_data = None
    else:
        # Non-user roles don't have profiles
        profile_data = {
            "message": f"Profile not available for users with role '{user.role}'"
        }
    
    # --- 3. PREFERENCE DATA ---
    preference_data = None
    if user.role == 'user':
        try:
            preference = Preference.objects.get(user=user)
            preference_data = {
                "interested_in_gender": preference.interested_in_gender,
                "interested_in_gender_display": preference.get_interested_in_gender_display() if preference.interested_in_gender else None,
                "minimum_age": preference.minimum_age,
                "maximum_age": preference.maximum_age,
                "created_at": preference.created_at,
                "updated_at": preference.updated_at,
            }
        except Preference.DoesNotExist:
            preference_data = None
    else:
        # Non-user roles don't have preferences
        preference_data = {
            "message": f"Preferences not available for users with role '{user.role}'"
        }
    
    # --- 4. ASSIGNMENT DATA (only for users with role 'user') ---
    assignment_data = None
    if user.role == 'user':
        try:
            assignment = ClientAssignment.objects.get(user=user)
            assignment_data = {
                "assigned_to_id": assignment.assigned_admin.id,
                "assigned_to_email": assignment.assigned_admin.email,
                "assigned_to_name": assignment.assigned_admin.full_name,
                "assigned_to_role": assignment.assigned_admin.role,
                "assigned_at": assignment.assigned_at,
            }
        except ClientAssignment.DoesNotExist:
            assignment_data = None
    else:
        assignment_data = {
            "message": f"Assignment not available for users with role '{user.role}'"
        }
    
    # --- 5. BUILD COMPLETE RESPONSE ---
    response_data = {
        "message": "User full data fetched successfully",
        "data": {
            "account": account_data,
            "profile": profile_data,
            "preference": preference_data,
            "assignment": assignment_data,
        }
    }
    
    return Response(response_data, status=status.HTTP_200_OK)

# ============================================
# SEARCH USERS BY NAME
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users_by_name(request):
    """
    Search for users by name (first_name, last_name, or full_name property).
    Returns a list of users with id, profile_image_url, full_name, and location.
    
    Query Parameters:
    - q: Search query string (required)
    - limit: Maximum number of results (optional, default: 20)
    """
    
    # Get the search query from request
    search_query = request.query_params.get('q', '').strip()
    
    if not search_query:
        return Response(
            {"message": "Search query parameter 'q' is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get limit from request (default: 20)
    try:
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)  # Cap at 100 max
    except ValueError:
        limit = 20
    
    from django.db import models
    
    # Split the search query into words
    search_words = search_query.split()
    
    # Build the search query using Q objects
    q_objects = models.Q()
    
    # For each word in the search query
    for word in search_words:
        # Search in first_name and last_name only (these are actual database fields)
        q_objects |= models.Q(first_name__icontains=word)
        q_objects |= models.Q(last_name__icontains=word)
    
    # If it's a single character or short word, also search for exact matches at start
    if len(search_query) <= 2:
        q_objects |= models.Q(first_name__istartswith=search_query)
        q_objects |= models.Q(last_name__istartswith=search_query)
    
    # Execute the search
    users = User.objects.filter(
        q_objects
    ).exclude(
        id=request.user.id
    ).exclude(
        role='admin'
    ).distinct()[:limit]
    
    # Build the response with only the needed fields
    results = []
    for user in users:
        # Get location from profile if exists
        location = None
        city = None
        county = None
        country = None
        
        if user.role == 'user':
            try:
                profile = UserProfile.objects.get(user=user)
                city = profile.city
                county = profile.county
                country = profile.country
                
                # Build location string
                location_parts = []
                if city:
                    location_parts.append(city)
                if county:
                    location_parts.append(county)
                if country:
                    location_parts.append(country)
                
                location = ', '.join(location_parts) if location_parts else None
            except UserProfile.DoesNotExist:
                pass
        
        # Use the full_name property from the model
        results.append({
            "id": str(user.id),
            "full_name": user.full_name,
            "profile_image_url": user.profile_image_url,
            "location": location,
            "city": city,
            "county": county,
            "country": country,
        })
    
    return Response({
        "message": f"Found {len(results)} users matching '{search_query}'",
        "count": len(results),
        "query": search_query,
        "results": results
    }, status=status.HTTP_200_OK)