# stories/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import (
    InvalidToken,
    AuthenticationFailed,
)


class OptionalJWTAuthentication(JWTAuthentication):
    """
    Same as JWTAuthentication, but silently returns None when no
    valid JWT is provided instead of raising AuthenticationFailed.

    Why we need this:
        Public endpoints (like the story feed and the story list)
        should be viewable by anyone, including anonymous users.
        But we also want `request.user` to be populated when a
        valid token IS sent, so views like `?mine=true` and
        category filtering can work without forcing every request
        to be authenticated.

    Behaviour:
        - Valid token → returns (user, token) as usual
        - No token → returns None (treated as anonymous)
        - Invalid / expired token → returns None, does NOT raise
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            return None
        except Exception:
            # Catch anything else that might bubble up from
            # SimpleJWT and treat it as anonymous rather than
            # blocking the whole request.
            return None