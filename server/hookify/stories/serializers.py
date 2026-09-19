# stories/serializers.py
from rest_framework import serializers

from .models import Story


# ============================================================
# STORY — READ (nested author info)
# ============================================================

class StoryReadSerializer(serializers.ModelSerializer):

    author = serializers.SerializerMethodField()

    class Meta:
        model = Story

        fields = (
            "id",
            "title",
            "content",
            "category",
            "image_url",
            "created_at",
            "updated_at",
            "author",
        )

        read_only_fields = fields

    def get_author(self, obj):
        user = obj.user

        return {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "profile_image_url": user.profile_image_url,
            "role": user.role,
        }


# ============================================================
# STORY — CREATE
# ============================================================

class StoryCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Story

        fields = (
            "title",
            "content",
            "category",
            "image_url",
            "image_public_id",
        )

        read_only_fields = (
            "image_url",
            "image_public_id",
        )

    def validate_title(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Story title is required."
            )

        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters."
            )

        return value

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Story content is required."
            )

        if len(value) < 10:
            raise serializers.ValidationError(
                "Content must be at least 10 characters."
            )

        return value


# ============================================================
# STORY — UPDATE
# ============================================================

class StoryUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Story

        fields = (
            "title",
            "content",
            "category",
        )

    def validate_title(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Story title is required."
            )

        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters."
            )

        return value

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Story content is required."
            )

        if len(value) < 10:
            raise serializers.ValidationError(
                "Content must be at least 10 characters."
            )

        return value


# ============================================================
# STORY — FEED (kept for backwards compatibility)
# ============================================================

class StoryFeedSerializer(serializers.ModelSerializer):

    author = serializers.SerializerMethodField()

    class Meta:
        model = Story

        fields = (
            "id",
            "title",
            "content",
            "category",
            "image_url",
            "created_at",
            "author",
        )

    def get_author(self, obj):
        user = obj.user

        return {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "profile_image_url": user.profile_image_url,
            "role": user.role,
        }