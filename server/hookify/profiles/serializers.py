from rest_framework import serializers
from accounts.models import ClientProfile, User
from clientbio.models import Bio


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for User model fields needed in profile
    """
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email']


class BioSerializer(serializers.ModelSerializer):
    """
    Serializer for Bio model with all relevant fields
    """
    class Meta:
        model = Bio
        fields = [
            'age', 'gender', 'country', 'county', 'location_desc',
            'info', 'phone_number', 'occupation', 'interests',
            'uploaded_img', 'is_verified', 'created_at', 'updated_at'
        ]


class AllProfilesSerializer(serializers.ModelSerializer):
    """
    Serializer for ClientProfile to return comprehensive profile data
    Includes user data and bio data
    """
    user = UserProfileSerializer(read_only=True)
    bio = BioSerializer(read_only=True)
    
    # Add computed fields
    full_name = serializers.SerializerMethodField()
    has_image = serializers.SerializerMethodField()
    has_bio = serializers.SerializerMethodField()
    profile_completion_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientProfile
        fields = [
            'id', 'user', 'bio', 'full_name', 'has_image', 'has_bio',
            'profile_completion_percentage', 'created_at', 'updated_at'
        ]
    
    def get_full_name(self, obj):
        """Get user's full name"""
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    
    def get_has_image(self, obj):
        """Check if user has uploaded an image"""
        if hasattr(obj, 'bio') and obj.bio:
            return bool(obj.bio.uploaded_img)
        return False
    
    def get_has_bio(self, obj):
        """Check if user has filled out bio info"""
        if hasattr(obj, 'bio') and obj.bio:
            return bool(obj.bio.info and obj.bio.info.strip())
        return False
    
    def get_profile_completion_percentage(self, obj):
        """
        Calculate profile completion percentage based on filled fields
        """
        if not hasattr(obj, 'bio') or not obj.bio:
            return 0
        
        bio = obj.bio
        
        # Define required fields and their weights
        field_weights = {
            'age': 10,
            'gender': 10,
            'country': 10,
            'county': 10,
            'location_desc': 15,
            'info': 20,
            'uploaded_img': 15,
            'occupation': 5,
            'interests': 5,
        }
        
        total_weight = sum(field_weights.values())
        completed_weight = 0
        
        # Check each field
        if bio.age:
            completed_weight += field_weights['age']
        if bio.gender:
            completed_weight += field_weights['gender']
        if bio.country:
            completed_weight += field_weights['country']
        if bio.county:
            completed_weight += field_weights['county']
        if bio.location_desc:
            completed_weight += field_weights['location_desc']
        if bio.info and bio.info.strip():
            completed_weight += field_weights['info']
        if bio.uploaded_img:
            completed_weight += field_weights['uploaded_img']
        if bio.occupation:
            completed_weight += field_weights['occupation']
        if bio.interests:
            completed_weight += field_weights['interests']
        
        return int((completed_weight / total_weight) * 100)