from rest_framework import serializers


class PaymentSerializer(serializers.Serializer):
    hookup_id = serializers.IntegerField()