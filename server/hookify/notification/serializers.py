from rest_framework import serializers
from .models import Notification
from account.serializers import UserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    sender = serializers.SerializerMethodField()
    receiver = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'title',
            'message',
            'notification_type',
            'notification_type_display',
            'is_read',
            'read_at',
            'created_at',
            'sender',
            'receiver'
        ]
    
    def get_sender(self, obj):
        if obj.connection and obj.connection.sender:
            return {
                'id': obj.connection.sender.id,
                'email': obj.connection.sender.email,
                'full_name': obj.connection.sender.full_name,
                'profile_image_url': obj.connection.sender.profile_image_url,
            }
        return None
    
    def get_receiver(self, obj):
        if obj.connection and obj.connection.receiver:
            return {
                'id': obj.connection.receiver.id,
                'email': obj.connection.receiver.email,
                'full_name': obj.connection.receiver.full_name,
                'profile_image_url': obj.connection.receiver.profile_image_url,
            }
        return None