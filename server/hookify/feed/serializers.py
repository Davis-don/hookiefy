# feed/serializers.py
from rest_framework import serializers

from account.models import Accounts
from services.models import ClientService


# ============================================================
# USER — PUBLIC FEED REPRESENTATION
# ============================================================
#
# Contact details (email, phone) are intentionally omitted.
# They are only returned by a separate, gated endpoint that
# checks whether a fee has been paid.

class UserFeedSerializer(serializers.ModelSerializer):
    country = serializers.CharField(
        source="profile.country",
        allow_null=True,
        required=False,
    )
    county = serializers.CharField(
        source="profile.county",
        allow_null=True,
        required=False,
    )
    city = serializers.CharField(
        source="profile.city",
        allow_null=True,
        required=False,
    )
    bio = serializers.CharField(
        source="profile.bio",
        allow_null=True,
        required=False,
    )

    minimum_age = serializers.IntegerField(
        source="preference.minimum_age",
        allow_null=True,
        required=False,
    )
    maximum_age = serializers.IntegerField(
        source="preference.maximum_age",
        allow_null=True,
        required=False,
    )
    interested_in_gender = serializers.CharField(
        source="preference.interested_in_gender",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Accounts
        fields = [
            "id",
            "first_name",
            "last_name",
            "country",
            "county",
            "city",
            "role",
            "profile_image_url",
            "bio",
            "interested_in_gender",
            "minimum_age",
            "maximum_age",
        ]
        # Explicitly do NOT include: email, phone_number, google_id


# ============================================================
# SERVICE — PUBLIC FEED REPRESENTATION
# ============================================================
#
# The provider is reduced to a public summary: display name,
# avatar, role. No email or phone.

class ServiceProviderPreviewSerializer(serializers.Serializer):
    """
    A minimal provider summary used inside service feed items.
    """

    id = serializers.IntegerField()
    full_name = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.CharField()
    profile_image_url = serializers.CharField(
        allow_null=True,
        required=False,
    )


class ServiceFeedSerializer(serializers.ModelSerializer):
    provider = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    primary_image_url = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = ClientService
        fields = [
            "id",
            "listing_type",
            "title",
            "description",
            "category",
            "provider",
            "price",
            "pricing_unit",
            "primary_image_url",
            "image_count",
            "is_featured",
            "created_at",
            "updated_at",
        ]

    def get_provider(self, obj):
        user = getattr(obj, "provider", None)
        if not user:
            return None

        return {
            "id": user.id,
            "full_name": getattr(user, "full_name", "") or "",
            "first_name": getattr(user, "first_name", "") or "",
            "last_name": getattr(user, "last_name", "") or "",
            "role": getattr(user, "role", "") or "",
            "profile_image_url": getattr(
                user, "profile_image_url", None
            ),
        }

    def get_category(self, obj):
        category = getattr(obj, "category", None)
        if not category:
            return None

        return {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        }

    def get_primary_image_url(self, obj):
        return obj.primary_image_url

    def get_image_count(self, obj):
        # Uses the prefetch cache when available
        return len(obj.images.all())