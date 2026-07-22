# payments/services/check_superadmin.py
import logging
from typing import Tuple, Optional

from django.db import connection, close_old_connections
from django.db.utils import OperationalError, InterfaceError

from account.models import Accounts

logger = logging.getLogger(__name__)


class SuperAdminValidator:
    """
    Service to validate superadmin existence and count in the system.
    Ensures exactly one superadmin exists before payment initiation.
    """
    
    @staticmethod
    def ensure_db_connection() -> bool:
        """
        Ensure database connection is healthy before proceeding.
        """
        try:
            close_old_connections()
            connection.ensure_connection()
            
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            return True
            
        except (OperationalError, InterfaceError) as e:
            logger.warning(f"⚠️ Database connection error in superadmin check: {str(e)}")
            try:
                connection.close()
                connection.ensure_connection()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                logger.info("✅ Database reconnected successfully")
                return True
            except Exception as reconnect_error:
                logger.error(f"❌ Failed to reconnect: {str(reconnect_error)}")
                return False
        except Exception as e:
            logger.error(f"❌ Unexpected database error: {str(e)}")
            return False
    
    @staticmethod
    def count_superadmins() -> int:
        """
        Count the number of superadmins in the system.
        Only counts active superadmins.
        
        Returns:
            int: Number of superadmins
        """
        try:
            # Count only active superadmins
            count = Accounts.objects.filter(
                role='superadmin',
                is_active=True
            ).count()
            
            logger.info(f"📊 Superadmin count: {count}")
            return count
            
        except Exception as e:
            logger.error(f"❌ Error counting superadmins: {str(e)}")
            return 0
    
    @staticmethod
    def get_superadmins() -> list:
        """
        Get all superadmins in the system.
        
        Returns:
            list: List of superadmin user objects
        """
        try:
            superadmins = Accounts.objects.filter(
                role='superadmin',
                is_active=True
            )
            
            # Log each superadmin found
            for admin in superadmins:
                logger.warning(f"🔍 Found superadmin: {admin.email} (ID: {admin.id})")
            
            logger.info(f"📊 Found {superadmins.count()} superadmins")
            return list(superadmins)
            
        except Exception as e:
            logger.error(f"❌ Error fetching superadmins: {str(e)}")
            return []
    
    @staticmethod
    def get_superadmin() -> Optional[Accounts]:
        """
        Get the single superadmin user.
        
        Returns:
            Accounts or None: The superadmin user if exactly one exists
        """
        try:
            return Accounts.objects.get(
                role='superadmin',
                is_active=True
            )
        except Accounts.DoesNotExist:
            logger.error("❌ No superadmin found")
            return None
        except Accounts.MultipleObjectsReturned:
            logger.error("❌ Multiple superadmins found")
            return None
        except Exception as e:
            logger.error(f"❌ Error getting superadmin: {str(e)}")
            return None
    
    @staticmethod
    def validate_superadmin() -> Tuple[bool, str, Optional[dict]]:
        """
        Validate superadmin configuration.
        
        Returns:
            Tuple[bool, str, dict]: 
                - success: True if validation passes
                - message: Error message if validation fails
                - data: Additional data about superadmin(s)
        """
        # Ensure database connection
        if not SuperAdminValidator.ensure_db_connection():
            return (
                False, 
                "Database connection error. Please try again.",
                None
            )
        
        try:
            # Count superadmins
            superadmin_count = SuperAdminValidator.count_superadmins()
            
            # Get list of superadmins for logging
            superadmins = SuperAdminValidator.get_superadmins()
            
            # Case 1: No superadmin found
            if superadmin_count == 0:
                logger.error("❌ Validation failed: No superadmin found")
                return (
                    False,
                    "No superadmin configured in the system.",
                    {
                        'count': 0,
                        'message': 'No superadmin found'
                    }
                )
            
            # Case 2: Multiple superadmins found
            if superadmin_count > 1:
                admin_emails = [admin.email for admin in superadmins]
                admin_ids = [admin.id for admin in superadmins]
                
                logger.error(f"❌ Validation failed: Multiple superadmins found ({superadmin_count})")
                logger.error(f"   Superadmin emails: {admin_emails}")
                logger.error(f"   Superadmin IDs: {admin_ids}")
                
                return (
                    False,
                    f"Multiple superadmins detected ({superadmin_count}). Only one superadmin is allowed.",
                    {
                        'count': superadmin_count,
                        'superadmins': admin_emails,
                        'superadmin_ids': admin_ids,
                        'message': 'Multiple superadmins found'
                    }
                )
            
            # Case 3: Exactly one superadmin found (SUCCESS)
            superadmin = superadmins[0] if superadmins else None
            
            logger.info(f"✅ Validation passed: Exactly one superadmin exists")
            logger.info(f"   Superadmin: {superadmin.email if superadmin else 'Unknown'}")
            
            return (
                True,
                "Superadmin validation passed. Exactly one superadmin exists.",
                {
                    'count': 1,
                    'superadmin': {
                        'id': superadmin.id if superadmin else None,
                        'email': superadmin.email if superadmin else None,
                        'full_name': superadmin.full_name if superadmin else None,
                    },
                    'message': 'Valid superadmin configuration'
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Superadmin validation error: {str(e)}", exc_info=True)
            return (
                False,
                f"Error validating superadmin: {str(e)}",
                None
            )
    
    @staticmethod
    def check_payment_eligibility() -> Tuple[bool, str, Optional[dict]]:
        """
        Check if the system is eligible for payment initiation.
        This is a wrapper around validate_superadmin for payment eligibility.
        
        Returns:
            Tuple[bool, str, dict]:
                - eligible: True if payment can be initiated
                - message: Status message
                - data: Additional data
        """
        success, message, data = SuperAdminValidator.validate_superadmin()
        
        if success:
            logger.info("✅ Payment eligibility: TRUE")
            return (
                True,
                "Payment can be initiated. Superadmin configuration is valid.",
                data
            )
        else:
            logger.error(f"❌ Payment eligibility: FALSE - {message}")
            return (
                False,
                message,
                data
            )
    
    @staticmethod
    def get_superadmin_status() -> dict:
        """
        Get detailed status about superadmin configuration.
        Useful for admin panels and debugging.
        
        Returns:
            dict: Detailed status information
        """
        try:
            superadmin_count = SuperAdminValidator.count_superadmins()
            superadmins = SuperAdminValidator.get_superadmins()
            
            # Determine if payment can be initiated
            can_initiate = superadmin_count == 1
            
            status_data = {
                'count': superadmin_count,
                'is_valid': superadmin_count == 1,
                'can_initiate_payment': can_initiate,
                'timestamp': None,
                'superadmins': []
            }
            
            from django.utils import timezone
            status_data['timestamp'] = timezone.now().isoformat()
            
            for admin in superadmins:
                status_data['superadmins'].append({
                    'id': admin.id,
                    'email': admin.email,
                    'full_name': admin.full_name,
                    'is_active': admin.is_active,
                    'last_login': admin.last_login.isoformat() if admin.last_login else None,
                    'date_joined': admin.date_joined.isoformat() if admin.date_joined else None
                })
            
            if superadmin_count == 0:
                status_data['status'] = 'error'
                status_data['message'] = 'No superadmin found in the system'
                status_data['can_initiate_payment'] = False
            elif superadmin_count == 1:
                status_data['status'] = 'success'
                status_data['message'] = 'Exactly one superadmin exists - Payment can be initiated'
                status_data['can_initiate_payment'] = True
            else:
                status_data['status'] = 'error'
                status_data['message'] = f'Multiple superadmins found ({superadmin_count}) - Payment cannot be initiated'
                status_data['can_initiate_payment'] = False
            
            # Log the status
            logger.info(f"📊 Superadmin Status: {status_data['status']}")
            logger.info(f"   Count: {superadmin_count}")
            logger.info(f"   Can Initiate Payment: {status_data['can_initiate_payment']}")
            
            return status_data
            
        except Exception as e:
            logger.error(f"❌ Error getting superadmin status: {str(e)}", exc_info=True)
            return {
                'count': 0,
                'is_valid': False,
                'can_initiate_payment': False,
                'status': 'error',
                'message': f'Error checking superadmin status',
                'superadmins': [],
                'timestamp': None
            }