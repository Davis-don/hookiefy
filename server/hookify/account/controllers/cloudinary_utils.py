# controllers/cloudinary_utils.py

import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
import os
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)


# ============================================================
# SINGLE IMAGE — UPLOAD
# ============================================================

def upload_image_to_cloudinary(
    image_file,
    folder="profile_images",
    public_id=None,
):
    """
    Upload a single image to Cloudinary.

    Returns a dict with url, public_id, format, dimensions, etc.
    """

    try:
        upload_options = {
            'folder': folder,
            'use_filename': True,
            'unique_filename': True,
            'overwrite': True,
            'resource_type': 'image',
            'allowed_formats': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        }

        if public_id:
            upload_options['public_id'] = public_id

        result = cloudinary.uploader.upload(image_file, **upload_options)

        return {
            'url': result.get('secure_url'),
            'public_id': result.get('public_id'),
            'format': result.get('format'),
            'width': result.get('width'),
            'height': result.get('height'),
            'bytes': result.get('bytes'),
            'created_at': result.get('created_at'),
            'secure_url': result.get('secure_url'),
            'version': result.get('version'),
            'etag': result.get('etag'),
        }

    except Exception as e:
        print(f"❌ Error uploading to Cloudinary: {str(e)}")
        raise Exception(f"Cloudinary upload failed: {str(e)}")


# ============================================================
# SINGLE IMAGE — DELETE
# ============================================================

def delete_image_from_cloudinary(public_id):
    """
    Delete a single image from Cloudinary by its public_id.
    """

    try:
        result = cloudinary.uploader.destroy(public_id)

        if result.get('result') == 'ok':
            return {
                'result': 'ok',
                'public_id': public_id,
            }

        raise Exception(
            f"Failed to delete image: {result.get('result')}"
        )

    except Exception as e:
        print(f"❌ Error deleting from Cloudinary: {str(e)}")
        raise Exception(f"Cloudinary delete failed: {str(e)}")


# ============================================================
# USER — DELETE ALL IMAGES (profile)
# ============================================================

def delete_user_all_images(user):
    """
    Delete all Cloudinary images associated with a user.
    Currently only the profile image; extend if more are
    added in the future.
    """

    deleted = False
    public_id_deleted = None

    try:
        if user.profile_image_public_id:
            print(f"🗑️ Deleting profile image: {user.profile_image_public_id}")
            delete_result = delete_image_from_cloudinary(
                user.profile_image_public_id
            )
            if delete_result.get('result') == 'ok':
                deleted = True
                public_id_deleted = user.profile_image_public_id
                print("✅ Profile image deleted successfully")
            else:
                print(f"⚠️ Failed to delete profile image: {delete_result}")
        else:
            print("ℹ️ No profile image to delete")

        return {
            'deleted': deleted,
            'public_id_deleted': public_id_deleted,
            'message': 'Profile image deleted' if deleted else 'No image to delete',
        }

    except Exception as e:
        print(f"❌ Error deleting user images: {str(e)}")
        return {
            'deleted': False,
            'public_id_deleted': None,
            'message': f'Error deleting images: {str(e)}',
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
    Upload a profile image. If the user already has one,
    the old Cloudinary asset is deleted first.
    """

    old_public_id = None
    replaced = False

    try:
        if user.profile_image_public_id:
            old_public_id = user.profile_image_public_id
            print(f"🔄 Existing profile image found: {old_public_id}")

            try:
                delete_result = delete_image_from_cloudinary(old_public_id)
                if delete_result.get('result') == 'ok':
                    print(f"✅ Old image deleted successfully: {old_public_id}")
                    replaced = True
                else:
                    print(f"⚠️ Failed to delete old image: {delete_result}")
            except Exception as e:
                print(f"⚠️ Error deleting old image: {str(e)}")

        public_id = f"user_{user.id}_profile_{int(time.time())}"

        upload_result = upload_image_to_cloudinary(
            image_file,
            folder=folder,
            public_id=public_id,
        )

        print(f"✅ New image uploaded successfully: {upload_result['public_id']}")

        user.profile_image_url = upload_result['url']
        user.profile_image_public_id = upload_result['public_id']
        user.save()

        return {
            'url': upload_result['url'],
            'public_id': upload_result['public_id'],
            'replaced': replaced,
            'old_public_id': old_public_id,
        }

    except Exception as e:
        print(f"❌ Error in upload_or_replace_profile_image: {str(e)}")
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

    Args:
        image_files: list of Django UploadedFile objects
        service_id:  id of the ClientService (used in public_id)
        folder:      Cloudinary folder (default 'service_images')

    Returns:
        {
            'uploaded': [ { url, public_id, ... }, ... ],
            'failed':   [ { name, error }, ... ],
        }

    Each uploaded item gets a unique public_id of the form:

        service_{service_id}_{timestamp}_{index}
    """

    uploaded = []
    failed = []
    timestamp = int(time.time())

    for idx, image_file in enumerate(image_files or []):
        try:
            public_id = (
                f"service_{service_id}_{timestamp}_{idx}"
            )

            result = upload_image_to_cloudinary(
                image_file,
                folder=folder,
                public_id=public_id,
            )

            uploaded.append(result)

        except Exception as e:
            print(f"❌ Failed to upload {getattr(image_file, 'name', '?')}: {e}")
            failed.append({
                'name': getattr(image_file, 'name', '?'),
                'error': str(e),
            })

    return {
        'uploaded': uploaded,
        'failed': failed,
    }


# ============================================================
# SERVICE IMAGES — BULK DELETE
# ============================================================

def bulk_delete_service_images(public_ids):
    """
    Delete multiple Cloudinary assets by public_id.

    Args:
        public_ids: list of public_id strings

    Returns:
        {
            'deleted': [public_id, ...],
            'failed':  [ { public_id, error }, ... ],
        }
    """

    deleted = []
    failed = []

    for public_id in public_ids or []:
        if not public_id:
            continue

        try:
            result = delete_image_from_cloudinary(public_id)
            if result.get('result') == 'ok':
                deleted.append(public_id)
            else:
                failed.append({
                    'public_id': public_id,
                    'error': 'unexpected response',
                })
        except Exception as e:
            print(f"❌ Failed to delete {public_id}: {e}")
            failed.append({
                'public_id': public_id,
                'error': str(e),
            })

    return {
        'deleted': deleted,
        'failed': failed,
    }