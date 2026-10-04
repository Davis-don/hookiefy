from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Story
from .serializers import (
    StorySerializer,
    StoryCreateSerializer,
    StoryUpdateSerializer,
)


# ============================================================
# HELPERS
# ============================================================

def _own_story_or_404(user, story_id):
    """Return the story if the user is its author, else None."""
    return (
        Story.objects
        .filter(id=story_id, user=user)
        .select_related("user")
        .first()
    )


def _is_superadmin(user):
    return (
        getattr(user, "is_superuser", False)
        or getattr(user, "role", "") == "superadmin"
    )


# ============================================================
# LIST MINE — GET /stories/mine/
# Authenticated. Only the current user's stories.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_my_stories(request):
    """
    List every story authored by the authenticated user.
    Newest first.

    Optional query params:
        ?category=journey|motivation|success|experience|lessons|inspiration
    """

    qs = (
        Story.objects
        .filter(user=request.user)
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    serializer = StorySerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# LIST ALL — GET /stories/
# Authenticated. Everyone's stories (public feed).
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_all_stories(request):
    """
    Public feed — every story on the platform, newest first.

    Optional query params:
        ?category=journey|motivation|success|experience|lessons|inspiration
        ?user=<user_id>
    """

    qs = (
        Story.objects
        .select_related("user")
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    user_id = request.query_params.get("user")
    if user_id:
        qs = qs.filter(user_id=user_id)

    serializer = StorySerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# CREATE — POST /stories/create/
# Authenticated. Author = request.user.
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_story(request):
    """
    Create a story. The authenticated user becomes the author.
    """

    serializer = StoryCreateSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    story = Story.objects.create(
        user=request.user,
        **serializer.validated_data,
    )

    return Response(
        {
            "message": "Story created successfully.",
            "story": StorySerializer(story).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ============================================================
# RETRIEVE — GET /stories/<story_id>/
# Authenticated. Only the author.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        StorySerializer(story).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# UPDATE — PATCH/PUT /stories/<story_id>/update/
# Authenticated. Only the author.
# ============================================================

@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"

    serializer = StoryUpdateSerializer(
        story,
        data=request.data,
        partial=partial,
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    story = serializer.save()

    return Response(
        {
            "message": "Story updated successfully.",
            "story": StorySerializer(story).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE — DELETE /stories/<story_id>/delete/
# Authenticated. Only the author.
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_story(request, story_id):
    story = _own_story_or_404(request.user, story_id)

    if story is None:
        return Response(
            {"message": "Story not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    story.delete()

    return Response(
        {"message": "Story deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ============================================================
# ADMIN LIST — GET /stories/admin/all/
# Authenticated + superadmin only.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_list_stories(request):
    """
    Superadmin view — every story from every user.
    Same payload as list_all_stories but gated.
    """

    if not _is_superadmin(request.user):
        return Response(
            {"message": "You don't have permission to view this."},
            status=status.HTTP_403_FORBIDDEN,
        )

    qs = (
        Story.objects
        .select_related("user")
        .order_by("-created_at")
    )

    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    user_id = request.query_params.get("user")
    if user_id:
        qs = qs.filter(user_id=user_id)

    serializer = StorySerializer(qs, many=True)

    return Response(
        {
            "count": qs.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )