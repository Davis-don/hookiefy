# posts/serializers.py

from rest_framework import serializers
from .models import Posts


# ============================================================
# READ
# ============================================================

class PostSerializer(serializers.ModelSerializer):
    """
    Read serializer — used for every response.

    Includes:
        - business info (flat: name, category, type)
        - nested owner (from the business)
        - engagement counters (views, likes, follows)
        - has_image helper
    """

    business_name = serializers.CharField(
        source="business.business_name",
        read_only=True,
    )

    business_category = serializers.CharField(
        source="business.business_category",
        read_only=True,
    )

    business_type = serializers.CharField(
        source="business.business_type",
        read_only=True,
    )

    # Nested owner, resolved from business.owner
    owner = serializers.SerializerMethodField()

    class Meta:
        model = Posts
        fields = (
            "id",
            "business",
            "business_name",
            "business_category",
            "business_type",
            "owner",
            "title",
            "body",
            "image_url",
            "image_public_id",
            "has_image",
            "views",
            "likes_count",
            "follows_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_owner(self, obj):
        owner = obj.business.owner if obj.business_id else None
        if not owner:
            return None
        return {
            "id": owner.id,
            "full_name": owner.full_name,
            "profile_image_url": owner.profile_image_url,
        }


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