# paystack/serializers.py
# ============================================================
# Paystack Serializers
# ============================================================

from rest_framework import serializers
from .models import PaystackTransaction

class PaystackTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaystackTransaction
        fields = [
            'reference',
            'amount',
            'currency',
            'email',
            'status',
            'paystack_data',
            'metadata',
            'payment_id',
            'created_at',
            'updated_at',
            'paid_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

class InitiatePaymentSerializer(serializers.Serializer):
    connection_id = serializers.CharField(required=True)
    phone_number = serializers.CharField(required=True)
    email = serializers.EmailField(required=False)

class VerifyPaymentSerializer(serializers.Serializer):
    reference = serializers.CharField(required=True)