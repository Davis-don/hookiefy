# my_engagements/views.py

from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Like, Follow
from .serializers import (
    LikeActionSerializer,
    FollowActionSerializer,
    EngagementStatusSerializer,
    LikeSerializer,
    FollowSerializer,
)
from .services import (
    resolve_target,
    like_object,
    unlike_object,
    follow_object,
    unfollow_object,
    has_liked,
    has_followed,
)


# ============================================================
# LIKE TOGGLE — product / post / story
# ============================================================

class LikeToggleView(APIView):
    """
    POST /my_engagements/like/toggle/

    Body:
        target_type: "product" | "post" | "story"
        target_id:   <int>

    The actor is always the logged-in user.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LikeActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_type = serializer.validated_data["target_type"]
        target_id = serializer.validated_data["target_id"]

        try:
            obj = resolve_target(target_type, target_id)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "Target not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if has_liked(request.user, obj):
            unlike_object(request.user, obj)
            liked = False
        else:
            like_object(request.user, obj)
            liked = True

        obj.refresh_from_db()

        return Response(
            EngagementStatusSerializer({
                "target_type": target_type,
                "target_id": target_id,
                "likes_count": obj.likes_count,
                "follows_count": obj.follows_count,
                "liked": liked,
            }).data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# FOLLOW TOGGLE — business only
# ============================================================

class FollowToggleView(APIView):
    """
    POST /my_engagements/follow/toggle/

    Body:
        target_type: "business"
        target_id:   <int>
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FollowActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_type = serializer.validated_data["target_type"]
        target_id = serializer.validated_data["target_id"]

        try:
            obj = resolve_target(target_type, target_id)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "Target not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if has_followed(request.user, obj):
            unfollow_object(request.user, obj)
            followed = False
        else:
            follow_object(request.user, obj)
            followed = True

        obj.refresh_from_db()

        return Response(
            EngagementStatusSerializer({
                "target_type": target_type,
                "target_id": target_id,
                "likes_count": getattr(obj, "likes_count", 0),
                "follows_count": getattr(obj, "follows_count", 0),
                "followed": followed,
            }).data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# STATUS
# ============================================================

class EngagementStatusView(APIView):
    """
    GET /my_engagements/status/?target_type=product&target_id=42
    GET /my_engagements/status/?target_type=business&target_id=7
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_type = request.query_params.get("target_type")
        target_id = request.query_params.get("target_id")

        if not target_type or not target_id:
            return Response(
                {"detail": "target_type and target_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            obj = resolve_target(target_type, int(target_id))
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "Target not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "target_type": target_type,
            "target_id": int(target_id),
            "likes_count": getattr(obj, "likes_count", 0),
            "follows_count": getattr(obj, "follows_count", 0),
            "liked": has_liked(request.user, obj)
            if target_type != "business"
            else False,
            "followed": has_followed(request.user, obj)
            if target_type == "business"
            else False,
        })


# ============================================================
# WHO LIKED AN OBJECT
# ============================================================

class LikeListView(APIView):
    """
    GET /my_engagements/likes/?target_type=product&target_id=42
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_type = request.query_params.get("target_type")
        target_id = request.query_params.get("target_id")

        if not target_type or not target_id:
            return Response(
                {"detail": "target_type and target_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            obj = resolve_target(target_type, int(target_id))
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "Target not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ct = ContentType.objects.get_for_model(obj)

        likes = (
            Like.objects
            .filter(content_type=ct, object_id=obj.pk)
            .select_related("user")
        )

        return Response(LikeSerializer(likes, many=True).data)


# ============================================================
# WHO FOLLOWS A BUSINESS
# ============================================================

class FollowListView(APIView):
    """
    GET /my_engagements/follows/?target_type=business&target_id=7
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_type = request.query_params.get("target_type")
        target_id = request.query_params.get("target_id")

        if not target_type or not target_id:
            return Response(
                {"detail": "target_type and target_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            obj = resolve_target(target_type, int(target_id))
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "Target not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ct = ContentType.objects.get_for_model(obj)

        follows = (
            Follow.objects
            .filter(content_type=ct, object_id=obj.pk)
            .select_related("user")
        )

        return Response(FollowSerializer(follows, many=True).data)