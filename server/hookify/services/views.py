# services/views.py
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
    parser_classes,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .authentication import OptionalJWTAuthentication
from .models import ServiceCategory, ClientService, ServiceImage
from .serializers import (
    ServiceCategorySerializer,
    ClientServiceReadSerializer,
    ClientServiceWriteSerializer,
)

# ── Cloudinary helpers ──────────────────────────────────────
from account.controllers.cloudinary_utils import (
    bulk_upload_service_images,
    bulk_delete_service_images,
    delete_image_from_cloudinary,
)
# ────────────────────────────────────────────────────────────


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    if not user or not user.is_authenticated:
        return False
    return getattr(user, "role", None) == "superadmin"


def _can_manage(user, listing):
    """Superadmins manage everything; owners manage their own."""
    if not user or not user.is_authenticated:
        return False
    if _is_superadmin(user):
        return True
    return listing.provider_id == user.id


def _forbidden(message):
    return Response(
        {"message": message},
        status=status.HTTP_403_FORBIDDEN,
    )


def _unauthorized(message="Authentication required."):
    return Response(
        {"message": message},
        status=status.HTTP_401_UNAUTHORIZED,
    )


# ============================================================
# CATEGORIES — LIST + CREATE
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def service_categories_list_create(request):
    """
    GET  /services/service-categories/
        Public list. ?featured=true | ?search= | ?all=true (superadmin)

    POST /services/service-categories/
        Superadmin only.
    """

    # ── LIST ─────────────────────────────────────────────
    if request.method == "GET":
        qs = ServiceCategory.objects.all()

        include_all = (
            request.query_params.get("all") == "true"
            and _is_superadmin(request.user)
        )
        if not include_all:
            qs = qs.filter(is_active=True)

        if request.query_params.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search)

        qs = qs.order_by("name")
        serializer = ServiceCategorySerializer(qs, many=True)

        return Response(
            {"count": qs.count(), "categories": serializer.data},
            status=status.HTTP_200_OK,
        )

    # ── CREATE ───────────────────────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()

    if not _is_superadmin(request.user):
        return _forbidden("Only superadmins can create service categories.")

    serializer = ServiceCategorySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            category = serializer.save()
    except Exception as e:
        logger.exception("Failed to create category by user=%s", request.user.id)
        return Response(
            {"message": "Failed to create category.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Category created successfully.",
            "category": ServiceCategorySerializer(category).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# CATEGORY — DETAIL
# ============================================================

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def service_category_detail(request, pk):
    """Public read, superadmin-only write."""

    category = get_object_or_404(ServiceCategory, pk=pk)

    if request.method == "GET":
        if not category.is_active and not _is_superadmin(request.user):
            return Response(
                {"message": "Category not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"category": ServiceCategorySerializer(category).data},
            status=status.HTTP_200_OK,
        )

    if not request.user.is_authenticated:
        return _unauthorized()
    if not _is_superadmin(request.user):
        return _forbidden("Only superadmins can modify categories.")

    if request.method == "DELETE":
        try:
            with transaction.atomic():
                category.delete()
        except Exception as e:
            logger.exception("Failed to delete category_id=%s", category.id)
            return Response(
                {"message": "Failed to delete category.", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {"message": "Category deleted successfully."},
            status=status.HTTP_200_OK,
        )

    partial = request.method == "PATCH"
    serializer = ServiceCategorySerializer(
        instance=category, data=request.data, partial=partial
    )
    if not serializer.is_valid():
        return Response(
            {"message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            updated = serializer.save()
    except Exception as e:
        logger.exception("Failed to update category_id=%s", category.id)
        return Response(
            {"message": "Failed to update category.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Category updated successfully.",
            "category": ServiceCategorySerializer(updated).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CATEGORY — TOGGLES
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_service_category_active(request, pk):
    if not _is_superadmin(request.user):
        return _forbidden("Only superadmins can modify categories.")

    category = get_object_or_404(ServiceCategory, pk=pk)
    category.is_active = not category.is_active
    category.save(update_fields=["is_active", "updated_at"])

    return Response(
        {
            "message": (
                "Category activated."
                if category.is_active
                else "Category deactivated."
            ),
            "category": ServiceCategorySerializer(category).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_service_category_featured(request, pk):
    if not _is_superadmin(request.user):
        return _forbidden("Only superadmins can modify categories.")

    category = get_object_or_404(ServiceCategory, pk=pk)
    category.is_featured = not category.is_featured
    category.save(update_fields=["is_featured", "updated_at"])

    return Response(
        {
            "message": (
                "Category marked as featured."
                if category.is_featured
                else "Category removed from featured."
            ),
            "category": ServiceCategorySerializer(category).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LISTINGS — LIST + CREATE
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def services_list_create(request):
    """
    GET  /services/
        Public list of active listings.
        ?mine=true | ?category=<slug|id> | ?search= | ?featured=true
        ?listing_type=service|product
        ?ordering=price|-price|created_at|-created_at|title|-title

    POST /services/
        Create a listing. Any authenticated user is allowed.
        Accepts optional `images` array of dicts with
        image_url / image_public_id / is_primary / display_order.
    """

    # ── LIST ─────────────────────────────────────────────
    if request.method == "GET":
        qs = (
            ClientService.objects
            .select_related("category", "provider")
            .prefetch_related("images")
        )

        mine = request.query_params.get("mine") == "true"

        if mine:
            if not request.user.is_authenticated:
                return _unauthorized()
            qs = qs.filter(provider=request.user)
        else:
            qs = qs.filter(is_active=True)

        category_param = request.query_params.get("category")
        if category_param:
            if category_param.isdigit():
                qs = qs.filter(category_id=int(category_param))
            else:
                qs = qs.filter(category__slug=category_param)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(title__icontains=search)

        if request.query_params.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        listing_type = request.query_params.get("listing_type")
        if listing_type in ("service", "product"):
            qs = qs.filter(listing_type=listing_type)

        ordering = request.query_params.get("ordering", "-created_at")
        allowed = {
            "price", "-price",
            "created_at", "-created_at",
            "title", "-title",
        }
        if ordering not in allowed:
            ordering = "-created_at"

        qs = qs.order_by(ordering)
        serializer = ClientServiceReadSerializer(qs, many=True)

        return Response(
            {"count": qs.count(), "services": serializer.data},
            status=status.HTTP_200_OK,
        )

    # ── CREATE ───────────────────────────────────────────
    #
    # Any authenticated user can create a listing. The
    # provider is set to the request user in the serializer.
    # ──────────────────────────────────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()

    serializer = ClientServiceWriteSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {"message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            listing = serializer.save()
    except Exception as e:
        logger.exception("Failed to create listing user_id=%s", request.user.id)
        return Response(
            {"message": "Failed to create listing.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "message": "Listing created successfully.",
            "service": ClientServiceReadSerializer(listing).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# LISTING — DETAIL (READ / UPDATE / DELETE)
# ============================================================

@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
@authentication_classes([OptionalJWTAuthentication])
def service_detail(request, pk):
    """
    GET    /services/<pk>/   → public read
    PUT    /services/<pk>/   → full update (owner / superadmin)
    PATCH  /services/<pk>/   → partial update (owner / superadmin)
    DELETE /services/<pk>/   → delete (owner / superadmin)

    On DELETE:
        1. Fetch every ServiceImage public_id for this listing.
        2. Delete all Cloudinary assets in bulk.
        3. Delete the ClientService row (cascade removes image rows).
    """

    listing = get_object_or_404(
        ClientService.objects
        .select_related("category", "provider")
        .prefetch_related("images"),
        pk=pk,
    )

    # ── READ ─────────────────────────────────────────────
    if request.method == "GET":
        if not listing.is_active and not _can_manage(request.user, listing):
            return Response(
                {"message": "Listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"service": ClientServiceReadSerializer(listing).data},
            status=status.HTTP_200_OK,
        )

    # ── AUTH GUARD ───────────────────────────────────────
    if not request.user.is_authenticated:
        return _unauthorized()
    if not _can_manage(request.user, listing):
        return _forbidden("You do not have permission to modify this listing.")

    # ── DELETE ───────────────────────────────────────────
    if request.method == "DELETE":
        public_ids = list(
            listing.images
            .exclude(image_public_id="")
            .values_list("image_public_id", flat=True)
        )

        cld_result = {"deleted": [], "failed": []}
        if public_ids:
            try:
                cld_result = bulk_delete_service_images(public_ids)
            except Exception as e:
                logger.exception(
                    "Cloudinary bulk delete failed for service_id=%s",
                    listing.id,
                )
                return Response(
                    {
                        "message": (
                            "Failed to delete images from Cloudinary. "
                            "Listing was NOT deleted."
                        ),
                        "error": str(e),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        if cld_result["failed"]:
            return Response(
                {
                    "message": (
                        "Some Cloudinary images could not be deleted. "
                        "Listing was NOT deleted."
                    ),
                    "failed": cld_result["failed"],
                    "deleted": cld_result["deleted"],
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            with transaction.atomic():
                listing.delete()
        except Exception as e:
            logger.exception("Failed to delete service_id=%s", listing.id)
            return Response(
                {"message": "Failed to delete listing.", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Listing deleted successfully.",
                "cloudinary_deleted": cld_result["deleted"],
            },
            status=status.HTTP_200_OK,
        )

    # ── UPDATE ───────────────────────────────────────────
    partial = request.method == "PATCH"

    serializer = ClientServiceWriteSerializer(
        instance=listing,
        data=request.data,
        partial=partial,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {"message": "Validation failed.", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_public_ids = list(
        listing.images
        .exclude(image_public_id="")
        .values_list("image_public_id", flat=True)
    )

    try:
        with transaction.atomic():
            updated = serializer.save()
    except Exception as e:
        logger.exception("Failed to update service_id=%s", listing.id)
        return Response(
            {"message": "Failed to update listing.", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    kept_public_ids = set(
        updated.images
        .exclude(image_public_id="")
        .values_list("image_public_id", flat=True)
    )
    removed = [pid for pid in old_public_ids if pid not in kept_public_ids]

    cloudinary_cleanup = {"deleted": [], "failed": []}
    if removed:
        try:
            cloudinary_cleanup = bulk_delete_service_images(removed)
        except Exception:
            logger.exception(
                "Cloudinary cleanup failed after update for service_id=%s",
                listing.id,
            )

    return Response(
        {
            "message": "Listing updated successfully.",
            "service": ClientServiceReadSerializer(updated).data,
            "cloudinary_cleanup": cloudinary_cleanup,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LISTING IMAGES — BULK ADD (multipart upload)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_service_images(request, pk):
    """
    POST /services/<pk>/images/upload/

    Multipart upload of one or more image files.

    Form data:
        images: <file> (one or more)

    Optional:
        make_first_primary: "true" | "false" (default false)

    Behavior:
        1. Verify ownership of the listing.
        2. Upload every file to Cloudinary.
        3. Create a ServiceImage row for each success.
        4. If make_first_primary=true and none is primary yet,
           the first uploaded image becomes primary.
    """

    listing = get_object_or_404(ClientService, pk=pk)

    if not _can_manage(request.user, listing):
        return _forbidden("You do not have permission to modify this listing.")

    files = request.FILES.getlist("images")
    if not files:
        return Response(
            {"message": "No image files were provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = bulk_upload_service_images(files, listing.id)
    except Exception as e:
        logger.exception("Bulk upload failed for service_id=%s", listing.id)
        return Response(
            {"message": "Cloudinary upload failed.", "error": str(e)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    existing_count = listing.images.count()
    has_primary = listing.images.filter(is_primary=True).exists()

    make_first_primary = request.data.get("make_first_primary") == "true"

    created_images = []
    for idx, up in enumerate(result["uploaded"]):
        is_primary = (
            make_first_primary
            and not has_primary
            and idx == 0
        )
        img = ServiceImage.objects.create(
            service=listing,
            image_url=up["url"],
            image_public_id=up["public_id"],
            is_primary=is_primary,
            display_order=existing_count + idx,
        )
        created_images.append(img)

    listing.refresh_from_db()

    return Response(
        {
            "message": f"{len(created_images)} image(s) uploaded successfully.",
            "uploaded": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "image_public_id": img.image_public_id,
                    "is_primary": img.is_primary,
                    "display_order": img.display_order,
                }
                for img in created_images
            ],
            "failed": result["failed"],
            "service": ClientServiceReadSerializer(listing).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# LISTING IMAGES — DELETE ONE
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_service_image(request, pk, image_id):
    """
    DELETE /services/<pk>/images/<image_id>/

    Deletes a single image:
        1. Verify ownership.
        2. Delete Cloudinary asset first.
        3. Delete the DB row.
    """

    listing = get_object_or_404(ClientService, pk=pk)

    if not _can_manage(request.user, listing):
        return _forbidden("You do not have permission to modify this listing.")

    image = get_object_or_404(ServiceImage, pk=image_id, service=listing)

    public_id = image.image_public_id

    if public_id:
        try:
            delete_image_from_cloudinary(public_id)
        except Exception as e:
            logger.exception(
                "Cloudinary delete failed for image_id=%s public_id=%s",
                image.id,
                public_id,
            )
            return Response(
                {
                    "message": (
                        "Failed to delete the image from Cloudinary. "
                        "Image was NOT removed."
                    ),
                    "error": str(e),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

    image.delete()
    listing.refresh_from_db()

    return Response(
        {
            "message": "Image deleted successfully.",
            "service": ClientServiceReadSerializer(listing).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LISTING IMAGES — BULK DELETE
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_delete_service_images_view(request, pk):
    """
    POST /services/<pk>/images/bulk-delete/

    Body:
        { "image_ids": [12, 15, 18] }

    Cloudinary cleanup happens first. DB rows only deleted
    if every asset deletion succeeds.
    """

    listing = get_object_or_404(ClientService, pk=pk)

    if not _can_manage(request.user, listing):
        return _forbidden("You do not have permission to modify this listing.")

    image_ids = request.data.get("image_ids", [])
    if not isinstance(image_ids, list) or not image_ids:
        return Response(
            {"message": "image_ids must be a non-empty list."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    images = listing.images.filter(id__in=image_ids)

    if not images.exists():
        return Response(
            {"message": "No matching images found for this listing."},
            status=status.HTTP_404_NOT_FOUND,
        )

    public_ids = list(
        images.exclude(image_public_id="")
        .values_list("image_public_id", flat=True)
    )

    if public_ids:
        try:
            cld_result = bulk_delete_service_images(public_ids)
        except Exception as e:
            logger.exception(
                "Bulk Cloudinary delete failed for service_id=%s", listing.id
            )
            return Response(
                {
                    "message": (
                        "Failed to delete images from Cloudinary. "
                        "No rows were removed."
                    ),
                    "error": str(e),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if cld_result["failed"]:
            return Response(
                {
                    "message": (
                        "Some Cloudinary assets could not be deleted. "
                        "No rows were removed."
                    ),
                    "deleted": cld_result["deleted"],
                    "failed": cld_result["failed"],
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

    deleted_count, _ = images.delete()
    listing.refresh_from_db()

    return Response(
        {
            "message": f"{deleted_count} image(s) deleted.",
            "service": ClientServiceReadSerializer(listing).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LISTING IMAGES — SET PRIMARY
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_primary_service_image(request, pk, image_id):
    """POST /services/<pk>/images/<image_id>/set-primary/"""

    listing = get_object_or_404(ClientService, pk=pk)

    if not _can_manage(request.user, listing):
        return _forbidden("You do not have permission to modify this listing.")

    image = get_object_or_404(ServiceImage, pk=image_id, service=listing)

    image.is_primary = True
    image.save(update_fields=["is_primary"])

    listing.refresh_from_db()

    return Response(
        {
            "message": "Primary image updated.",
            "service": ClientServiceReadSerializer(listing).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LISTING IMAGES — REORDER
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_service_images(request, pk):
    """
    POST /services/<pk>/images/reorder/

    Body:
        { "order": [ {"id": 4, "display_order": 0}, … ] }
    """

    listing = get_object_or_404(ClientService, pk=pk)

    if not _can_manage(request.user, listing):
        return _forbidden("You do not have permission to modify this listing.")

    items = request.data.get("order", [])
    if not isinstance(items, list) or not items:
        return Response(
            {"message": "order must be a non-empty list."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    listing_images = {img.id: img for img in listing.images.all()}

    for item in items:
        img_id = item.get("id")
        new_order = item.get("display_order")

        if img_id in listing_images and isinstance(new_order, int):
            img = listing_images[img_id]
            img.display_order = new_order
            img.save(update_fields=["display_order"])

    listing.refresh_from_db()

    return Response(
        {
            "message": "Order updated.",
            "service": ClientServiceReadSerializer(listing).data,
        },
        status=status.HTTP_200_OK,
    )