from rest_framework import serializers

class PaymentInitiationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20, required=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        if value > 1000000:
            raise serializers.ValidationError("Amount exceeds maximum allowed")
        return value
    
    def validate_phone_number(self, value):
        # Basic phone validation - adjust based on your needs
        if not value.replace('+', '').replace('-', '').isdigit():
            raise serializers.ValidationError("Invalid phone number format")
        return value


class PaymentStatusSerializer(serializers.Serializer):
    order_tracking_id = serializers.CharField(max_length=100, required=True)