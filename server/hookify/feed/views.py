# feed/views.py
import logging

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings

from .services import (
    DEFAULT_PAGE_SIZE,
    get_user_feed,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_feed_data(request):
    """
    GET /feed/info/?page=1&page_size=20
    """

    page = request.query_params.get("page", 1)
    page_size = request.query_params.get(
        "page_size", DEFAULT_PAGE_SIZE
    )

    try:
        payload = get_user_feed(
            user=request.user,
            page=page,
            page_size=page_size,
        )
    except Exception as e:
        logger.exception("Failed to build feed")

        body = {
            "message": "Failed to build feed.",
            "error": str(e),
            "error_type": type(e).__name__,
        }

        # Include the traceback in DEBUG so you can debug
        # from the browser without opening the terminal.
        if settings.DEBUG:
            import traceback
            body["traceback"] = traceback.format_exc()

        return Response(
            body,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(payload, status=status.HTTP_200_OK)