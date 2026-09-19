# engagement/views.py
from django.contrib.contenttypes.models import ContentType

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Like


# ============================================================
# ALLOWED CONTENT TYPES
# ============================================================

ALLOWED_CONTENT_TYPES = {
    "story": "story",
    "clientservice": "clientservice",
}


def _resolve_content_type(content_type_name: str):
    """
    Return the ContentType instance for an allowed name,
    or None if invalid.
    """
    name = str(content_type_name).lower().strip()

    if name not in ALLOWED_CONTENT_TYPES:
        return None

    app_label = "stories" if name == "story" else "services"
    model = ALLOWED_CONTENT_TYPES[name]

    try:
        return ContentType.objects.get(
            app_label=app_label,
            model=model,
        )
    except ContentType.DoesNotExist:
        return None


# ============================================================
# LIKE
# ============================================================

class LikeView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        content_type_name = request.data.get("content_type")
        object_id = request.data.get("object_id")

        if not content_type_name:
            return Response(
                {"detail": "content_type is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not object_id:
            return Response(
                {"detail": "object_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            object_id = int(object_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "object_id must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = _resolve_content_type(content_type_name)
        if not content_type:
            return Response(
                {
                    "detail": (
                        "Invalid content_type. "
                        "Use 'story' or 'clientservice'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_like = Like.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()

        if existing_like:
            likes_count = Like.objects.filter(
                content_type=content_type,
                object_id=object_id,
            ).count()
            return Response(
                {
                    "detail": "You have already liked this.",
                    "liked": True,
                    "like_id": existing_like.id,
                    "likes_count": likes_count,
                },
                status=status.HTTP_200_OK,
            )

        like = Like.objects.create(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        )

        likes_count = Like.objects.filter(
            content_type=content_type,
            object_id=object_id,
        ).count()

        return Response(
            {
                "message": "Liked successfully.",
                "liked": True,
                "like_id": like.id,
                "likes_count": likes_count,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# UNLIKE
# ============================================================

class UnlikeView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request):

        content_type_name = request.data.get("content_type")
        object_id = request.data.get("object_id")

        if not content_type_name:
            return Response(
                {"detail": "content_type is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not object_id:
            return Response(
                {"detail": "object_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            object_id = int(object_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "object_id must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = _resolve_content_type(content_type_name)
        if not content_type:
            return Response(
                {
                    "detail": (
                        "Invalid content_type. "
                        "Use 'story' or 'clientservice'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        like = Like.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()

        if not like:
            likes_count = Like.objects.filter(
                content_type=content_type,
                object_id=object_id,
            ).count()
            return Response(
                {
                    "detail": "You have not liked this.",
                    "liked": False,
                    "likes_count": likes_count,
                },
                status=status.HTTP_200_OK,
            )

        like.delete()

        likes_count = Like.objects.filter(
            content_type=content_type,
            object_id=object_id,
        ).count()

        return Response(
            {
                "message": "Unliked successfully.",
                "liked": False,
                "likes_count": likes_count,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# CHECK IF LIKED
# ============================================================

class CheckLikeView(APIView):
    """
    GET /engagement/check/

    Query params:
        content_type  (required)  — "story" | "clientservice"
        object_id     (required)  — integer

    Response:
        {
            "liked": true|false,
            "likes_count": 12,
            "like_id": 5 | null
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        content_type_name = request.query_params.get(
            "content_type"
        )
        object_id = request.query_params.get("object_id")

        if not content_type_name:
            return Response(
                {"detail": "content_type is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not object_id:
            return Response(
                {"detail": "object_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            object_id = int(object_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "object_id must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = _resolve_content_type(content_type_name)
        if not content_type:
            return Response(
                {
                    "detail": (
                        "Invalid content_type. "
                        "Use 'story' or 'clientservice'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        like = Like.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()

        likes_count = Like.objects.filter(
            content_type=content_type,
            object_id=object_id,
        ).count()

        return Response(
            {
                "liked": like is not None,
                "likes_count": likes_count,
                "like_id": like.id if like else None,
            },
            status=status.HTTP_200_OK,
        )