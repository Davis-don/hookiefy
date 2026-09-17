# services/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import (
    AuthenticationFailed,
    InvalidToken,
)


class OptionalJWTAuthentication(JWTAuthentication):
    """
    Same as JWTAuthentication, but never raises on invalid
    or expired tokens. If the header is missing or the token
    is bad, `authenticate()` returns None and the request is
    treated as anonymous.

    Public endpoints stay accessible even when the client
    sends a stale token; authenticated-only code paths can
    still check request.user.is_authenticated.
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (AuthenticationFailed, InvalidToken):
            return None