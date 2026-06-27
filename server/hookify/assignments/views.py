from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from .models import ClientAssignment

User = get_user_model()

# ============================================
# ASSIGNMENT VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assigned_users(request):
    """
    Get all users (clients) assigned to the currently logged in admin/superadmin
    with pagination support
    """
    current_user = request.user
    
    # Only admin or superadmin can view assigned users
    if current_user.role not in ['admin', 'superadmin']:
        return Response(
            {"message": "Only admin or superadmin can view assigned users"},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all assignments where current user is the admin
    assignments = ClientAssignment.objects.filter(
        assigned_admin=current_user
    ).select_related('user').order_by('-assigned_at')
    
    # Pagination parameters
    page = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 10)
    
    try:
        page = int(page)
        page_size = int(page_size)
        if page_size > 100:
            page_size = 100  # Limit max page size
    except ValueError:
        page = 1
        page_size = 10
    
    # Paginate
    paginator = Paginator(assignments, page_size)
    total_pages = paginator.num_pages
    total_count = paginator.count
    
    try:
        assignments_page = paginator.page(page)
    except PageNotAnInteger:
        assignments_page = paginator.page(1)
    except EmptyPage:
        assignments_page = paginator.page(paginator.num_pages)
    
    # Serialize data
    data = []
    for assignment in assignments_page:
        user = assignment.user
        data.append({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "gender": user.gender,
            "profile_image_url": user.profile_image_url,
            "has_profile_image": user.has_profile_image,
            "is_active": user.is_active,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
            "assigned_at": assignment.assigned_at,
            "updated_at": assignment.updated_at,
        })
    
    return Response({
        "message": f"Users assigned to {current_user.full_name} fetched successfully",
        "count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": assignments_page.has_next(),
        "has_previous": assignments_page.has_previous(),
        "data": data
    })