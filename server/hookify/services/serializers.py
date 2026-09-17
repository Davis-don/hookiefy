# services/serializers.py
from rest_framework import serializers

from .models import ServiceCategory, ClientService, ServiceImage


# ============================================================
# SERVICE CATEGORY
# ============================================================

class ServiceCategorySerializer(serializers.ModelSerializer):
    """
    Full serializer for ServiceCategory — supports
    list, retrieve, create, update, and partial update.
    """

    class Meta:
        model = ServiceCategory
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "image_url",
            "is_active",
            "is_featured",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "created_at",
            "updated_at",
        )

    # ── Validation ────────────────────────────────────────

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Name must be at least 2 characters long."
            )

        qs = ServiceCategory.objects.filter(name__iexact=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "A category with this name already exists."
            )

        return value

    def validate_image_url(self, value):
        if value in (None, ""):
            return None

        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "Image URL must start with http:// or https://"
            )

        return value.strip()


# ============================================================
# SERVICE IMAGE
# ============================================================

class ServiceImageSerializer(serializers.ModelSerializer):
    """
    Serializer for a single image attached to a listing.

    `service` is read-only here — the parent listing is set
    when the image is created through the nested write
    serializer on ClientService.
    """

    class Meta:
        model = ServiceImage
        fields = (
            "id",
            "service",
            "image_url",
            "image_public_id",
            "is_primary",
            "display_order",
            "created_at",
        )
        read_only_fields = (
            "id",
            "service",
            "created_at",
        )

    def validate_image_url(self, value):
        if not value:
            raise serializers.ValidationError(
                "Image URL is required."
            )

        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "Image URL must start with http:// or https://"
            )

        return value.strip()


# ============================================================
# CLIENT SERVICE — READ
# ============================================================

class ClientServiceReadSerializer(serializers.ModelSerializer):
    """
    Full listing representation for API consumers.

    Includes:
        - nested category
        - lightweight provider summary
        - every image in the gallery
        - convenience fields: primary_image_url, image_count
    """

    category = ServiceCategorySerializer(read_only=True)
    provider = serializers.SerializerMethodField()
    images = ServiceImageSerializer(many=True, read_only=True)

    primary_image_url = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()

    class Meta:
        model = ClientService
        fields = (
            "id",
            "listing_type",
            "title",
            "description",
            "category",
            "provider",
            "price",
            "pricing_unit",
            "images",
            "primary_image_url",
            "image_count",
            "is_active",
            "created_at",
            "updated_at",
        )

    def get_provider(self, obj):
        user = getattr(obj, "provider", None)
        if not user:
            return None

        return {
            "id": user.id,
            "full_name": getattr(user, "full_name", ""),
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "email": getattr(user, "email", ""),
            "profile_image_url": getattr(user, "profile_image_url", None),
        }

    def get_primary_image_url(self, obj):
        return obj.primary_image_url

    def get_image_count(self, obj):
        # Uses the prefetch cache when available
        return len(obj.images.all())


# ============================================================
# CLIENT SERVICE — WRITE
# ============================================================

class ClientServiceWriteSerializer(serializers.ModelSerializer):
    """
    Create / update a listing together with its images.

    Per-type rules:

        service / product
            - title:       required, ≥ 3 characters
            - description: required, ≥ 20 characters
            - price:       required, ≥ 0

        hookup
            - title:       optional (falls back to provider name)
            - description: required, ≥ 20 characters (the intro)
            - price:       optional (defaults to 0)

    Image handling:
        - On create: every image in the array is created.
        - On update: images are reconciled —
            * items with an `id` are updated in place
            * items without an `id` are created
            * images not present in the array are deleted

          This lets the frontend send the full gallery on
          every save without worrying about separate endpoints.

    You can also omit `images` entirely on update to leave
    the existing gallery untouched.
    """

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.filter(is_active=True),
        source="category",
        error_messages={
            "does_not_exist": "Selected category does not exist.",
            "incorrect_type": "Category id must be an integer.",
        },
    )

    images = ServiceImageSerializer(many=True, required=False)

    class Meta:
        model = ClientService
        fields = (
            "id",
            "listing_type",
            "title",
            "description",
            "category_id",
            "price",
            "pricing_unit",
            "is_active",
            "images",
        )

    # ── Field-level validation ────────────────────────────
    #
    # Note: these run per-field, before `validate()`. We
    # only reject clearly invalid values here. Whether a
    # field is *required* depends on the listing type, so
    # that decision lives in `validate()`.

    def validate_title(self, value):
        if value is None:
            return value

        value = str(value).strip()

        # Allow blank here — required-ness is per type
        if value == "":
            return ""

        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long."
            )

        return value

    def validate_description(self, value):
        if value is None:
            return value

        value = str(value).strip()

        # Allow blank here — required-ness is per type
        if value == "":
            return ""

        if len(value) < 20:
            raise serializers.ValidationError(
                "Description must be at least 20 characters long."
            )

        return value

    def validate_price(self, value):
        # Allow None here — required-ness is per type
        if value is None:
            return None

        if value < 0:
            raise serializers.ValidationError(
                "Price cannot be negative."
            )

        return value

    # ── Cross-field validation ────────────────────────────

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # ── Determine the effective listing type ──────────
        listing_type = attrs.get("listing_type")

        if not listing_type and self.instance:
            listing_type = self.instance.listing_type

        listing_type = listing_type or "service"

        # ── Resolve effective values (fall back on instance) ──
        title = attrs.get("title")
        description = attrs.get("description")
        price = attrs.get("price")
        category = attrs.get("category")

        if self.instance:
            if title is None:
                title = self.instance.title
            if description is None:
                description = self.instance.description
            if price is None:
                price = self.instance.price
            if category is None:
                category = self.instance.category

        # Trim once for readability
        title_str = (title or "").strip()
        description_str = (description or "").strip()

        # ── Per-type required rules ───────────────────────

        if listing_type in ("service", "product"):
            if not title_str:
                raise serializers.ValidationError(
                    {"title": "Title is required."}
                )

            if not description_str:
                raise serializers.ValidationError(
                    {"description": "Description is required."}
                )

            if price is None:
                raise serializers.ValidationError(
                    {"price": "Price is required."}
                )

        elif listing_type == "hookup":
            # Description (intro) is the one thing that
            # hookups must carry.
            if not description_str:
                raise serializers.ValidationError(
                    {
                        "description": (
                            "Please write a short intro about "
                            "yourself."
                        )
                    }
                )

            # Title is optional — fall back to the provider's
            # name so the row still has a human-readable label.
            if not title_str:
                fallback = ""
                if user and user.is_authenticated:
                    fallback = getattr(user, "full_name", "") or ""
                attrs["title"] = fallback or "Hookup"

            # Price is optional — default to 0 so nothing
            # downstream has to deal with null.
            if price is None:
                attrs["price"] = 0

        # ── Duplicate title check (all types) ─────────────
        final_title = attrs.get("title")
        if self.instance and not final_title:
            final_title = self.instance.title

        final_title_str = (final_title or "").strip()

        if (
            user
            and user.is_authenticated
            and final_title_str
            and category
        ):
            qs = ClientService.objects.filter(
                provider=user,
                title__iexact=final_title_str,
                category=category,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "title": (
                            "You already have a listing with this "
                            "title in the same category."
                        )
                    }
                )

        # ── At most one primary image per payload ─────────
        images = attrs.get("images")
        if images is not None:
            primaries = [
                img for img in images if img.get("is_primary")
            ]
            if len(primaries) > 1:
                raise serializers.ValidationError(
                    {
                        "images": (
                            "Only one image can be marked as primary."
                        )
                    }
                )

        return attrs

    # ── Create ────────────────────────────────────────────

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError(
                "You must be logged in to create a listing."
            )

        # Guarantee non-null values for the DB columns
        validated_data.setdefault("title", "")
        validated_data.setdefault("description", "")
        if validated_data.get("price") is None:
            validated_data["price"] = 0

        images_data = validated_data.pop("images", [])

        listing = ClientService.objects.create(
            provider=user,
            **validated_data,
        )

        for idx, img in enumerate(images_data):
            ServiceImage.objects.create(
                service=listing,
                image_url=img["image_url"],
                image_public_id=img.get("image_public_id", ""),
                is_primary=img.get("is_primary", False),
                display_order=img.get("display_order", idx),
            )

        return listing

    # ── Update ────────────────────────────────────────────

    def update(self, instance, validated_data):
        images_data = validated_data.pop("images", None)

        # Update the listing's scalar fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Never persist a null price
        if instance.price is None:
            instance.price = 0

        # Keep title non-null for older rows created before
        # the field became blank-able.
        if instance.title is None:
            instance.title = ""

        # Same for description
        if instance.description is None:
            instance.description = ""

        instance.save()

        # Reconcile the gallery only if the client sent it
        if images_data is not None:
            self._sync_images(instance, images_data)

        return instance

    # ── Gallery reconciliation helper ─────────────────────

    def _sync_images(self, listing, images_data):
        existing = {img.id: img for img in listing.images.all()}
        kept_ids = set()

        for idx, img in enumerate(images_data):
            img_id = img.get("id")

            if img_id and img_id in existing:
                # Update existing image
                obj = existing[img_id]
                obj.image_url = img["image_url"]
                obj.image_public_id = img.get("image_public_id", "")
                obj.is_primary = img.get("is_primary", False)
                obj.display_order = img.get("display_order", idx)
                obj.save(
                    update_fields=[
                        "image_url",
                        "image_public_id",
                        "is_primary",
                        "display_order",
                    ]
                )
                kept_ids.add(img_id)
            else:
                # Create new image
                new_img = ServiceImage.objects.create(
                    service=listing,
                    image_url=img["image_url"],
                    image_public_id=img.get("image_public_id", ""),
                    is_primary=img.get("is_primary", False),
                    display_order=img.get("display_order", idx),
                )
                kept_ids.add(new_img.id)

        # Delete images that were removed by the client
        for img_id, obj in existing.items():
            if img_id not in kept_ids:
                obj.delete()