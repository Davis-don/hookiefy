# system_admin/commission_service.py
# ============================================================
# System Admin Commission Service
# ============================================================

import os
import logging
from django.db import transaction

from account.models import Accounts
from commisions.models import Commission

logger = logging.getLogger(__name__)


class SystemAdminCommissionService:
    """
    Service for managing system admin commission.
    System admin commission is set to 100% (admin gets 100%, platform gets 0%).
    """
    
    # Environment variable key
    ENV_EMAIL_KEY = "SYSTEM_ADMIN_EMAIL"
    
    @classmethod
    def get_system_admin_user(cls):
        """
        Get the system admin user from environment variables.
        
        Returns:
            tuple: (system_admin, error_message)
                - system_admin: Accounts instance or None
                - error_message: str or None
        """
        system_admin_email = os.environ.get(cls.ENV_EMAIL_KEY)
        
        if not system_admin_email:
            logger.error("❌ SYSTEM_ADMIN_EMAIL not set in environment variables")
            return None, "SYSTEM_ADMIN_EMAIL not set in environment variables"
        
        try:
            system_admin = Accounts.objects.get(email=system_admin_email)
            logger.info(f"✅ System admin found: {system_admin.email} (ID: {system_admin.id})")
            return system_admin, None
        except Accounts.DoesNotExist:
            logger.error(f"❌ System admin not found: {system_admin_email}")
            return None, f"System admin with email '{system_admin_email}' not found"
    
    @classmethod
    def update_system_admin_commission(cls, force=False):
        """
        Update the system admin's commission to 100% (admin gets 100%, platform gets 0%).
        The system admin is fetched from SYSTEM_ADMIN_EMAIL environment variable.
        
        Args:
            force (bool): If True, will update existing commission even if it exists.
                         If False, will skip if commission already exists at 100%.
        
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'commission': Commission or None,
                'created': bool,
                'updated': bool,
                'already_exists': bool
            }
        """
        logger.info("=" * 60)
        logger.info("💰 UPDATING SYSTEM ADMIN COMMISSION")
        logger.info("=" * 60)
        
        # Get system admin from environment
        system_admin, error_message = cls.get_system_admin_user()
        
        if system_admin is None:
            logger.error(f"❌ {error_message}")
            return {
                'success': False,
                'message': f"Failed to update system admin commission: {error_message}",
                'commission': None,
                'created': False,
                'updated': False,
                'already_exists': False
            }
        
        # Check if commission already exists for this admin
        try:
            existing_commission = Commission.objects.get(admin=system_admin)
            
            # If already at 100%, skip
            if existing_commission.percentage == 100.00:
                logger.info(f"ℹ️ Commission already at 100% for system admin: {system_admin.email}")
                return {
                    'success': True,
                    'message': f"Commission already at 100% for system admin: {system_admin.email}",
                    'commission': existing_commission,
                    'created': False,
                    'updated': False,
                    'already_exists': True
                }
            
            if not force:
                logger.info(f"ℹ️ Commission exists but not at 100% (current: {existing_commission.percentage}%). Use force=True to update.")
                return {
                    'success': True,
                    'message': f"Commission exists at {existing_commission.percentage}%. Use force=True to update to 100%.",
                    'commission': existing_commission,
                    'created': False,
                    'updated': False,
                    'already_exists': False
                }
            
            # If force=True, update the commission to 100%
            logger.info(f"🔄 Updating system admin commission to 100% (was {existing_commission.percentage}%)")
            existing_commission.percentage = 100.00
            existing_commission.save()
            
            logger.info(f"✅ System admin commission updated to 100% for: {system_admin.email}")
            return {
                'success': True,
                'message': f"System admin commission updated to 100% for: {system_admin.email}",
                'commission': existing_commission,
                'created': False,
                'updated': True,
                'already_exists': False
            }
            
        except Commission.DoesNotExist:
            # Create new commission at 100%
            logger.info(f"🆕 Creating system admin commission at 100% for: {system_admin.email}")
            
            try:
                with transaction.atomic():
                    commission = Commission.objects.create(
                        admin=system_admin,
                        percentage=100.00
                    )
                    
                    logger.info(f"✅ System admin commission created at 100% for: {system_admin.email}")
                    return {
                        'success': True,
                        'message': f"System admin commission created at 100% for: {system_admin.email}",
                        'commission': commission,
                        'created': True,
                        'updated': False,
                        'already_exists': False
                    }
                
            except Exception as e:
                logger.error(f"❌ Error creating system admin commission: {str(e)}")
                return {
                    'success': False,
                    'message': f"Error creating system admin commission: {str(e)}",
                    'commission': None,
                    'created': False,
                    'updated': False,
                    'already_exists': False
                }
    
    @classmethod
    def get_system_admin_commission(cls):
        """
        Get the system admin's commission configuration.
        
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'commission': Commission or None,
                'exists': bool
            }
        """
        logger.info("=" * 60)
        logger.info("📊 GETTING SYSTEM ADMIN COMMISSION")
        logger.info("=" * 60)
        
        # Get system admin from environment
        system_admin, error_message = cls.get_system_admin_user()
        
        if system_admin is None:
            logger.error(f"❌ {error_message}")
            return {
                'success': False,
                'message': f"Failed to get system admin commission: {error_message}",
                'commission': None,
                'exists': False
            }
        
        try:
            commission = Commission.objects.get(admin=system_admin)
            logger.info(f"✅ System admin commission found: {commission.percentage}%")
            return {
                'success': True,
                'message': f"System admin commission found at {commission.percentage}%",
                'commission': commission,
                'exists': True
            }
        except Commission.DoesNotExist:
            logger.info(f"ℹ️ No commission found for system admin: {system_admin.email}")
            return {
                'success': True,
                'message': f"No commission found for system admin: {system_admin.email}",
                'commission': None,
                'exists': False
            }