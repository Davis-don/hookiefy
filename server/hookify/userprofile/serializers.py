from rest_framework import serializers
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the UserProfile model.
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    age = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id',
            'user',
            'user_email',
            'user_full_name',
            'bio',
            'country',
            'county',
            'city',
            'date_of_birth',
            'age',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'age']