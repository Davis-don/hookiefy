from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
import logging

from .utils import upload_image_to_cloudinary, delete_image_from_cloudinary
from .models import Bio
from accounts.models import ClientProfile

logger = logging.getLogger(__name__)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def client_upload_image(request):
    """
    Endpoint for clients only to upload an image.
    Receives image, uploads to Cloudinary, and saves URL to Bio.
    If there's an existing image, it will be deleted first.
    If database save fails, deletes the new image from Cloudinary.
    """
    user = request.user

    # Only allow clients
    if not hasattr(user, "client_profile"):
        return Response(
            {"error": "Only clients can upload images"},
            status=status.HTTP_403_FORBIDDEN
        )

    uploaded_file = request.FILES.get("image")
    if not uploaded_file:
        return Response(
            {"error": "No image received"},
            status=status.HTTP_400_BAD_REQUEST
        )

    client_profile = user.client_profile
    
    # Get or create bio
    bio, created = Bio.objects.get_or_create(
        client_profile=client_profile,
        defaults={
            'age': 0,
            'gender': 'prefer_not_say',
            'country': 'Kenya',
            'county': '',
            'location_desc': '',
            'info': '',
        }
    )

    # Store old image info for potential rollback
    old_public_id = bio.uploaded_img_public_id if bio.uploaded_img_public_id else None
    old_url = bio.uploaded_img if bio.uploaded_img else None

    # Step 1: Upload new image to Cloudinary
    upload_result = upload_image_to_cloudinary(uploaded_file, return_public_id=True)
    
    if not upload_result:
        return Response(
            {"error": "Failed to upload image to Cloudinary"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    public_url = upload_result.get("url")
    public_id = upload_result.get("public_id")

    # Step 2: Try to save to database
    try:
        with transaction.atomic():
            # Update image fields
            bio.uploaded_img = public_url
            bio.uploaded_img_public_id = public_id
            bio.save()

            # Step 3: If there was an old image, delete it from Cloudinary
            if old_public_id:
                delete_image_from_cloudinary(public_id=old_public_id)
                logger.info(f"Deleted old image: {old_public_id}")

        # Success - return response
        return Response(
            {
                "success": True,
                "filename": uploaded_file.name,
                "size_bytes": uploaded_file.size,
                "cloudinary_url": public_url,
                "cloudinary_public_id": public_id,
                "message": "Image uploaded and saved to profile successfully",
                "previous_image_deleted": bool(old_public_id)
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        # Step 4: Database save failed - delete new image from Cloudinary
        logger.error(f"Database save failed, deleting new image from Cloudinary: {e}")
        delete_success = delete_image_from_cloudinary(public_id=public_id)
        
        # Step 5: Restore old image info if it existed
        if old_public_id and old_url:
            bio.uploaded_img = old_url
            bio.uploaded_img_public_id = old_public_id
            bio.save()
            logger.info(f"Restored old image: {old_public_id}")
        
        error_detail = {
            "error": "Failed to save image to database",
            "database_error": str(e),
            "cloudinary_rollback": "successful" if delete_success else "failed",
            "previous_image_restored": bool(old_public_id)
        }
        
        return Response(
            error_detail,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def client_update_bio(request):
    """
    Endpoint for clients to update their bio information.
    All fields are optional - only provided fields will be updated.
    """
    user = request.user

    # Only allow clients
    if not hasattr(user, "client_profile"):
        return Response(
            {"error": "Only clients can update bio"},
            status=status.HTTP_403_FORBIDDEN
        )

    client_profile = user.client_profile
    
    # Get or create bio
    bio, created = Bio.objects.get_or_create(
        client_profile=client_profile,
        defaults={
            'age': 0,
            'gender': 'prefer_not_say',
            'country': 'Kenya',
            'county': '',
            'location_desc': '',
            'info': '',
        }
    )

    # Fields that can be updated
    updatable_fields = [
        'age', 'gender', 'country', 'county', 'location_desc',
        'info', 'phone_number', 'date_of_birth', 'occupation', 'interests'
    ]

    updated_fields = []
    for field in updatable_fields:
        if field in request.data:
            value = request.data[field]
            setattr(bio, field, value)
            updated_fields.append(field)

    # Save if any fields were updated
    if updated_fields:
        bio.save()

    # Return the updated bio
    return Response(
        {
            "success": True,
            "message": "Bio updated successfully",
            "updated_fields": updated_fields,
            "bio": {
                "age": bio.age,
                "gender": bio.gender,
                "country": bio.country,
                "county": bio.county,
                "location_desc": bio.location_desc,
                "info": bio.info,
                "phone_number": bio.phone_number,
                "occupation": bio.occupation,
                "interests": bio.interests,
                "uploaded_img": bio.uploaded_img,
                "has_image": bool(bio.uploaded_img)
            }
        },
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def client_get_bio(request):
    """
    Endpoint for clients to retrieve their bio information.
    """
    user = request.user

    # Only allow clients
    if not hasattr(user, "client_profile"):
        return Response(
            {"error": "Only clients can view bio"},
            status=status.HTTP_403_FORBIDDEN
        )

    client_profile = user.client_profile
    
    try:
        bio = Bio.objects.get(client_profile=client_profile)
        
        return Response(
            {
                "success": True,
                "bio": {
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "age": bio.age,
                    "gender": bio.gender,
                    "country": bio.country,
                    "county": bio.county,
                    "location_desc": bio.location_desc,
                    "info": bio.info,
                    "phone_number": bio.phone_number,
                    "date_of_birth": bio.date_of_birth,
                    "occupation": bio.occupation,
                    "interests": bio.interests,
                    "uploaded_img": bio.uploaded_img,
                    "uploaded_img_public_id": bio.uploaded_img_public_id,
                    "is_verified": bio.is_verified,
                    "created_at": bio.created_at,
                    "updated_at": bio.updated_at
                }
            },
            status=status.HTTP_200_OK
        )
        
    except Bio.DoesNotExist:
        return Response(
            {
                "success": True,
                "bio": None,
                "message": "No bio found for this client"
            },
            status=status.HTTP_200_OK
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def client_delete_image(request):
    """
    Endpoint for clients to delete their profile image.
    Deletes from Cloudinary and clears the URL from Bio.
    """
    user = request.user

    # Only allow clients
    if not hasattr(user, "client_profile"):
        return Response(
            {"error": "Only clients can delete images"},
            status=status.HTTP_403_FORBIDDEN
        )

    client_profile = user.client_profile
    
    try:
        bio = Bio.objects.get(client_profile=client_profile)
        
        if not bio.uploaded_img_public_id:
            return Response(
                {"error": "No image to delete"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete from Cloudinary
        public_id = bio.uploaded_img_public_id
        delete_success = delete_image_from_cloudinary(public_id=public_id)
        
        if delete_success:
            # Clear the image fields in database
            bio.uploaded_img = None
            bio.uploaded_img_public_id = None
            bio.save()
            
            return Response(
                {
                    "success": True,
                    "message": "Image deleted successfully"
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"error": "Failed to delete image from Cloudinary"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Bio.DoesNotExist:
        return Response(
            {"error": "No bio found for this client"},
            status=status.HTTP_404_NOT_FOUND
        )