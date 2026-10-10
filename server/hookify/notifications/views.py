# notifications/views.py

from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


# ============================================================
# HELPERS
# ============================================================

def _own_notification_or_none(user, notification_id):
    """
    Return the notification if it belongs to `user`, else None.
    Ensures one user can never read another user's notifications.
    """
    return (
        Notification.objects
        .filter(id=notification_id, recipient=user)
        .first()
    )


def _parse_limit(value, default=20, maximum=100):
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


# ============================================================
# LIST — GET /notifications/
#
# Query params:
#   ?category=payment|subscription|system|security|
#             social|business|engagement|promo
#   ?severity=info|success|warning|error
#   ?status=read|unread|all          (default: all)
#   ?live=true|false                 (default: true — hide expired)
#   ?limit=20
#   ?offset=0
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    Return the authenticated user's notifications.

    Default ordering is newest first. Expired notifications
    are hidden unless you pass ?live=false.
    """

    qs = Notification.objects.for_user(request.user)

    # ── Category filter ──────────────────────────────────
    category = request.query_params.get("category")
    if category:
        valid_categories = {
            choice[0] for choice in Notification.CATEGORY_CHOICES
        }
        if category in valid_categories:
            qs = qs.filter(category=category)

    # ── Severity filter ──────────────────────────────────
    severity = request.query_params.get("severity")
    if severity:
        valid_severities = {
            choice[0] for choice in Notification.SEVERITY_CHOICES
        }
        if severity in valid_severities:
            qs = qs.filter(severity=severity)

    # ── Read / unread filter ─────────────────────────────
    status_filter = (request.query_params.get("status") or "all").lower()
    if status_filter == "unread":
        qs = qs.unread()
    elif status_filter == "read":
        qs = qs.read()

    # ── Live / all filter ────────────────────────────────
    live_param = (request.query_params.get("live") or "true").lower()
    if live_param != "false":
        qs = qs.live()

    # ── Pagination ───────────────────────────────────────
    limit = _parse_limit(request.query_params.get("limit"), default=20)
    try:
        offset = max(0, int(request.query_params.get("offset", 0)))
    except (TypeError, ValueError):
        offset = 0

    total = qs.count()
    unread_total = Notification.objects.for_user(request.user).live().unread().count()

    page = qs[offset: offset + limit]
    serializer = NotificationSerializer(page, many=True)

    return Response(
        {
            "count": total,
            "unread_count": unread_total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# UNREAD COUNT — GET /notifications/unread-count/
#
# Cheap endpoint for a bell icon.
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """
    Return just the number of unread, live notifications.

    Response:
        { "unread_count": 5 }
    """

    count = (
        Notification.objects
        .for_user(request.user)
        .live()
        .unread()
        .count()
    )

    return Response({"unread_count": count}, status=status.HTTP_200_OK)


# ============================================================
# RETRIEVE — GET /notifications/<id>/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def retrieve_notification(request, notification_id):
    notif = _own_notification_or_none(request.user, notification_id)

    if notif is None:
        return Response(
            {"message": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        NotificationSerializer(notif).data,
        status=status.HTTP_200_OK,
    )


# ============================================================
# MARK READ — POST /notifications/<id>/read/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    notif = _own_notification_or_none(request.user, notification_id)

    if notif is None:
        return Response(
            {"message": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notif.mark_read()
    notif.refresh_from_db()

    return Response(
        {
            "message": "Notification marked as read.",
            "notification": NotificationSerializer(notif).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# MARK UNREAD — POST /notifications/<id>/unread/
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notification_unread(request, notification_id):
    notif = _own_notification_or_none(request.user, notification_id)

    if notif is None:
        return Response(
            {"message": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notif.mark_unread()
    notif.refresh_from_db()

    return Response(
        {
            "message": "Notification marked as unread.",
            "notification": NotificationSerializer(notif).data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# MARK ALL READ — POST /notifications/read-all/
#
# Optional body / query params:
#   ?category=payment   → only that category
#   ?ids=<id>,<id>,...  → only those ids
# ============================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """
    Mark every unread, live notification as read.

    You can narrow the scope:
        POST /notifications/read-all/?category=payment
        POST /notifications/read-all/  { "ids": ["...", "..."] }
    """

    qs = (
        Notification.objects
        .for_user(request.user)
        .live()
        .unread()
    )

    # Narrow by category (query string)
    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    # Narrow by ids (body OR query string)
    ids = request.data.get("ids") if hasattr(request, "data") else None
    if not ids:
        ids_param = request.query_params.get("ids")
        if ids_param:
            ids = [x.strip() for x in ids_param.split(",") if x.strip()]

    if ids:
        qs = qs.filter(id__in=ids)

    updated = qs.update(read_at=timezone.now())

    return Response(
        {
            "message": f"{updated} notification(s) marked as read.",
            "updated": updated,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# DELETE — DELETE /notifications/<id>/delete/
# ============================================================

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    notif = _own_notification_or_none(request.user, notification_id)

    if notif is None:
        return Response(
            {"message": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notif.delete()

    return Response(
        {"message": "Notification deleted."},
        status=status.HTTP_200_OK,
    )
# notifications/views.py — add this view

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def clear_all_notifications(request):
    """
    Delete every notification belonging to the calling user.

    Response:
        { "message": "...", "deleted": N }
    """

    qs = Notification.objects.filter(recipient=request.user)
    deleted = qs.count()
    qs.delete()

    return Response(
        {
            "message": f"{deleted} notification(s) deleted.",
            "deleted": deleted,
        },
        status=status.HTTP_200_OK,
    )