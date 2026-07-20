# middleware/database.py
from django.db import connection, close_old_connections
from django.db.utils import OperationalError, InterfaceError
import logging

logger = logging.getLogger(__name__)

class DatabaseHealthCheckMiddleware:
    """
    Middleware to check database connection health before each request.
    Ensures that the database connection is alive and reconnects if needed.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check database connection before processing request
        try:
            # Close old connections to prevent stale connections
            close_old_connections()
            
            # Ensure connection is alive
            connection.ensure_connection()
            
            # Verify connection by running a simple query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                
        except (OperationalError, InterfaceError) as e:
            logger.warning(f"⚠️ Database connection error detected: {str(e)}")
            try:
                # Close the broken connection
                connection.close()
                # Reconnect
                connection.ensure_connection()
                logger.info("✅ Database reconnected successfully")
            except Exception as reconnect_error:
                logger.error(f"❌ Failed to reconnect to database: {str(reconnect_error)}")
                # The request will continue but may fail later
                # We don't want to block the request entirely
                pass
        except Exception as e:
            logger.warning(f"⚠️ Unexpected database connection issue: {str(e)}")
        
        # Process the request
        response = self.get_response(request)
        
        # Close connections after request to prevent connection leaks
        close_old_connections()
        
        return response


class DatabaseConnectionMiddleware:
    """
    Alternative middleware with more robust connection handling.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Ensure database connection is healthy
        try:
            # Check if connection is usable
            connection.cursor()
        except Exception as e:
            logger.error(f"Database connection issue: {e}")
            # Close the connection to force a new one
            connection.close()
            logger.info("Database connection closed. Will reconnect on next query.")
        
        response = self.get_response(request)
        return response