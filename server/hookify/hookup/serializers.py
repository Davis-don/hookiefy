from rest_framework import serializers
from .models import Hookup
from accounts.models import ClientProfile


# =========================
# CREATE HOOKUP SERIALIZER
# =========================
class CreateHookupSerializer(serializers.Serializer):
    receiver_id = serializers.IntegerField()
    message = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(required=False, allow_blank=True)
    scheduled_time = serializers.DateTimeField(required=False)

    def validate_receiver_id(self, value):
        try:
            return ClientProfile.objects.get(id=value)
        except ClientProfile.DoesNotExist:
            raise serializers.ValidationError("Receiver not found")

    def validate(self, data):
        sender = self.context.get("sender")
        receiver = data.get("receiver_id")

        if not sender:
            raise serializers.ValidationError("Sender not found")

        if sender == receiver:
            raise serializers.ValidationError("You cannot hookup with yourself")

        if Hookup.objects.filter(
            sender=sender,
            receiver=receiver,
            status="pending"
        ).exists():
            raise serializers.ValidationError(
                "A pending hookup already exists"
            )

        return data


# =========================
# RESPONSE SERIALIZER
# =========================
class HookupResponseSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    is_read_by_current_user = serializers.SerializerMethodField()
    is_paid = serializers.BooleanField(read_only=True)  # Remove source='is_paid'

    class Meta:
        model = Hookup
        fields = [
            'id',
            'sender',
            'receiver',
            'sender_name',
            'receiver_name',
            'status',
            'is_paid',  # This will use the property from the model
            'payment_status',
            'message',
            'location',
            'scheduled_time',
            'is_read_by_sender',
            'is_read_by_receiver',
            'is_read_by_current_user',
            'created_at',
            'responded_at',
            'paid_at',
        ]

    def get_sender_name(self, obj):
        first_name = obj.sender.user.first_name or ''
        last_name = obj.sender.user.last_name or ''
        full_name = f"{first_name} {last_name}".strip()
        return full_name if full_name else "User"

    def get_receiver_name(self, obj):
        first_name = obj.receiver.user.first_name or ''
        last_name = obj.receiver.user.last_name or ''
        full_name = f"{first_name} {last_name}".strip()
        return full_name if full_name else "User"

    def get_is_read_by_current_user(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            client = getattr(request.user, 'client_profile', None)
            if client:
                if obj.sender == client:
                    return obj.is_read_by_sender
                elif obj.receiver == client:
                    return obj.is_read_by_receiver
        return False