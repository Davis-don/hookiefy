# account/controllers/cloudinary_utils.py
# ============================================================

import io
import os
import time
import random
import logging

import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.exceptions import (
    Error as CloudinaryError,
    BadRequest as CloudinaryBadRequest,
    NotFound as CloudinaryNotFound,
)
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

logger = logging.getLogger(__name__)


# ============================================================
# IMAGE RULES — keep in sync with posts/products views
# ============================================================

MAX_IMAGE_BYTES = 8 * 1024 * 1024   # 8 MB

ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

ALLOWED_CLOUDINARY_FORMATS = ["jpg", "jpeg", "png", "webp"]

ALLOWED_IMAGE_LABEL = "PNG, JPEG or WEBP"

# Pillow formats we accept (must match the extensions above)
PIL_ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


# ============================================================
# VALIDATION
# ============================================================

class ImageValidationError(Exception):
    """Raised when an image fails content/type/size/corruption checks."""


def _validate_image_file(image_file, field_name="image"):
    """
    Validate an UploadedFile end-to-end BEFORE talking to Cloudinary.

    Checks:
        - file present
        - MIME type in allowed set
        - file extension in allowed set
        - size > 0 and <= MAX_IMAGE_BYTES
        - file is a readable, non-corrupted image with an
          allowed Pillow format (PNG, JPEG, WEBP)

    Raises ImageValidationError on any failure.
    """
    # Diagnostic log — confirms what was really uploaded when a
    # validation error fires. Keep this; it's cheap and invaluable.
    logger.info(
        "image upload check: name=%r content_type=%r size=%r",
        getattr(image_file, "name", None),
        getattr(image_file, "content_type", None),
        getattr(image_file, "size", None),
    )

    if image_file is None:
        raise ImageValidationError("An image is required.")

    # MIME
    content_type = (getattr(image_file, "content_type", "") or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise ImageValidationError(
            f"Unsupported file type. Please use {ALLOWED_IMAGE_LABEL}."
        )

    # Extension
    filename = (getattr(image_file, "name", "") or "").lower()
    extension = os.path.splitext(filename)[1]
    if extension not in ALLOWED_EXTENSIONS:
        raise ImageValidationError(
            f"Unsupported file extension. Please use {ALLOWED_IMAGE_LABEL}."
        )

    # Size
    size = getattr(image_file, "size", 0) or 0
    if size <= 0:
        raise ImageValidationError("The image appears to be empty.")
    if size > MAX_IMAGE_BYTES:
        mb_limit = MAX_IMAGE_BYTES // (1024 * 1024)
        raise ImageValidationError(
            f"Image is too large. Maximum size is {mb_limit} MB."
        )

    # Corruption / readability check via Pillow
    try:
        # Seek to start so we don't disturb callers that already read.
        if hasattr(image_file, "seek"):
            image_file.seek(0)
        raw = image_file.read()
        if hasattr(image_file, "seek"):
            image_file.seek(0)

        with Image.open(io.BytesIO(raw)) as img:
            img.verify()

        # Some corrupted files pass verify() but fail to load().
        # Re-open and load to be sure.
        with Image.open(io.BytesIO(raw)) as img:
            img_format = (img.format or "").upper()
            if img_format not in PIL_ALLOWED_FORMATS:
                raise ImageValidationError(
                    f"Unsupported image format. Please use {ALLOWED_IMAGE_LABEL}."
                )
            img.load()

    except UnidentifiedImageError:
        raise ImageValidationError(
            "That file is not a valid image or appears to be corrupted."
        )
    except ImageValidationError:
        raise
    except Exception as e:
        raise ImageValidationError(
            f"Could not read the image — it may be corrupted: {e}"
        )


# ============================================================
# RETRY HELPER — for network / transient errors
# ============================================================

# Exceptions that usually mean "try again in a moment"
TRANSIENT_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
)


def _call_with_retry(fn, *, attempts=3, base_delay=0.5, max_delay=4.0,
                     label="cloudinary call"):
    """
    Call `fn()` up to `attempts` times with exponential backoff + jitter
    on transient errors (network / timeout / 5xx).

    Non-transient errors raise immediately.
    """
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return fn()

        except CloudinaryNotFound:
            # 404 — not transient, don't retry
            raise

        except CloudinaryBadRequest:
            # 400 — bad payload / bad image, don't retry
            raise

        except CloudinaryError as e:
            # Other Cloudinary-side errors (e.g. 5xx) — treat as transient
            last_error = e
            status = getattr(e, "http_code", None)
            is_transient = status is None or status >= 500

            if not is_transient or attempt == attempts:
                raise

            delay = min(max_delay, base_delay * (2 ** (attempt - 1)))
            delay += random.uniform(0, 0.25)
            logger.warning(
                "Cloudinary transient error on %s (attempt %d/%d): %s "
                "— retrying in %.2fs",
                label, attempt, attempts, e, delay,
            )
            time.sleep(delay)

        except TRANSIENT_EXCEPTIONS as e:
            last_error = e
            if attempt == attempts:
                raise

            delay = min(max_delay, base_delay * (2 ** (attempt - 1)))
            delay += random.uniform(0, 0.25)
            logger.warning(
                "Network error on %s (attempt %d/%d): %s "
                "— retrying in %.2fs",
                label, attempt, attempts, e, delay,
            )
            time.sleep(delay)

    # Should be unreachable
    raise last_error  # pragma: no cover


# ============================================================
# SINGLE IMAGE — UPLOAD
# ============================================================

def upload_image_to_cloudinary(
    image_file,
    folder="profile_images",
    public_id=None,
    validate=True,
):
    """
    Upload a single image to Cloudinary.

    - If `validate=True` (default), enforces MIME / extension /
      size / corruption rules before the upload.
    - Retries on transient Cloudinary / network failures.
    - Blocks GIF and other unsupported formats at BOTH the
      validation layer and the Cloudinary `allowed_formats` layer.

    Returns a dict with url, public_id, format, dimensions, etc.

    Raises:
        ImageValidationError — for bad/corrupt/oversized images
        Exception            — for Cloudinary upload failures
                               (after retries are exhausted)
    """

    if validate:
        _validate_image_file(image_file)

    try:
        upload_options = {
            "folder": folder,
            "use_filename": True,
            "unique_filename": True,
            "overwrite": True,
            "resource_type": "image",
            # Block GIF and everything else at the Cloudinary layer.
            "allowed_formats": ALLOWED_CLOUDINARY_FORMATS,
        }

        if public_id:
            upload_options["public_id"] = public_id

        def _do_upload():
            return cloudinary.uploader.upload(image_file, **upload_options)

        result = _call_with_retry(_do_upload, label="upload")

        return {
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height"),
            "bytes": result.get("bytes"),
            "created_at": result.get("created_at"),
            "secure_url": result.get("secure_url"),
            "version": result.get("version"),
            "etag": result.get("etag"),
        }

    except ImageValidationError:
        raise

    except CloudinaryBadRequest as e:
        # Cloudinary rejected the file (e.g. corrupt data, wrong format
        # despite passing our local checks — extremely rare)
        logger.error("Cloudinary rejected image: %s", e)
        raise Exception(
            f"Image was rejected by the storage service. "
            f"Please try a different file. ({e})"
        )

    except CloudinaryNotFound as e:
        logger.error("Cloudinary not found (config issue?): %s", e)
        raise Exception(
            "Storage service not reachable. Please try again later."
        )

    except Exception as e:
        logger.exception("Cloudinary upload failed after retries: %s", e)
        raise Exception(f"Cloudinary upload failed: {str(e)}")


# ============================================================
# SINGLE IMAGE — DELETE
# ============================================================

def delete_image_from_cloudinary(public_id):
    """
    Delete a single image from Cloudinary by its public_id.
    Retries transient failures.
    """

    if not public_id:
        raise ValueError("public_id is required for deletion.")

    try:
        def _do_delete():
            return cloudinary.uploader.destroy(public_id)

        result = _call_with_retry(_do_delete, label="delete")

        if result.get("result") == "ok":
            return {
                "result": "ok",
                "public_id": public_id,
            }

        if result.get("result") == "not found":
            # Already gone — treat as success for idempotency
            return {
                "result": "ok",
                "public_id": public_id,
                "note": "already absent",
            }

        raise Exception(f"Failed to delete image: {result.get('result')}")

    except CloudinaryNotFound:
        # Asset already gone — idempotent success
        return {
            "result": "ok",
            "public_id": public_id,
            "note": "already absent",
        }

    except Exception as e:
        logger.exception("Cloudinary delete failed: %s", e)
        raise Exception(f"Cloudinary delete failed: {str(e)}")


# ============================================================
# BULK IMAGES — UPLOAD
# ============================================================

def bulk_upload_images_to_cloudinary(
    image_files,
    folder="product_images",
    public_id_prefix="img",
    owner_id=None,
):
    """
    Upload multiple images to Cloudinary in one shot.

    Each image is validated individually. An invalid image is
    recorded in `failed` and skipped — the rest still upload.

    Returns:
        {
            "uploaded": [ {url, public_id, ...}, ... ],
            "failed":   [ {name, error, reason}, ... ],
        }
    """

    uploaded = []
    failed = []
    timestamp = int(time.time())

    for idx, image_file in enumerate(image_files or []):
        file_name = getattr(image_file, "name", "?")

        # Per-image validation — never raises, records a clean error.
        try:
            _validate_image_file(image_file)
        except ImageValidationError as e:
            failed.append({
                "name": file_name,
                "error": str(e),
                "reason": "invalid_image",
            })
            continue

        try:
            parts = [public_id_prefix]
            if owner_id is not None:
                parts.append(str(owner_id))
            parts.append(str(timestamp))
            parts.append(str(idx))
            public_id = "_".join(parts)

            result = upload_image_to_cloudinary(
                image_file,
                folder=folder,
                public_id=public_id,
                validate=False,   # already validated above
            )
            uploaded.append(result)

        except Exception as e:
            logger.warning("Failed to upload %s: %s", file_name, e)
            failed.append({
                "name": file_name,
                "error": str(e),
                "reason": "upload_failed",
            })

    return {"uploaded": uploaded, "failed": failed}


# ============================================================
# BULK IMAGES — DELETE
# ============================================================

def bulk_delete_images_from_cloudinary(public_ids):
    """
    Delete multiple Cloudinary assets by public_id.
    Individual failures don't stop the batch.
    """

    deleted = []
    failed = []

    for public_id in public_ids or []:
        if not public_id:
            continue

        try:
            result = delete_image_from_cloudinary(public_id)
            if result.get("result") == "ok":
                deleted.append(public_id)
            else:
                failed.append({
                    "public_id": public_id,
                    "error": "unexpected response",
                })
        except Exception as e:
            logger.warning("Failed to delete %s: %s", public_id, e)
            failed.append({
                "public_id": public_id,
                "error": str(e),
            })

    return {"deleted": deleted, "failed": failed}


# ============================================================
# USER — DELETE ALL IMAGES (profile)
# ============================================================

def delete_user_all_images(user):
    """
    Delete all Cloudinary images associated with a user.
    """

    deleted = False
    public_id_deleted = None

    try:
        if user.profile_image_public_id:
            logger.info(
                "Deleting profile image: %s",
                user.profile_image_public_id,
            )
            delete_result = delete_image_from_cloudinary(
                user.profile_image_public_id
            )
            if delete_result.get("result") == "ok":
                deleted = True
                public_id_deleted = user.profile_image_public_id
                logger.info("Profile image deleted successfully")
            else:
                logger.warning(
                    "Failed to delete profile image: %s", delete_result
                )
        else:
            logger.info("No profile image to delete")

        return {
            "deleted": deleted,
            "public_id_deleted": public_id_deleted,
            "message": (
                "Profile image deleted"
                if deleted
                else "No image to delete"
            ),
        }

    except Exception as e:
        logger.exception("Error deleting user images: %s", e)
        return {
            "deleted": False,
            "public_id_deleted": None,
            "message": f"Error deleting images: {str(e)}",
        }


# ============================================================
# PROFILE IMAGE — UPLOAD OR REPLACE
# ============================================================

def upload_or_replace_profile_image(
    image_file,
    user,
    folder="profile_images",
):
    """
    Upload a profile image. Validates the new file BEFORE
    deleting the old one, so a bad upload never removes a
    working profile picture.

    Raises:
        ImageValidationError — for bad/corrupt/oversized images
                               (safe for callers to catch as 400)
        Exception            — for Cloudinary / network failures
                               after retries (safe to catch as 503)
    """

    # 1) Validate first — abort before touching the old asset.
    #    This is intentionally OUTSIDE the try below so that
    #    ImageValidationError is never wrapped in a generic
    #    "Profile image upload failed" Exception.
    _validate_image_file(image_file)

    old_public_id = None
    replaced = False

    try:
        if user.profile_image_public_id:
            old_public_id = user.profile_image_public_id
            logger.info("Existing profile image found: %s", old_public_id)

            try:
                delete_result = delete_image_from_cloudinary(old_public_id)
                if delete_result.get("result") == "ok":
                    logger.info(
                        "Old image deleted successfully: %s", old_public_id
                    )
                    replaced = True
                else:
                    logger.warning(
                        "Failed to delete old image: %s", delete_result
                    )
            except Exception as e:
                logger.warning("Error deleting old image: %s", e)

        public_id = f"user_{user.id}_profile_{int(time.time())}"

        upload_result = upload_image_to_cloudinary(
            image_file,
            folder=folder,
            public_id=public_id,
            validate=False,   # already validated above
        )

        logger.info(
            "New image uploaded successfully: %s",
            upload_result["public_id"],
        )

        user.profile_image_url = upload_result["url"]
        user.profile_image_public_id = upload_result["public_id"]
        user.save()

        return {
            "url": upload_result["url"],
            "public_id": upload_result["public_id"],
            "replaced": replaced,
            "old_public_id": old_public_id,
        }

    except ImageValidationError:
        # Defensive — validation shouldn't reach here since it runs
        # before the try, but re-raise cleanly if it ever does.
        raise

    except Exception as e:
        logger.exception("Error in upload_or_replace_profile_image: %s", e)
        raise Exception(f"Profile image upload failed: {str(e)}")


# ============================================================
# SERVICE IMAGES — BULK UPLOAD
# ============================================================

def bulk_upload_service_images(
    image_files,
    service_id,
    folder="service_images",
):
    """
    Upload multiple images for a service listing.

    Each image is validated individually; invalid images are
    recorded in `failed` and skipped.
    """

    uploaded = []
    failed = []
    timestamp = int(time.time())

    for idx, image_file in enumerate(image_files or []):
        file_name = getattr(image_file, "name", "?")

        try:
            _validate_image_file(image_file)
        except ImageValidationError as e:
            failed.append({
                "name": file_name,
                "error": str(e),
                "reason": "invalid_image",
            })
            continue

        try:
            public_id = f"service_{service_id}_{timestamp}_{idx}"

            result = upload_image_to_cloudinary(
                image_file,
                folder=folder,
                public_id=public_id,
                validate=False,
            )

            uploaded.append(result)

        except Exception as e:
            logger.warning("Failed to upload %s: %s", file_name, e)
            failed.append({
                "name": file_name,
                "error": str(e),
                "reason": "upload_failed",
            })

    return {"uploaded": uploaded, "failed": failed}


# ============================================================
# SERVICE IMAGES — BULK DELETE
# ============================================================

def bulk_delete_service_images(public_ids):
    """
    Delete multiple Cloudinary assets by public_id.
    """
    return bulk_delete_images_from_cloudinary(public_ids)