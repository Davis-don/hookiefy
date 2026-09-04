# adverts/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import models as django_models

from .models import Advert
from .serializers import AdvertSerializer, AdvertCreateSerializer
from account.controllers.cloudinary_utils import upload_image_to_cloudinary, delete_image_from_cloudinary
import time


# ============================================================
# HELPER: Check if user is superadmin
# ============================================================

def is_superadmin(user):
    """Check if user has superadmin role"""
    return user.role == 'superadmin'


# ============================================================
# CREATE ADVERT WITH EXTERNAL URL (NO CLOUDINARY)
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_advert_url(request):
    """
    Create an advert using external URL (image or video).
    No Cloudinary upload - just stores the URL.
    SUPERADMIN ONLY
    """
    try:
        # Check if user is superadmin
        if not is_superadmin(request.user):
            return Response({
                "message": "Permission denied. Only superadmin can create adverts."
            }, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        
        # Ensure public_id is null for URL-based uploads
        data['public_id'] = None
        
        # Validate media type
        if data.get('type') not in ['image', 'video']:
            return Response({
                "message": "Invalid media type. Must be 'image' or 'video'"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = AdvertCreateSerializer(data=data)
        
        if serializer.is_valid():
            advert = serializer.save()
            
            return Response({
                "message": "Advert created successfully",
                "data": AdvertSerializer(advert).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        print(f"❌ Error creating URL advert: {str(e)}")
        return Response({
            "message": f"Failed to create advert: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# CREATE ADVERT WITH CLOUDINARY UPLOAD (IMAGES ONLY)
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_advert_cloudinary(request):
    """
    Create an advert by uploading image to Cloudinary.
    Videos are NOT allowed for Cloudinary upload.
    SUPERADMIN ONLY
    """
    try:
        # Check if user is superadmin
        if not is_superadmin(request.user):
            return Response({
                "message": "Permission denied. Only superadmin can create adverts."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if image file is provided
        if 'image_file' not in request.FILES:
            return Response({
                "message": "No image file provided"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image_file']
        
        # Validate file type - only images allowed
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
        if image_file.content_type not in allowed_types:
            return Response({
                "message": f"Invalid file type. Only images (JPEG, PNG, GIF, WEBP) are allowed. Got: {image_file.content_type}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 10MB)
        if image_file.size > 10 * 1024 * 1024:
            return Response({
                "message": "Image file size must be under 10MB"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get title and description from request
        title = request.data.get('title')
        if not title:
            return Response({
                "message": "Title is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        description = request.data.get('description', '')
        
        # Generate unique public_id
        public_id = f"advert_{int(time.time())}_{image_file.name.replace(' ', '_')}"
        
        print(f"📸 Uploading image to Cloudinary: {public_id}")
        
        # Upload to Cloudinary
        upload_result = upload_image_to_cloudinary(
            image_file,
            folder="adverts",
            public_id=public_id
        )
        
        print(f"✅ Upload successful: {upload_result['public_id']}")
        
        # Create the advert
        advert = Advert(
            title=title,
            description=description,
            url=upload_result['secure_url'],
            type='image',  # Force image type for Cloudinary uploads
            public_id=upload_result['public_id']
        )
        advert.save()
        
        return Response({
            "message": "Advert uploaded to Cloudinary successfully",
            "data": {
                **AdvertSerializer(advert).data,
                "cloudinary_details": {
                    "public_id": upload_result['public_id'],
                    "format": upload_result.get('format'),
                    "width": upload_result.get('width'),
                    "height": upload_result.get('height'),
                    "bytes": upload_result.get('bytes'),
                    "version": upload_result.get('version'),
                }
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"❌ Error creating Cloudinary advert: {str(e)}")
        return Response({
            "message": f"Cloudinary upload failed: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# GET ALL ADVERTS (PAGINATED) - PUBLIC ACCESS
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])  # Public access - no authentication required
def get_all_adverts(request):
    """
    Get all adverts with pagination.
    Supports filtering by type (image/video).
    PUBLIC ACCESS - No authentication required
    """
    try:
        # Get filter parameters
        media_type = request.GET.get('type')
        search = request.GET.get('search')
        
        # Base queryset
        queryset = Advert.objects.all().order_by('-created_at')
        
        # Apply filters
        if media_type and media_type in ['image', 'video']:
            queryset = queryset.filter(type=media_type)
        
        if search:
            queryset = queryset.filter(
                django_models.Q(title__icontains=search) |
                django_models.Q(description__icontains=search)
            )
        
        # Pagination
        page = request.GET.get('page', 1)
        page_size = request.GET.get('page_size', 10)
        
        try:
            page = int(page)
            page_size = int(page_size)
            if page_size > 100:
                page_size = 100
        except ValueError:
            page = 1
            page_size = 10
        
        paginator = Paginator(queryset, page_size)
        total_pages = paginator.num_pages
        total_count = paginator.count
        
        try:
            adverts_page = paginator.page(page)
        except PageNotAnInteger:
            adverts_page = paginator.page(1)
        except EmptyPage:
            adverts_page = paginator.page(paginator.num_pages)
        
        # Serialize data
        data = AdvertSerializer(adverts_page, many=True).data
        
        return Response({
            "message": "Adverts fetched successfully",
            "count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": adverts_page.has_next(),
            "has_previous": adverts_page.has_previous(),
            "data": data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error fetching adverts: {str(e)}")
        return Response({
            "message": f"Failed to fetch adverts: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# GET SINGLE ADVERT - PUBLIC ACCESS
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])  # Public access - no authentication required
def get_advert_by_id(request, advert_id):
    """
    Get a single advert by ID
    PUBLIC ACCESS - No authentication required
    """
    try:
        advert = get_object_or_404(Advert, id=advert_id)
        serializer = AdvertSerializer(advert)
        
        return Response({
            "message": "Advert fetched successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    except Advert.DoesNotExist:
        return Response({
            "message": "Advert not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"❌ Error fetching advert: {str(e)}")
        return Response({
            "message": f"Failed to fetch advert: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# UPDATE ADVERT
# ============================================================

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def update_advert(request, advert_id):
    """
    Update an advert.
    - If Cloudinary-based, can update image by uploading new one
    - If URL-based, can update URL and other fields
    SUPERADMIN ONLY
    """
    try:
        # Check if user is superadmin
        if not is_superadmin(request.user):
            return Response({
                "message": "Permission denied. Only superadmin can update adverts."
            }, status=status.HTTP_403_FORBIDDEN)
        
        advert = get_object_or_404(Advert, id=advert_id)
        
        # Check if this is a Cloudinary-based advert and wants to update image
        if 'image_file' in request.FILES:
            # Cloudinary-based update - replace image
            if advert.type != 'image':
                return Response({
                    "message": "Cannot upload image for video advert. Use URL update instead."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            image_file = request.FILES['image_file']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
            if image_file.content_type not in allowed_types:
                return Response({
                    "message": f"Invalid file type. Only images allowed"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete old image from Cloudinary if exists
            if advert.public_id:
                try:
                    delete_image_from_cloudinary(advert.public_id)
                    print(f"🗑️ Deleted old image: {advert.public_id}")
                except Exception as e:
                    print(f"⚠️ Failed to delete old image: {str(e)}")
            
            # Upload new image
            public_id = f"advert_{advert_id}_{int(time.time())}"
            upload_result = upload_image_to_cloudinary(
                image_file,
                folder="adverts",
                public_id=public_id
            )
            
            # Update advert fields
            advert.url = upload_result['secure_url']
            advert.public_id = upload_result['public_id']
            advert.title = request.data.get('title', advert.title)
            advert.description = request.data.get('description', advert.description)
            advert.type = 'image'
            advert.save()
            
            return Response({
                "message": "Advert updated successfully with new image",
                "data": AdvertSerializer(advert).data
            }, status=status.HTTP_200_OK)
        
        else:
            # URL-based update (or update without changing image)
            data = request.data.copy()
            
            # If updating type to video, ensure public_id is cleared
            if data.get('type') == 'video' and advert.public_id:
                # Delete from Cloudinary if it was an image
                try:
                    delete_image_from_cloudinary(advert.public_id)
                    print(f"🗑️ Deleted Cloudinary image: {advert.public_id}")
                except Exception as e:
                    print(f"⚠️ Failed to delete Cloudinary image: {str(e)}")
                data['public_id'] = None
            
            # If updating to image but no file provided, keep existing URL
            if data.get('type') == 'image' and not data.get('url'):
                # If it was a video, we need a URL
                if advert.type == 'video' and not advert.url:
                    return Response({
                        "message": "URL is required for image type"
                    }, status=status.HTTP_400_BAD_REQUEST)
                data['url'] = advert.url
            
            serializer = AdvertCreateSerializer(advert, data=data, partial=True)
            
            if serializer.is_valid():
                advert = serializer.save()
                return Response({
                    "message": "Advert updated successfully",
                    "data": AdvertSerializer(advert).data
                }, status=status.HTTP_200_OK)
            
            return Response({
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Advert.DoesNotExist:
        return Response({
            "message": "Advert not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"❌ Error updating advert: {str(e)}")
        return Response({
            "message": f"Failed to update advert: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# DELETE ADVERT
# ============================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_advert(request, advert_id):
    """
    Delete an advert.
    - If Cloudinary-based, delete image from Cloudinary first
    - Then delete the record from database
    SUPERADMIN ONLY
    """
    try:
        # Check if user is superadmin
        if not is_superadmin(request.user):
            return Response({
                "message": "Permission denied. Only superadmin can delete adverts."
            }, status=status.HTTP_403_FORBIDDEN)
        
        advert = get_object_or_404(Advert, id=advert_id)
        
        # Store info for response
        title = advert.title
        is_cloudinary = bool(advert.public_id)
        public_id = advert.public_id
        
        # Delete from Cloudinary if exists
        if is_cloudinary:
            try:
                delete_result = delete_image_from_cloudinary(public_id)
                if delete_result.get('result') == 'ok':
                    print(f"✅ Deleted image from Cloudinary: {public_id}")
                else:
                    print(f"⚠️ Cloudinary deletion returned: {delete_result}")
            except Exception as e:
                print(f"⚠️ Error deleting from Cloudinary: {str(e)}")
                # Continue with database deletion even if Cloudinary fails
        
        # Delete the advert from database
        advert.delete()
        
        return Response({
            "message": f"Advert '{title}' deleted successfully",
            "deleted": {
                "title": title,
                "was_cloudinary": is_cloudinary,
                "public_id": public_id if is_cloudinary else None
            }
        }, status=status.HTTP_200_OK)
        
    except Advert.DoesNotExist:
        return Response({
            "message": "Advert not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"❌ Error deleting advert: {str(e)}")
        return Response({
            "message": f"Failed to delete advert: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# BULK DELETE ADVERTS
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def bulk_delete_adverts(request):
    """
    Delete multiple adverts at once.
    Handles Cloudinary cleanup for each.
    SUPERADMIN ONLY
    """
    try:
        # Check if user is superadmin
        if not is_superadmin(request.user):
            return Response({
                "message": "Permission denied. Only superadmin can delete adverts."
            }, status=status.HTTP_403_FORBIDDEN)
        
        advert_ids = request.data.get('advert_ids', [])
        
        if not advert_ids:
            return Response({
                "message": "No advert IDs provided"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all adverts
        adverts = Advert.objects.filter(id__in=advert_ids)
        found_count = adverts.count()
        
        if found_count == 0:
            return Response({
                "message": "No adverts found with the provided IDs"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Track results
        deleted_count = 0
        cloudinary_deleted = 0
        errors = []
        
        for advert in adverts:
            try:
                # Delete from Cloudinary if exists
                if advert.public_id:
                    try:
                        delete_image_from_cloudinary(advert.public_id)
                        cloudinary_deleted += 1
                    except Exception as e:
                        errors.append(f"Failed to delete {advert.public_id}: {str(e)}")
                
                # Delete from database
                advert.delete()
                deleted_count += 1
                
            except Exception as e:
                errors.append(f"Failed to delete advert {advert.id}: {str(e)}")
        
        return Response({
            "message": f"Deleted {deleted_count} adverts successfully",
            "deleted_count": deleted_count,
            "cloudinary_deleted": cloudinary_deleted,
            "requested_count": len(advert_ids),
            "errors": errors if errors else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error in bulk delete: {str(e)}")
        return Response({
            "message": f"Failed to delete adverts: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# STATISTICS VIEW - PUBLIC ACCESS
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])  # Public access - no authentication required
def get_advert_stats(request):
    """
    Get statistics about adverts
    PUBLIC ACCESS - No authentication required
    """
    try:
        total = Advert.objects.count()
        image_count = Advert.objects.filter(type='image').count()
        video_count = Advert.objects.filter(type='video').count()
        cloudinary_count = Advert.objects.filter(public_id__isnull=False).count()
        url_count = Advert.objects.filter(public_id__isnull=True).count()
        
        return Response({
            "message": "Advert statistics fetched successfully",
            "data": {
                "total_adverts": total,
                "images": image_count,
                "videos": video_count,
                "cloudinary_uploaded": cloudinary_count,
                "external_urls": url_count,
                "breakdown": {
                    "cloudinary_images": Advert.objects.filter(type='image', public_id__isnull=False).count(),
                    "external_images": Advert.objects.filter(type='image', public_id__isnull=True).count(),
                    "external_videos": Advert.objects.filter(type='video', public_id__isnull=True).count(),
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error fetching stats: {str(e)}")
        return Response({
            "message": f"Failed to fetch stats: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)