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


def upload_image_to_cloudinary(image_file, folder="profile_images", public_id=None):
    """
    Upload an image to Cloudinary
    
    Args:
        image_file: The image file (Django InMemoryUploadedFile or file object)
        folder: Folder name in Cloudinary (default: "profile_images")
        public_id: Optional custom public_id (if None, Cloudinary generates one)
    
    Returns:
        dict: {
            'url': str,           # Secure URL of the uploaded image
            'public_id': str,     # Public ID for future operations
            'format': str,        # Image format
            'width': int,         # Image width
            'height': int,        # Image height
            'bytes': int,         # File size in bytes
            'created_at': str,    # Upload timestamp
            'secure_url': str     # Secure URL (same as url)
        }
    """
    try:
        # Prepare upload options
        upload_options = {
            'folder': folder,
            'use_filename': True,
            'unique_filename': True,
            'overwrite': True,
            'resource_type': 'image',
            'allowed_formats': ['jpg', 'jpeg', 'png', 'gif', 'webp']
        }
        
        # Add custom public_id if provided
        if public_id:
            upload_options['public_id'] = public_id
        
        # Upload the image
        result = cloudinary.uploader.upload(image_file, **upload_options)
        
        # Extract relevant data
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
            'etag': result.get('etag')
        }
        
    except Exception as e:
        print(f"❌ Error uploading to Cloudinary: {str(e)}")
        raise Exception(f"Cloudinary upload failed: {str(e)}")


def delete_image_from_cloudinary(public_id):
    """
    Delete an image from Cloudinary using its public_id
    
    Args:
        public_id: The public_id of the image to delete
    
    Returns:
        dict: {
            'result': str,        # 'ok' if successful
            'public_id': str,     # The public_id that was deleted
        }
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        
        if result.get('result') == 'ok':
            return {
                'result': 'ok',
                'public_id': public_id
            }
        else:
            raise Exception(f"Failed to delete image: {result.get('result')}")
            
    except Exception as e:
        print(f"❌ Error deleting from Cloudinary: {str(e)}")
        raise Exception(f"Cloudinary delete failed: {str(e)}")


def delete_user_all_images(user):
    """
    Delete all Cloudinary images associated with a user
    This includes profile images and any other images stored for the user
    
    Args:
        user: The user object (must have profile_image_public_id field)
    
    Returns:
        dict: {
            'deleted': bool,
            'public_id_deleted': str or None,
            'message': str
        }
    """
    deleted = False
    public_id_deleted = None
    
    try:
        if user.profile_image_public_id:
            print(f"🗑️ Deleting profile image: {user.profile_image_public_id}")
            delete_result = delete_image_from_cloudinary(user.profile_image_public_id)
            if delete_result.get('result') == 'ok':
                deleted = True
                public_id_deleted = user.profile_image_public_id
                print(f"✅ Profile image deleted successfully")
            else:
                print(f"⚠️ Failed to delete profile image: {delete_result}")
        else:
            print("ℹ️ No profile image to delete")
        
        return {
            'deleted': deleted,
            'public_id_deleted': public_id_deleted,
            'message': 'Profile image deleted' if deleted else 'No image to delete'
        }
        
    except Exception as e:
        print(f"❌ Error deleting user images: {str(e)}")
        return {
            'deleted': False,
            'public_id_deleted': None,
            'message': f'Error deleting images: {str(e)}'
        }


def upload_or_replace_profile_image(image_file, user, folder="profile_images"):
    """
    Upload a profile image for a user.
    If the user already has a profile image, it will be deleted and replaced.
    If not, it will just upload the new image.
    
    Args:
        image_file: The image file to upload
        user: The user object (must have profile_image_public_id field)
        folder: Folder name in Cloudinary (default: "profile_images")
    
    Returns:
        dict: {
            'url': str,           # URL of the uploaded image
            'public_id': str,     # Public ID of the uploaded image
            'replaced': bool,     # Whether an existing image was replaced
            'old_public_id': str  # The old public_id if replaced, else None
        }
    """
    old_public_id = None
    replaced = False
    
    try:
        # Check if user already has a profile image
        if user.profile_image_public_id:
            old_public_id = user.profile_image_public_id
            print(f"🔄 Existing profile image found: {old_public_id}")
            
            # Delete the old image from Cloudinary
            try:
                delete_result = delete_image_from_cloudinary(old_public_id)
                if delete_result.get('result') == 'ok':
                    print(f"✅ Old image deleted successfully: {old_public_id}")
                    replaced = True
                else:
                    print(f"⚠️ Failed to delete old image: {delete_result}")
            except Exception as e:
                print(f"⚠️ Error deleting old image: {str(e)}")
                # Continue with upload even if delete fails
        
        # Generate a unique public_id for the user
        public_id = f"user_{user.id}_profile_{int(time.time())}"
        
        # Upload the new image
        upload_result = upload_image_to_cloudinary(
            image_file,
            folder=folder,
            public_id=public_id
        )
        
        print(f"✅ New image uploaded successfully: {upload_result['public_id']}")
        
        # Update user with new image details
        user.profile_image_url = upload_result['url']
        user.profile_image_public_id = upload_result['public_id']
        user.save()
        
        return {
            'url': upload_result['url'],
            'public_id': upload_result['public_id'],
            'replaced': replaced,
            'old_public_id': old_public_id
        }
        
    except Exception as e:
        print(f"❌ Error in upload_or_replace_profile_image: {str(e)}")
        raise Exception(f"Profile image upload failed: {str(e)}")