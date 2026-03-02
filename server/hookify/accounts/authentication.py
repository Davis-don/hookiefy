# accounts/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework import authentication, exceptions


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication class that extracts token from cookies
    instead of the Authorization header.
    """
    
    def authenticate(self, request):
        # Try to get access token from cookie
        access_token = request.COOKIES.get('access_token')
        
        if not access_token:
            return None
        
        try:
            # Validate the token
            validated_token = self.get_validated_token(access_token)
        except (InvalidToken, TokenError) as e:
            raise exceptions.AuthenticationFailed(str(e))
        
        try:
            # Get the user
            user = self.get_user(validated_token)
        except exceptions.AuthenticationFailed:
            raise exceptions.AuthenticationFailed('User not found or inactive')
        
        return (user, validated_token)