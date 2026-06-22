from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that extracts the token from cookies.
    """
    
    def authenticate(self, request):
        # Get token from cookie
        token = request.COOKIES.get("access_token")
        
        if not token:
            return None
        
        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except (InvalidToken, AuthenticationFailed) as e:
            # Log the error but don't raise - let it return None
            print(f"Authentication failed: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error during authentication: {str(e)}")
            return None