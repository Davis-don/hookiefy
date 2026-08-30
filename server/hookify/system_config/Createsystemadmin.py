# system_admin/Createsystemadmin.py
# ============================================================
# System Admin Service - Create System Admin User
# ============================================================

import os
import logging
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from rest_framework import status
from rest_framework.response import Response

from account.models import Accounts
from UserBalance.models import UserBalance

logger = logging.getLogger(__name__)


class SystemAdminService:
    """
    Service for creating and managing system admin users.
    System admin is a special admin account used for platform operations.
    """
    
    # Environment variable keys
    ENV_EMAIL_KEY = "SYSTEM_ADMIN_EMAIL"
    ENV_PASSWORD_KEY = "SYSTEM_ADMIN_PASSWORD"
    
    @classmethod
    def get_system_admin_credentials(cls):
        """
        Get system admin credentials from environment variables.
        
        Returns:
            dict: {
                'email': str,
                'password': str,
                'exists': bool
            }
        """
        email = os.environ.get(cls.ENV_EMAIL_KEY)
        password = os.environ.get(cls.ENV_PASSWORD_KEY)
        
        return {
            'email': email,
            'password': password,
            'exists': bool(email and password)
        }
    
    @classmethod
    def create_system_admin(cls, force=False):
        """
        Create a system admin user using credentials from environment.
        
        Args:
            force (bool): If True, will update existing system admin credentials.
                         If False, will skip if system admin already exists.
        
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'user': Accounts or None,
                'created': bool,
                'updated': bool
            }
        """
        # Get credentials from environment
        creds = cls.get_system_admin_credentials()
        
        if not creds['exists']:
            logger.error(f"❌ System admin credentials not found in environment.")
            logger.error(f"   Please set {cls.ENV_EMAIL_KEY} and {cls.ENV_PASSWORD_KEY}")
            return {
                'success': False,
                'message': f"System admin credentials not found. Please set {cls.ENV_EMAIL_KEY} and {cls.ENV_PASSWORD_KEY} in environment variables.",
                'user': None,
                'created': False,
                'updated': False
            }
        
        email = creds['email']
        password = creds['password']
        
        # Check if system admin already exists
        try:
            existing_admin = Accounts.objects.get(email=email)
            
            if not force:
                logger.info(f"ℹ️ System admin already exists: {email}")
                return {
                    'success': True,
                    'message': f"System admin already exists: {email}",
                    'user': existing_admin,
                    'created': False,
                    'updated': False
                }
            
            # If force=True, update the password
            logger.info(f"🔄 Updating system admin password: {email}")
            existing_admin.set_password(password)
            existing_admin.save()
            
            logger.info(f"✅ System admin password updated: {email}")
            return {
                'success': True,
                'message': f"System admin password updated successfully: {email}",
                'user': existing_admin,
                'created': False,
                'updated': True
            }
            
        except Accounts.DoesNotExist:
            # Create new system admin
            logger.info(f"🆕 Creating new system admin: {email}")
            
            try:
                with transaction.atomic():
                    # Validate password
                    try:
                        validate_password(password)
                    except ValidationError as e:
                        logger.error(f"❌ Invalid password: {', '.join(e.messages)}")
                        return {
                            'success': False,
                            'message': f"Invalid password: {', '.join(e.messages)}",
                            'user': None,
                            'created': False,
                            'updated': False
                        }
                    
                    # Create the admin user
                    admin = Accounts.objects.create_user(
                        email=email,
                        password=password,
                        role='admin',
                        is_staff=True,
                        is_superuser=False,
                        first_name='System',
                        last_name='Admin',
                        account_status='private',
                    )
                    
                    # Create user balance
                    UserBalance.objects.create(
                        user=admin,
                        balance=0.00
                    )
                    
                    logger.info(f"✅ System admin created successfully: {email}")
                    
                    return {
                        'success': True,
                        'message': f"System admin created successfully: {email}",
                        'user': admin,
                        'created': True,
                        'updated': False
                    }
                    
            except Exception as e:
                logger.error(f"❌ Error creating system admin: {str(e)}")
                return {
                    'success': False,
                    'message': f"Error creating system admin: {str(e)}",
                    'user': None,
                    'created': False,
                    'updated': False
                }
    
    @classmethod
    def get_or_create_system_admin(cls):
        """
        Get existing system admin or create if not exists.
        
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'user': Accounts or None,
                'created': bool
            }
        """
        return cls.create_system_admin(force=False)
    
    @classmethod
    def ensure_system_admin_exists(cls):
        """
        Ensure system admin exists. Creates if not found.
        
        Returns:
            Accounts or None: The system admin user or None if creation failed
        """
        result = cls.get_or_create_system_admin()
        return result.get('user')
    
    @classmethod
    def update_system_admin_password(cls):
        """
        Force update system admin password from environment.
        
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'user': Accounts or None
            }
        """
        return cls.create_system_admin(force=True)
    
    @classmethod
    def delete_system_admin(cls):
        """
        Delete the system admin user.
        
        Returns:
            dict: {
                'success': bool,
                'message': str
            }
        """
        creds = cls.get_system_admin_credentials()
        
        if not creds['exists']:
            return {
                'success': False,
                'message': "System admin credentials not found in environment."
            }
        
        email = creds['email']
        
        try:
            admin = Accounts.objects.get(email=email)
            
            # Check if this is the system admin
            if admin.role != 'admin' or admin.is_superuser:
                return {
                    'success': False,
                    'message': f"User {email} is not a system admin."
                }
            
            # Delete the admin
            admin.delete()
            logger.info(f"🗑️ System admin deleted: {email}")
            
            return {
                'success': True,
                'message': f"System admin deleted successfully: {email}"
            }
            
        except Accounts.DoesNotExist:
            return {
                'success': False,
                'message': f"System admin not found: {email}"
            }


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
# MAIN HANDLER FUNCTION
# ============================================================

def handle_create_system_admin(request):
    """
    Main handler function for creating/updating system admin.
    All logic is here, view just calls this function.
    
    Args:
        request: Django request object
    
    Returns:
        Response: DRF Response object
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