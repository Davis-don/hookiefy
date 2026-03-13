import cloudinary
import cloudinary.uploader
import cloudinary.api
from django.conf import settings
import logging
import re

logger = logging.getLogger(__name__)

def upload_image_to_cloudinary(image_file, return_public_id=False):
    """
    Uploads an image file to Cloudinary.
    
    Args:
        image_file: The image file to upload
        return_public_id: If True, returns dict with url and public_id
    
    Returns:
        If return_public_id is False: URL string or None
        If return_public_id is True: Dict with 'url' and 'public_id' or None
    """
    try:
        # Get credentials from settings
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET
        
        # Configure cloudinary directly in the function
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        
        # Upload the image
        result = cloudinary.uploader.upload(
            image_file,
            folder="client_uploads/",
            overwrite=True,
            resource_type="image"
        )
        
        public_url = result.get("secure_url")
        public_id = result.get("public_id")
        
        print(f"Cloudinary URL: {public_url}")
        print(f"Public ID: {public_id}")
        
        if return_public_id:
            return {
                "url": public_url,
                "public_id": public_id
            }
        return public_url
        
    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        logger.error(f"Cloudinary upload failed: {e}")
        return None

def delete_image_from_cloudinary(image_url=None, public_id=None):
    """
    Deletes an image from Cloudinary.
    
    Can accept either:
    - image_url: The full Cloudinary URL
    - public_id: The Cloudinary public ID directly
    
    Returns True if deletion was successful, False otherwise.
    """
    try:
        # Get credentials from settings
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET
        
        # Configure cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        
        # Extract public_id from URL if URL is provided
        if image_url and not public_id:
            public_id = extract_public_id_from_url(image_url)
            if not public_id:
                print(f"Could not extract public_id from URL: {image_url}")
                return False
        
        if not public_id:
            print("No public_id or valid URL provided for deletion")
            return False
        
        # Delete the image
        result = cloudinary.uploader.destroy(public_id)
        
        # Check deletion result
        if result.get("result") == "ok":
            print(f"Successfully deleted image with public_id: {public_id}")
            return True
        else:
            print(f"Failed to delete image. Cloudinary response: {result}")
            return False
            
    except Exception as e:
        print(f"Error deleting image from Cloudinary: {e}")
        logger.error(f"Cloudinary deletion failed: {e}")
        return False

def extract_public_id_from_url(image_url):
    """
    Extracts the public_id from a Cloudinary URL.
    
    Example URL: https://res.cloudinary.com/deldh4sxe/image/upload/v1234567890/client_uploads/image_name.jpg
    Extracted public_id: client_uploads/image_name
    """
    try:
        # Regular expression to extract public_id
        # Matches everything after /upload/ and before file extension
        pattern = r'/upload/(?:v\d+/)?(.+?)(?:\.[a-zA-Z0-9]+)?$'
        match = re.search(pattern, image_url)
        
        if match:
            public_id = match.group(1)
            # Remove version if present (v1234567890/)
            if public_id.startswith('v') and '/' in public_id:
                public_id = public_id.split('/', 1)[1]
            return public_id
        else:
            # Alternative extraction method for different URL formats
            # Split URL and get the part after 'upload/'
            if '/upload/' in image_url:
                parts = image_url.split('/upload/')
                if len(parts) > 1:
                    path_parts = parts[1].split('/')
                    # Skip version if present
                    if path_parts[0].startswith('v') and path_parts[0][1:].isdigit():
                        path_parts = path_parts[1:]
                    # Remove file extension
                    last_part = path_parts[-1].split('.')[0]
                    path_parts[-1] = last_part
                    return '/'.join(path_parts)
            return None
    except Exception as e:
        print(f"Error extracting public_id from URL: {e}")
        return None

def delete_multiple_images_from_cloudinary(image_urls=None, public_ids=None):
    """
    Deletes multiple images from Cloudinary in a single request.
    
    Can accept either:
    - image_urls: List of Cloudinary URLs
    - public_ids: List of Cloudinary public IDs directly
    
    Returns dictionary with success and failure counts.
    """
    try:
        # Get credentials from settings
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET
        
        # Configure cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        
        public_ids_to_delete = []
        
        # Extract public_ids from URLs if URLs are provided
        if image_urls and not public_ids:
            for url in image_urls:
                public_id = extract_public_id_from_url(url)
                if public_id:
                    public_ids_to_delete.append(public_id)
        elif public_ids:
            public_ids_to_delete = public_ids
        
        if not public_ids_to_delete:
            print("No valid public_ids found for deletion")
            return {"success": 0, "failed": 0, "total": 0}
        
        # Delete multiple images
        result = cloudinary.api.delete_resources(public_ids_to_delete)
        
        deleted = result.get("deleted", {})
        deleted_count = len([v for v in deleted.values() if v == "deleted"])
        failed_count = len(public_ids_to_delete) - deleted_count
        
        print(f"Successfully deleted {deleted_count} images, failed: {failed_count}")
        
        return {
            "success": deleted_count,
            "failed": failed_count,
            "total": len(public_ids_to_delete),
            "details": deleted
        }
        
    except Exception as e:
        print(f"Error deleting multiple images from Cloudinary: {e}")
        logger.error(f"Cloudinary bulk deletion failed: {e}")
        return {"success": 0, "failed": len(public_ids_to_delete) if public_ids_to_delete else 0, "total": len(public_ids_to_delete) if public_ids_to_delete else 0}

def get_image_info(image_url=None, public_id=None):
    """
    Gets information about an image from Cloudinary.
    
    Can accept either:
    - image_url: The full Cloudinary URL
    - public_id: The Cloudinary public ID directly
    
    Returns image info dict or None if failed.
    """
    try:
        # Get credentials from settings
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET
        
        # Configure cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        
        # Extract public_id from URL if URL is provided
        if image_url and not public_id:
            public_id = extract_public_id_from_url(image_url)
            if not public_id:
                print(f"Could not extract public_id from URL: {image_url}")
                return None
        
        if not public_id:
            print("No public_id or valid URL provided")
            return None
        
        # Get image info
        result = cloudinary.api.resource(public_id)
        return result
        
    except Exception as e:
        print(f"Error getting image info from Cloudinary: {e}")
        logger.error(f"Cloudinary get info failed: {e}")
        return None