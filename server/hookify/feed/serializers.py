from rest_framework import serializers
from account.models import Accounts
from userpreference.models import Preference
# Import your actual UserProfile model from the userprofile app here
from userprofile.models import UserProfile 

class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preference
        fields = ['interested_in_gender', 'minimum_age', 'maximum_age']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        # Using the correct imported model name
        model = UserProfile 
        fields = ['city', 'county', 'country'] 

class UserFeedSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    preference = PreferenceSerializer(read_only=True)
    full_name = serializers.ReadOnlyField() 

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
            'profile', 
            'preference'
        ]