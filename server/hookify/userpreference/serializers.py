from rest_framework import serializers
from .models import Preference


class PreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for the Preference model.
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    interested_in_gender_display = serializers.CharField(
        source='get_interested_in_gender_display',
        read_only=True
    )
    
    class Meta:
        model = Preference
        fields = [
            'id',
            'user',
            'user_email',
            'user_full_name',
            'interested_in_gender',
            'interested_in_gender_display',
            'minimum_age',
            'maximum_age',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']