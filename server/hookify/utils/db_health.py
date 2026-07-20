# utils/db_health.py
from django.db import connection, close_old_connections
from django.db.utils import OperationalError, InterfaceError
import logging

logger = logging.getLogger(__name__)

class DatabaseHealthChecker:
    """
    Utility class to check and maintain database connection health.
    """
    
    @staticmethod
    def check_connection():
        """
        Check if the database connection is healthy.
        Returns True if healthy, False otherwise.
        """
        try:
            # Close old connections
            close_old_connections()
            
            # Ensure connection is alive
            connection.ensure_connection()
            
            # Test connection with a simple query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            return True
            
        except (OperationalError, InterfaceError) as e:
            logger.warning(f"Database connection check failed: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected database error: {str(e)}")
            return False
    
    @staticmethod
    def reconnect_if_needed():
        """
        Check and reconnect database if needed.
        Returns True if connection is healthy, False otherwise.
        """
        # Check if connection is healthy
        if not DatabaseHealthChecker.check_connection():
            try:
                logger.info("Attempting to reconnect to database...")
                # Close the broken connection
                connection.close()
                # Reconnect
                connection.ensure_connection()
                # Verify reconnection
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
                logger.info("✅ Database reconnected successfully")
                return True
            except Exception as e:
                logger.error(f"❌ Failed to reconnect to database: {str(e)}")
                return False
        
        return True
    
    @staticmethod
    def get_connection_status():
        """
        Get detailed connection status information.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version(), current_database(), current_user, now()")
                row = cursor.fetchone()
                
            return {
                'healthy': True,
                'version': row[0] if row else 'Unknown',
                'database': row[1] if row else 'Unknown',
                'user': row[2] if row else 'Unknown',
                'server_time': row[3] if row else 'Unknown',
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e),
            }