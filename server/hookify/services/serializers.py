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

    Payload shape:

        {
            "listing_type": "service",
            "title": "Private Math Tutoring",
            "description": "...",
            "category_id": 3,
            "price": "1500.00",
            "pricing_unit": "per_hour",
            "is_active": true,
            "images": [
                {
                    "image_url": "https://res.cloudinary.com/.../a.jpg",
                    "image_public_id": "hookiefy/services/a",
                    "is_primary": true,
                    "display_order": 0
                },
                {
                    "image_url": "https://res.cloudinary.com/.../b.jpg",
                    "image_public_id": "hookiefy/services/b",
                    "display_order": 1
                }
            ]
        }

    Semantics:
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

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters long."
            )
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if len(value) < 20:
            raise serializers.ValidationError(
                "Description must be at least 20 characters long."
            )
        return value

    def validate_price(self, value):
        if value is None:
            raise serializers.ValidationError("Price is required.")
        if value < 0:
            raise serializers.ValidationError(
                "Price cannot be negative."
            )
        return value

    # ── Cross-field validation ────────────────────────────

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        title = attrs.get("title")
        category = attrs.get("category")

        if self.instance:
            title = title or self.instance.title
            category = category or self.instance.category

        # Prevent duplicate titles per provider + category
        if user and user.is_authenticated and title and category:
            qs = ClientService.objects.filter(
                provider=user,
                title__iexact=title,
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

        # Ensure at most one primary across the submitted images
        images = attrs.get("images")
        if images is not None:
            primaries = [img for img in images if img.get("is_primary")]
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