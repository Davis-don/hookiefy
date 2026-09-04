# adverts/serializers.py
from rest_framework import serializers
from .models import Advert


class AdvertSerializer(serializers.ModelSerializer):
    """Serializer for reading advert data"""
    
    class Meta:
        model = Advert
        fields = [
            'id', 'title', 'description', 'url', 
            'type', 'public_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdvertCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating adverts"""
    
    class Meta:
        model = Advert
        fields = ['title', 'description', 'url', 'type', 'public_id']
    
    def validate(self, data):
        """Validate that URL is provided for non-Cloudinary adverts"""
        url = data.get('url')
        public_id = data.get('public_id')
        media_type = data.get('type')
        
        # If no public_id (external URL), URL is required
        if not public_id and not url:
            raise serializers.ValidationError({
                "url": "URL is required when not using Cloudinary"
            })
        
        # Validate URL format if provided
        if url:
            if not url.startswith(('http://', 'https://')):
                raise serializers.ValidationError({
                    "url": "URL must start with http:// or https://"
                })
        
        return data
    
    def validate_type(self, value):
        """Validate media type"""
        if value not in ['image', 'video']:
            raise serializers.ValidationError(
                "Media type must be 'image' or 'video'"
            )
        return value