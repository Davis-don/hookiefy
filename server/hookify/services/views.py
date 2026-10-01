# services/views.py
import logging

from django.db import transaction
from django.db import models
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
# PLAN-LIMIT HELPERS
# ============================================================

def _find_upgrade_plan(current_plan):
    """Return the next plan (by display_order) for an upgrade hint."""
    from plans.models import Plan

    qs = Plan.objects.filter(is_active=True)

    if current_plan is not None:
        qs = qs.filter(display_order__gt=current_plan.display_order)

    return qs.order_by("display_order", "price").first()


def _plan_payload(plan):
    if not plan:
        return None
    return {
        "id": plan.id,
        "name": plan.name,
        "slug": plan.slug,
        "price": str(plan.price),
        "services_limit": plan.services_limit,
        "images_per_service": plan.images_per_service,
    }


def _check_services_limit(user):
    """
    Returns None if the user can create another listing.

    Otherwise returns a Response describing the limit and
    how to upgrade.
    """

    if _is_superadmin(user):
        return None

    subscription = getattr(user, "subscription", None)

    if not subscription:
        return Response(
            {
                "message": (
                    "You don't have a subscription yet. "
                    "Please choose a plan to start creating services."
                ),
                "error_code": "NO_SUBSCRIPTION",
                "limit": 0,
                "used": 0,
                "remaining": 0,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    plan = subscription.plan

    if not plan:
        return Response(
            {
                "message": (
                    "Your subscription has no plan assigned. "
                    "Please contact support."
                ),
                "error_code": "NO_PLAN",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    limit = plan.services_limit  # None = unlimited

    if limit is None:
        return None

    used = ClientService.objects.filter(provider=user).count()

    if used < limit:
        return None

    upgrade = _find_upgrade_plan(plan)

    if upgrade:
        hint = (
            f" Upgrade to {upgrade.name} "
            f"(KES {upgrade.price}/month) for more."
        )
    else:
        hint = (
            " You're already on the highest plan. "
            "Contact support if you need more."
        )

    return Response(
        {
            "message": (
                f"You've reached the service limit for the "
                f"{plan.name} plan ({used}/{limit}).{hint}"
            ),
            "error_code": "SERVICE_LIMIT_REACHED",
            "plan": _plan_payload(plan),
            "used": used,
            "limit": limit,
            "remaining": 0,
            "upgrade_plan": _plan_payload(upgrade),
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def _resolve_images_per_service_limit(user):
    """
    Return the plan's `images_per_service` limit for the given
    user, or None if unlimited / no plan.

    Also returns the plan (for upgrade hints).
    """

    if _is_superadmin(user):
        return None, None

    subscription = getattr(user, "subscription", None)

    if not subscription or not subscription.plan:
        return 0, None  # no plan → 0 images allowed

    plan = subscription.plan
    return plan.images_per_service, plan


def _image_limit_error_payload(
    plan,
    limit,
    used,
    requested,
    uploaded,
    skipped,
    upgrade,
):
    """
    Build a consistent payload describing an image-limit
    situation, whether it was hit partially or fully.
    """

    if upgrade:
        hint = (
            f" Upgrade to {upgrade.name} "
            f"(KES {upgrade.price}/month) to add more images."
        )
        upgrade_payload = _plan_payload(upgrade)
    else:
        hint = (
            " You're already on the highest plan. "
            "Contact support if you need more."
        )
        upgrade_payload = None

    return {
        "message": (
            f"You can have up to {limit} image(s) on the "
            f"{plan.name} plan. "
            f"{uploaded} image(s) were uploaded, "
            f"{skipped} were skipped — you already had "
            f"{used} of {limit}."
            f"{hint}"
        ),
        "error_code": "IMAGE_LIMIT_REACHED",
        "plan": _plan_payload(plan),
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used - uploaded),
        "requested": requested,
        "uploaded": uploaded,
        "skipped": skipped,
        "upgrade_plan": upgrade_payload,
    }


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

    POST /services/
        Create a listing. Any authenticated user is allowed,
        subject to the plan's `services_limit`.
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
    if not request.user.is_authenticated:
        return _unauthorized()

    # Plan limit check — number of services.
    limit_response = _check_services_limit(request.user)
    if limit_response is not None:
        return limit_response

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
#
# IMPORTANT: only the images that fit inside the user's plan
# limit are actually uploaded to Cloudinary. Extra files are
# silently dropped and reported back in the response.
#
# Response shape:
#   - 201 Created → some images uploaded (may be fewer than requested)
#   - 403 Forbidden + IMAGE_LIMIT_REACHED → none could be uploaded
#
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_service_images(request, pk):
    """
    POST /services/<pk>/images/upload/

    Multipart upload of one or more image files.

    If the user's plan limits images per service, only the
    allowed number are uploaded to Cloudinary. Extra files
    are skipped and the response tells the user what
    happened and how to upgrade.
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

    # ── Resolve plan limit ───────────────────────────────
    limit, plan = _resolve_images_per_service_limit(request.user)

    used = listing.images.count()

    # No plan at all → reject outright.
    if limit is None and plan is None:
        return Response(
            {
                "message": (
                    "You don't have a subscription plan. "
                    "Please choose a plan to upload images."
                ),
                "error_code": "NO_PLAN",
                "used": used,
                "limit": 0,
                "requested": len(files),
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ---------------------------------------------------
    # Decide which files we're allowed to upload.
    #
    #   limit is None → unlimited, upload everything.
    #   otherwise     → cap to (limit - used) files.
    # ---------------------------------------------------
    if limit is None:
        allowed_files = list(files)
        skipped_count = 0
    else:
        remaining = max(0, limit - used)
        allowed_files = list(files[:remaining])
        skipped_count = len(files) - len(allowed_files)

        # Nothing fits → tell the user directly.
        if not allowed_files:
            upgrade = _find_upgrade_plan(plan)

            return Response(
                _image_limit_error_payload(
                    plan=plan,
                    limit=limit,
                    used=used,
                    requested=len(files),
                    uploaded=0,
                    skipped=len(files),
                    upgrade=upgrade,
                ),
                status=status.HTTP_403_FORBIDDEN,
            )

    # ── Upload only the allowed files ────────────────────
    try:
        result = bulk_upload_service_images(allowed_files, listing.id)
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

    uploaded_count = len(created_images)
    total_skipped = skipped_count + len(result.get("failed", []))

    # ── Partial upload: some skipped due to plan ────────
    if skipped_count > 0 and plan is not None and limit is not None:
        upgrade = _find_upgrade_plan(plan)

        return Response(
            {
                "message": (
                    f"{uploaded_count} image(s) uploaded. "
                    f"{skipped_count} skipped — your "
                    f"{plan.name} plan allows up to {limit} "
                    f"image(s) per service."
                ),
                "error_code": "IMAGE_LIMIT_PARTIAL",
                "plan": _plan_payload(plan),
                "used": used,
                "limit": limit,
                "remaining": max(0, limit - listing.images.count()),
                "requested": len(files),
                "uploaded": uploaded_count,
                "skipped": skipped_count,
                "upgrade_plan": _plan_payload(upgrade),
                "uploaded_images": [
                    {
                        "id": img.id,
                        "image_url": img.image_url,
                        "image_public_id": img.image_public_id,
                        "is_primary": img.is_primary,
                        "display_order": img.display_order,
                    }
                    for img in created_images
                ],
                "failed": result.get("failed", []),
                "service": ClientServiceReadSerializer(listing).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ── Normal success ───────────────────────────────────
    return Response(
        {
            "message": (
                f"{uploaded_count} image(s) uploaded successfully."
            ),
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
            "failed": result.get("failed", []),
            "skipped": total_skipped,
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
    """POST /services/<pk>/images/reorder/"""

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