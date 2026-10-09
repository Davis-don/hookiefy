# feed_data/feed_views/serializers.py
# ============================================================
# Shared serializers for the feed_views package.
# ============================================================

from rest_framework import serializers


class FeedBusinessMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    business_name = serializers.CharField()


class FeedOwnerMiniSerializer(serializers.Serializer):
    profile_image_url = serializers.URLField(
        allow_null=True,
        allow_blank=True,
    )


class FeedPropertySerializer(serializers.Serializer):
    name = serializers.CharField()
    value = serializers.CharField()


class StoryItemSerializer(serializers.ModelSerializer):
    """
    Shape for a user's own Story.
    Import the Story model lazily inside the view file to avoid
    a circular dependency, or import it here if you prefer.
    """

    author_id = serializers.IntegerField(source="user.id", read_only=True)
    author_name = serializers.SerializerMethodField()
    author_image = serializers.URLField(
        source="user.profile_image_url",
        read_only=True,
        allow_null=True,
    )
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    summary = serializers.CharField(read_only=True)

    class Meta:
        # Set model in the concrete subclass, or import Story here.
        fields = (
            "id",
            "author_id",
            "author_name",
            "author_image",
            "title",
            "content",
            "summary",
            "category",
            "category_display",
            "views",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_author_name(self, obj):
        user = obj.user
        if not user:
            return ""
        full = (
            f"{getattr(user, 'first_name', '')} "
            f"{getattr(user, 'last_name', '')}"
        ).strip()
        return full or getattr(user, "email", "")