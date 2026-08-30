# system_admin/views.py
# ============================================================
# System Admin Views - Create System Admin
# ============================================================

import os
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import render

from .Createsystemadmin import SystemAdminService
from account.models import Accounts

logger = logging.getLogger(__name__)


# ============================================================
# PERMISSION CHECK HELPER
# ============================================================

def is_superadmin(user):
    """
    Check if the user is a superadmin.
    
    Args:
        user: The user object from request
    
    Returns:
        bool: True if user is superadmin, False otherwise
    """
    if not user or not user.is_authenticated:
        return False
    return user.role == 'superadmin'


def check_superadmin_permission(request):
    """
    Check if the request user is a superadmin.
    Returns (is_allowed, error_response)
    """
    user = request.user
    
    if not user.is_authenticated:
        return False, Response({
            'success': False,
            'message': 'Authentication required. Please log in.',
            'error_code': 'AUTH_REQUIRED'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    if not is_superadmin(user):
        logger.warning(f"⚠️ Unauthorized attempt to access system admin API by user: {user.email} (role: {user.role})")
        return False, Response({
            'success': False,
            'message': 'Permission denied. Only superadmins can manage system admin.',
            'error_code': 'PERMISSION_DENIED',
            'user_role': user.role
        }, status=status.HTTP_403_FORBIDDEN)
    
    return True, None


# ============================================================
# CREATE/UPDATE SYSTEM ADMIN VIEW (SUPERADMIN ONLY)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_system_admin(request):
    """
    Create or update a system admin user.
    Credentials are read from environment variables.
    ONLY SUPERADMINS CAN ACCESS THIS ENDPOINT.
    
    Request Body (optional):
        {
            "force": false  # If true, update existing admin
        }
    
    Returns:
        {
            "success": bool,
            "message": str,
            "user": {
                "id": int,
                "email": str,
                "role": str,
                "full_name": str
            } or null,
            "created": bool,
            "updated": bool
        }
    """
    # Check superadmin permission
    is_allowed, error_response = check_superadmin_permission(request)
    if not is_allowed:
        return error_response
    
    # Get force flag from request
    force = request.data.get('force', False)
    
    logger.info(f"🔐 Superadmin {request.user.email} is creating/updating system admin (force={force})")
    
    # Create or update system admin
    result = SystemAdminService.create_system_admin(force=force)
    
    if result['success']:
        user_data = None
        if result['user']:
            user_data = {
                'id': result['user'].id,
                'email': result['user'].email,
                'role': result['user'].role,
                'full_name': result['user'].full_name,
                'is_staff': result['user'].is_staff,
                'is_superuser': result['user'].is_superuser,
            }
        
        return Response({
            'success': True,
            'message': result['message'],
            'user': user_data,
            'created': result.get('created', False),
            'updated': result.get('updated', False),
        }, status=status.HTTP_201_CREATED if result.get('created') else status.HTTP_200_OK)
    
    return Response({
        'success': False,
        'message': result['message'],
        'user': None,
        'created': False,
        'updated': False,
    }, status=status.HTTP_400_BAD_REQUEST)