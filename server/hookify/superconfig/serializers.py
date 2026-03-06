from rest_framework import serializers
from .models import AdminConfig


class AdminConfigSerializer(serializers.ModelSerializer):

    admin_email = serializers.ReadOnlyField(source="admin.email")

    class Meta:
        model = AdminConfig
        fields = [
            "id",
            "admin",
            "admin_email",
            "commission_percentage",
            "created_at",
            "updated_at"
        ]
        read_only_fields = ["created_at", "updated_at"]