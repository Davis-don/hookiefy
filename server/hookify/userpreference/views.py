from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Preference
from .serializers import PreferenceSerializer

User = get_user_model()


# ============================================
# PREFERENCE VIEWS
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_update_preference(request):
    """
    Create or update the preferences for the currently authenticated user.
    Only users with role 'user' can have preferences.
    """
    user = request.user
    
    # Check if user has role 'user'
    if user.role != 'user':
        return Response(
            {"message": "Only users with role 'user' can have preferences."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create the user's preference
    preference, created = Preference.objects.get_or_create(user=user)
    
    # Update preference fields from request data
    interested_in_gender = request.data.get('interested_in_gender')
    minimum_age = request.data.get('minimum_age')
    maximum_age = request.data.get('maximum_age')
    
    # Validate gender preference
    if interested_in_gender is not None:
        valid_genders = ['M', 'F', 'A']
        if interested_in_gender not in valid_genders:
            return Response(
                {"message": f"Invalid gender preference. Must be one of: {', '.join(valid_genders)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        preference.interested_in_gender = interested_in_gender
    
    # Validate minimum age
    if minimum_age is not None:
        try:
            min_age = int(minimum_age)
            if min_age < 18:
                return Response(
                    {"message": "Minimum age must be at least 18."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            preference.minimum_age = min_age
        except (ValueError, TypeError):
            return Response(
                {"message": "Minimum age must be a valid number."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Validate maximum age
    if maximum_age is not None:
        try:
            max_age = int(maximum_age)
            if max_age < 18:
                return Response(
                    {"message": "Maximum age must be at least 18."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            preference.maximum_age = max_age
        except (ValueError, TypeError):
            return Response(
                {"message": "Maximum age must be a valid number."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Validate that minimum_age <= maximum_age if both are set
    if preference.minimum_age is not None and preference.maximum_age is not None:
        if preference.minimum_age > preference.maximum_age:
            return Response(
                {"message": "Minimum age cannot be greater than maximum age."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    preference.save()
    
    # Serialize and return the preference data
    serializer = PreferenceSerializer(preference)
    
    return Response({
        "message": "Preferences updated successfully" if not created else "Preferences created successfully",
        "data": serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preference(request):
    """
    Get the preferences of the currently authenticated user.
    Only users with role 'user' have preferences.
    """
    user = request.user
    
    # Check if user has role 'user'
    if user.role != 'user':
        return Response(
            {"message": "Only users with role 'user' have preferences."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get the user's preference
        preference = Preference.objects.get(user=user)
        
        # Serialize and return the preference data
        serializer = PreferenceSerializer(preference)
        
        return Response({
            "message": "Preferences fetched successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    except Preference.DoesNotExist:
        return Response(
            {"message": "Preferences not found. Please create one first."},
            status=status.HTTP_404_NOT_FOUND
        )