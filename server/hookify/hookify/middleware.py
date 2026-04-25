# middleware.py
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

class ContentSecurityPolicyMiddleware(MiddlewareMixin):
    """
    Middleware to set Content Security Policy headers for production
    """
    def process_response(self, request, response):
        # Production CSP headers
        if not settings.DEBUG and hasattr(settings, 'CSP_POLICY'):
            response['Content-Security-Policy'] = settings.CSP_POLICY
            response['X-Frame-Options'] = 'DENY'
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-XSS-Protection'] = '1; mode=block'
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response