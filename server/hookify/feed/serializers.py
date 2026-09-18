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
    country = serializers.SerializerMethodField()
    county = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()

    minimum_age = serializers.SerializerMethodField()
    maximum_age = serializers.SerializerMethodField()
    interested_in_gender = serializers.SerializerMethodField()

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

    # ── Null-safe profile accessors ─────────────────────

    def _profile(self, obj):
        return getattr(obj, "profile", None)

    def _preference(self, obj):
        return getattr(obj, "preference", None)

    def get_country(self, obj):
        p = self._profile(obj)
        return getattr(p, "country", None) if p else None

    def get_county(self, obj):
        p = self._profile(obj)
        return getattr(p, "county", None) if p else None

    def get_city(self, obj):
        p = self._profile(obj)
        return getattr(p, "city", None) if p else None

    def get_bio(self, obj):
        p = self._profile(obj)
        return getattr(p, "bio", None) if p else None

    def get_minimum_age(self, obj):
        pref = self._preference(obj)
        return getattr(pref, "minimum_age", None) if pref else None

    def get_maximum_age(self, obj):
        pref = self._preference(obj)
        return getattr(pref, "maximum_age", None) if pref else None

    def get_interested_in_gender(self, obj):
        pref = self._preference(obj)
        return (
            getattr(pref, "interested_in_gender", None)
            if pref
            else None
        )


# ============================================================
# SERVICE IMAGE — PUBLIC FEED REPRESENTATION
# ============================================================

class ServiceImageFeedSerializer(serializers.Serializer):
    """
    Compact image representation for the feed carousel.

    Only includes the fields the frontend needs to render
    and order the gallery. No Cloudinary public IDs leak.
    """

    id = serializers.IntegerField()
    image_url = serializers.CharField()
    is_primary = serializers.BooleanField()
    display_order = serializers.IntegerField()


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
    images = serializers.SerializerMethodField()
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
            "images",              # 👈 full gallery for the carousel
            "primary_image_url",
            "image_count",
            "is_featured",
            "created_at",
            "updated_at",
        ]

    # ── Provider summary ────────────────────────────────

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

    # ── Category summary ────────────────────────────────

    def get_category(self, obj):
        category = getattr(obj, "category", None)
        if not category:
            return None

        return {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        }

    # ── Full image gallery ──────────────────────────────
    #
    # Ordered by display_order then id (matching the
    # ServiceImage.Meta.ordering). Only exposes URL, id,
    # is_primary, and display_order — no public_id.

    def get_images(self, obj):
        try:
            images = obj.images.all()
        except Exception:
            return []

        return [
            {
                "id": img.id,
                "image_url": img.image_url,
                "is_primary": img.is_primary,
                "display_order": img.display_order,
            }
            for img in images
        ]

    # ── Primary image URL ───────────────────────────────

    def get_primary_image_url(self, obj):
        return obj.primary_image_url

    # ── Image count ─────────────────────────────────────

    def get_image_count(self, obj):
        # Uses the prefetch cache when available
        return len(obj.images.all())