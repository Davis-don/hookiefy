import os

from django.db import IntegrityError

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from account.models import Accounts
from account.serializers import UserSerializer

from .auth_views import generate_tokens


def verify_google_token(token):
    """
    Verify a Google ID token and return its payload.
    """

    google_client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured.")

    return id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        google_client_id,
    )


def get_google_account_data(payload):
    """
    Extract account information from the verified Google payload.
    """

    return {
        "google_id": payload.get("sub"),
        "email": payload.get("email"),
        "first_name": payload.get("given_name", ""),
        "last_name": payload.get("family_name", ""),
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Login or create an account using Google authentication.

    New Google accounts are always normal users.

    Profile images are NOT created during registration.
    """

    token = request.data.get("token")

    if not token:
        return Response(
            {
                "message": "Google token is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        payload = verify_google_token(token)
    except ValueError:
        return Response(
            {
                "message": "Invalid Google token."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception:
        return Response(
            {
                "message": "Unable to verify Google account."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    google_data = get_google_account_data(payload)

    google_id = google_data["google_id"]
    email = google_data["email"]

    if not google_id or not email:
        return Response(
            {
                "message": "Google account information is incomplete."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # First try to find the account using Google ID.
        user = Accounts.objects.filter(
            google_id=google_id
        ).first()

        if user:
            if not user.is_active:
                return Response(
                    {
                        "message": "This account is inactive."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        else:
            # If Google ID doesn't exist, try the email.
            user = Accounts.objects.filter(
                email__iexact=email
            ).first()

            if user:
                # Do not allow a different Google account
                # to take over an existing Google-linked account.
                if (
                    user.google_id
                    and user.google_id != google_id
                ):
                    return Response(
                        {
                            "message": (
                                "This email is already linked "
                                "to another Google account."
                            )
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                # Link the existing account to Google.
                user.google_id = google_id
                user.auth_provider = "google"

                if not user.first_name:
                    user.first_name = google_data["first_name"]

                if not user.last_name:
                    user.last_name = google_data["last_name"]

                # Never change the role of an existing account.
                user.save(
                    update_fields=[
                        "google_id",
                        "auth_provider",
                        "first_name",
                        "last_name",
                    ]
                )

            else:
                # Create a completely new normal user.
                user = Accounts.objects.create_user(
                    email=email,
                    first_name=google_data["first_name"],
                    last_name=google_data["last_name"],
                    google_id=google_id,
                    auth_provider="google",
                    role="user",
                )

    except IntegrityError:
        return Response(
            {
                "message": "Unable to create or link this account."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    tokens = generate_tokens(user)

    return Response(
        {
            "message": "Google authentication successful.",
            "user": UserSerializer(user).data,
            "tokens": tokens,
        },
        status=status.HTTP_200_OK,
    )