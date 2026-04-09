from rest_framework import serializers
from .models import ClientConfig


class ClientConfigSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.ReadOnlyField(source="updated_by.email")

    class Meta:
        model = ClientConfig
        fields = [
            "id",
            "hookup_fee",
            "updated_by",
            "updated_by_email",
            "updated_at",
        ]
        read_only_fields = ["updated_by", "updated_at"]