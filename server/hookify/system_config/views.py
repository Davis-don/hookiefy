# system_admin/views.py
# ============================================================
# System Admin Views - Create System Admin & Setup Commission
# ============================================================

import os
import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import render

from .Createsystemadmin import handle_create_system_admin
from .setsystemadmincommision import SystemAdminCommissionService
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
# CREATE SYSTEM ADMIN & SETUP COMMISSION (SUPERADMIN ONLY)
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_system_admin(request):
    """
    Create or update a system admin user AND automatically setup their commission.
    Credentials are read from environment variables.
    Commission is automatically set to 100% for admin, 0% for platform.
    ONLY SUPERADMINS CAN ACCESS THIS ENDPOINT.
    
    Request Body (optional):
        {
            "force": false  # If true, update existing admin and commission
        }
    
    Returns:
        {
            "success": bool,
            "message": str,
            "user": {
                "id": int,
                "email": str,
                "role": str,
                "full_name": str,
                "is_staff": bool,
                "is_superuser": bool
            } or null,
            "commission": {
                "id": int,
                "admin_id": int,
                "admin_email": str,
                "percentage": float,
                "platform_percentage": float,
                "created_at": str,
                "updated_at": str
            } or null,
            "user_created": bool,
            "user_updated": bool,
            "commission_created": bool,
            "commission_updated": bool,
            "commission_already_exists": bool
        }
    """
    # Check superadmin permission
    is_allowed, error_response = check_superadmin_permission(request)
    if not is_allowed:
        return error_response
    
    # Get force flag from request
    force = request.data.get('force', False)
    
    logger.info("=" * 60)
    logger.info(f"🔐 Superadmin {request.user.email} is creating/updating system admin (force={force})")
    logger.info("=" * 60)
    
    # ============================================================
    # STEP 1: Create or Update System Admin
    # ============================================================
    logger.info("\n📝 STEP 1: Creating/Updating System Admin")
    logger.info("-" * 40)
    
    admin_result = handle_create_system_admin(request)
    
    # Check if admin creation was successful
    if admin_result.status_code >= 400:
        logger.error(f"❌ System admin creation failed: {admin_result.data}")
        return Response({
            'success': False,
            'message': f"System admin creation failed: {admin_result.data.get('message', 'Unknown error')}",
            'user': None,
            'commission': None,
            'user_created': False,
            'user_updated': False,
            'commission_created': False,
            'commission_updated': False,
            'commission_already_exists': False
        }, status=admin_result.status_code)
    
    # Extract admin data from successful response
    admin_data = admin_result.data
    system_admin = admin_data.get('user')
    
    if not system_admin:
        logger.error("❌ System admin user not found in response")
        return Response({
            'success': False,
            'message': "System admin created but user data not found",
            'user': None,
            'commission': None,
            'user_created': admin_data.get('created', False),
            'user_updated': admin_data.get('updated', False),
            'commission_created': False,
            'commission_updated': False,
            'commission_already_exists': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    logger.info(f"✅ System admin created/updated successfully: {system_admin.get('email')}")
    logger.info(f"   Created: {admin_data.get('created', False)}")
    logger.info(f"   Updated: {admin_data.get('updated', False)}")
    
    # ============================================================
    # STEP 2: Setup Commission for System Admin (Auto-run)
    # ============================================================
    logger.info("\n📝 STEP 2: Setting up System Admin Commission")
    logger.info("-" * 40)
    
    # Get the system admin user object for commission setup
    try:
        system_admin_user = Accounts.objects.get(email=system_admin.get('email'))
    except Accounts.DoesNotExist:
        logger.error(f"❌ System admin user not found in database: {system_admin.get('email')}")
        return Response({
            'success': False,
            'message': f"System admin created but user not found: {system_admin.get('email')}",
            'user': system_admin,
            'commission': None,
            'user_created': admin_data.get('created', False),
            'user_updated': admin_data.get('updated', False),
            'commission_created': False,
            'commission_updated': False,
            'commission_already_exists': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Update system admin commission
    commission_result = SystemAdminCommissionService.update_system_admin_commission(force=force)
    
    # Build commission response data
    commission_data = None
    if commission_result['success'] and commission_result['commission']:
        commission = commission_result['commission']
        commission_data = {
            'id': commission.id,
            'admin_id': commission.admin.id,
            'admin_email': commission.admin.email,
            'percentage': float(commission.percentage),
            'platform_percentage': float(commission.platform_percentage),
            'created_at': commission.created_at,
            'updated_at': commission.updated_at,
        }
    
    # ============================================================
    # STEP 3: Build Final Response
    # ============================================================
    logger.info("\n📝 STEP 3: Building Final Response")
    logger.info("-" * 40)
    
    # Build message
    messages = []
    
    if admin_data.get('created'):
        messages.append("System admin created")
    elif admin_data.get('updated'):
        messages.append("System admin password updated")
    
    if commission_result.get('created'):
        messages.append("Commission set to 100%")
    elif commission_result.get('updated'):
        messages.append("Commission updated to 100%")
    elif commission_result.get('already_exists'):
        messages.append("Commission already at 100%")
    
    final_message = " | ".join(messages) if messages else "System admin already exists"
    
    # Determine if overall operation was successful
    overall_success = admin_result.status_code < 400 and commission_result['success']
    
    logger.info(f"✅ Final message: {final_message}")
    logger.info(f"   Overall Success: {overall_success}")
    logger.info("=" * 60)
    
    return Response({
        'success': overall_success,
        'message': final_message,
        'user': system_admin,
        'commission': commission_data,
        'user_created': admin_data.get('created', False),
        'user_updated': admin_data.get('updated', False),
        'commission_created': commission_result.get('created', False),
        'commission_updated': commission_result.get('updated', False),
        'commission_already_exists': commission_result.get('already_exists', False),
    }, status=status.HTTP_201_CREATED if admin_data.get('created') or commission_result.get('created') else status.HTTP_200_OK)