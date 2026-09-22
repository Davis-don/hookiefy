from rest_framework import serializers
from .models import PlatformConfig


class PlatformConfigSerializer(serializers.ModelSerializer):
    currency = serializers.SerializerMethodField()

    class Meta:
        model = PlatformConfig
        fields = [
            "id",
            "connection_fee",
            "currency",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "currency",
            "created_at",
            "updated_at",
        ]

    def get_currency(self, obj):
        return "KES"

    def validate_connection_fee(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Connection fee cannot be negative."
            )

        return value


class PlatformConfigCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = PlatformConfig
        fields = [
            "connection_fee",
        ]

    def validate_connection_fee(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Connection fee cannot be negative."
            )

        return value


class PlatformConfigUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = PlatformConfig
        fields = [
            "connection_fee",
        ]

    def validate_connection_fee(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Connection fee cannot be negative."
            )

        return value