from rest_framework import serializers
from account.models import Accounts
from userpreference.models import Preference
from userprofile.models import UserProfile

class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = ['interested_in_gender', 'minimum_age', 'maximum_age']

class UserProfileSerializer(serializers.ModelSerializer):
    """
    UserProfile serializer that includes bio field
    """
    age = serializers.IntegerField(read_only=True, allow_null=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'bio',          # The user's bio - this is the caption
            'city', 
            'county', 
            'country',
            'age',
            'date_of_birth',
            'created_at',
            'updated_at',
        ]

class UserFeedSerializer(serializers.ModelSerializer):
    """
    UserFeed serializer that includes complete profile and preference data
    including the bio field from UserProfile
    """
    profile = UserProfileSerializer(read_only=True)
    preference = PreferenceSerializer(read_only=True)
    full_name = serializers.ReadOnlyField()
    location_score = serializers.IntegerField(read_only=True, required=False, allow_null=True)

    class Meta:
        model = Accounts
        fields = [
            'id', 
            'email', 
            'full_name', 
            'role', 
            'gender', 
            'phone_number', 
            'profile_image_url', 
            'profile_image_public_id',
            'profile',  # This now includes bio
            'preference',
            'location_score',
        ]

    def to_representation(self, instance):
        """
        Customize the representation to ensure bio is properly displayed
        """
        data = super().to_representation(instance)
        
        # Ensure profile data is present with bio
        if 'profile' in data and data['profile']:
            if 'bio' not in data['profile']:
                data['profile']['bio'] = None
        else:
            data['profile'] = {
                'bio': None,
                'city': None,
                'county': None,
                'country': None,
                'age': None,
            }
            
        return data