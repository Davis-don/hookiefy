# my_engagements/serializers.py

from rest_framework import serializers

from .models import Like, Follow


# ============================================================
# LIKE  —  read serializer
# ============================================================

class LikeSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    user_email = serializers.CharField(
        source="user.email",
        read_only=True,
    )
    user_profile_image = serializers.URLField(
        source="user.profile_image_url",
        read_only=True,
    )
    content_type_model = serializers.CharField(
        source="content_type.model",
        read_only=True,
    )

    class Meta:
        model = Like
        fields = (
            "id",
            "user",
            "user_full_name",
            "user_email",
            "user_profile_image",
            "content_type",
            "content_type_model",
            "object_id",
            "created_at",
        )
        read_only_fields = fields


# ============================================================
# FOLLOW  —  read serializer
# ============================================================

class FollowSerializer(serializers.ModelSerializer):
    user_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    user_email = serializers.CharField(
        source="user.email",
        read_only=True,
    )
    user_profile_image = serializers.URLField(
        source="user.profile_image_url",
        read_only=True,
    )
    content_type_model = serializers.CharField(
        source="content_type.model",
        read_only=True,
    )

    class Meta:
        model = Follow
        fields = (
            "id",
            "user",
            "user_full_name",
            "user_email",
            "user_profile_image",
            "content_type",
            "content_type_model",
            "object_id",
            "created_at",
        )
        read_only_fields = fields


# ============================================================
# ACTION INPUT — like / follow toggles
# ============================================================
#
# Only these three target types are valid:
#
#     product   →  products.Products
#     post      →  posts.Posts
#     story     →  stories.Story
#
# The actor is the authenticated user; never sent in the body.
# ============================================================

class EngagementActionSerializer(serializers.Serializer):

    target_type = serializers.ChoiceField(
        choices=("product", "post", "story"),
    )

    target_id = serializers.IntegerField(min_value=1)


# ============================================================
# STATUS OUTPUT — returned by every toggle / status call
# ============================================================

class EngagementStatusSerializer(serializers.Serializer):

    target_type = serializers.CharField()
    target_id = serializers.IntegerField()

    likes_count = serializers.IntegerField()
    follows_count = serializers.IntegerField()

    # Optional — present only when relevant
    liked = serializers.BooleanField(required=False)
    followed = serializers.BooleanField(required=False)