from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserProfile
from .serializers import UserProfileSerializer

User = get_user_model()


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