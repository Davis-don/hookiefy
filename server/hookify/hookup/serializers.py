from rest_framework import serializers
from .models import Hookup
from accounts.models import ClientProfile


class CreateHookupSerializer(serializers.Serializer):
    """Simple serializer that only requires receiver_id"""
    receiver_id = serializers.IntegerField()
    
    def validate_receiver_id(self, value):
        """Validate that the receiver client exists"""
        try:
            receiver = ClientProfile.objects.get(id=value)
            return receiver
        except ClientProfile.DoesNotExist:
            raise serializers.ValidationError("Receiver client does not exist")
    
    def validate(self, data):
        """Additional validations"""
        receiver = data.get('receiver_id')
        sender = self.context.get('sender')
        
        if not sender:
            raise serializers.ValidationError("Sender client not found")
        
        # Check if sender and receiver are the same
        if sender.id == receiver.id:
            raise serializers.ValidationError("You cannot send a hookup request to yourself")
        
        # Check if there's already a pending hookup
        existing_pending = Hookup.objects.filter(
            sender=sender,
            receiver=receiver,
            status='pending'
        ).exists()
        
        if existing_pending:
            raise serializers.ValidationError(
                "A pending hookup request already exists between you and this client"
            )
        
        return data


class HookupResponseSerializer(serializers.ModelSerializer):
    """Serializer for returning hookup data"""
    sender_email = serializers.EmailField(source='sender.user.email', read_only=True)
    receiver_email = serializers.EmailField(source='receiver.user.email', read_only=True)
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Hookup
        fields = [
            'id',
            'sender',
            'receiver',
            'sender_email',
            'receiver_email',
            'sender_name',
            'receiver_name',
            'status',
            'payment_status',
            'responded_at',
            'paid_at',
            'created_at',
            'updated_at'
        ]
    
    def get_sender_name(self, obj):
        return f"{obj.sender.user.first_name} {obj.sender.user.last_name}".strip()
    
    def get_receiver_name(self, obj):
        return f"{obj.receiver.user.first_name} {obj.receiver.user.last_name}".strip()