from rest_framework import serializers
from .models import Posts


# ============================================================
# READ
# ============================================================

class PostSerializer(serializers.ModelSerializer):
    """
    Read serializer — used for every response.
    """

    business_name = serializers.CharField(
        source="business.business_name",
        read_only=True,
    )

    class Meta:
        model = Posts
        fields = (
            "id",
            "business",
            "business_name",
            "title",
            "body",
            "image_url",
            "image_public_id",
            "has_image",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ============================================================
# CREATE
# ============================================================

class PostCreateSerializer(serializers.ModelSerializer):
    """
    Validate title + body.

    image_url and image_public_id are set by the view after
    it uploads the file to Cloudinary — they aren't part of
    the incoming form data.
    """

    class Meta:
        model = Posts
        fields = (
            "title",
            "body",
        )

    def validate_title(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value


# ============================================================
# UPDATE
# ============================================================

class PostUpdateSerializer(serializers.ModelSerializer):
    """
    Same as create — only text fields are validated here.
    The view handles image replacement.
    """

    class Meta:
        model = Posts
        fields = (
            "title",
            "body",
        )
        extra_kwargs = {
            "title": {"required": False},
            "body": {"required": False, "allow_blank": True},
        }

    def validate_title(self, value):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value