# feed/services.py
from django.core.paginator import (
    EmptyPage,
    PageNotAnInteger,
    Paginator,
)
from django.db.models import Q

import random

from account.models import Accounts
from adverts.models import Advert
from connections.models import Connection
from services.models import ClientService

from .serializers import (
    ServiceFeedSerializer,
    UserFeedSerializer,
)


# ============================================================
# CONFIG
# ============================================================

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


# ============================================================
# HELPERS
# ============================================================

def _get_pending_status_value():
    """
    Return whatever value the Connection model uses for
    'pending'. Tries the common shapes in order.
    """

    # If there's a nested Status enum
    status_cls = getattr(Connection, "Status", None)
    if status_cls and hasattr(status_cls, "PENDING"):
        return status_cls.PENDING

    # If there's a module-level constant
    if hasattr(Connection, "PENDING"):
        return Connection.PENDING

    # Fall back to the raw string
    return "pending"


def _pending_connected_user_ids(user):
    """
    Return the IDs of users who have a pending connection
    with the given user.
    """

    pending_status = _get_pending_status_value()

    try:
        pending = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user),
            status=pending_status,
        ).values_list("sender_id", "receiver_id")
    except Exception:
        # If the filter can't be built for any reason,
        # skip the exclusion rather than crashing the feed.
        return set()

    ids = set()

    for sender_id, receiver_id in pending:
        if sender_id == user.id:
            ids.add(receiver_id)
        else:
            ids.add(sender_id)

    return ids


def _build_user_items(user, connected_user_ids):
    """
    Return a list of feed items for users.

    Note: we no longer filter on `account_status` — that
    field doesn't exist on the Accounts model.
    """

    qs = (
        Accounts.objects
        .select_related("profile", "preference")
        .filter(role="user")
        .exclude(id=user.id)
        .exclude(id__in=connected_user_ids)
    )

    serializer = UserFeedSerializer(qs, many=True)

    return [
        {"type": "user", "data": item}
        for item in serializer.data
    ]


def _build_service_items(user):
    """
    Return a list of feed items for active services.

    Contact details of the provider are NEVER included.
    """

    qs = (
        ClientService.objects
        .select_related("category", "provider")
        .prefetch_related("images")
        .filter(is_active=True)
        .exclude(provider=user)
    )

    serializer = ServiceFeedSerializer(qs, many=True)

    return [
        {"type": "service", "data": item}
        for item in serializer.data
    ]


def _build_advert_items():
    """
    Return a list of feed items for adverts.

    Reads fields defensively so a missing attribute never
    crashes the feed.
    """

    qs = Advert.objects.all()

    items = []

    for advert in qs:
        items.append(
            {
                "type": "advert",
                "data": {
                    "id": str(getattr(advert, "id", "")),
                    "title": getattr(advert, "title", "") or "",
                    "description": getattr(
                        advert, "description", ""
                    ) or "",
                    "url": getattr(advert, "url", "") or "",
                    "type": getattr(advert, "type", "") or "",
                    "public_id": getattr(
                        advert, "public_id", ""
                    ) or "",
                    "created_at": getattr(
                        advert, "created_at", None
                    ),
                },
            }
        )

    return items


def _coerce_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ============================================================
# PUBLIC FEED BUILDER
# ============================================================

def get_user_feed(user, page=1, page_size=DEFAULT_PAGE_SIZE):
    """
    Build the combined feed for the given user.

    Returns a paginated envelope:

        {
            "page": 1,
            "page_size": 20,
            "total_items": 87,
            "total_pages": 5,
            "has_next": true,
            "has_previous": false,
            "results": [ { "type": ..., "data": ... }, ... ],
        }
    """

    # ── Normalise pagination inputs ─────────────────────
    page = max(1, _coerce_int(page, 1))
    page_size = _coerce_int(page_size, DEFAULT_PAGE_SIZE)
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))

    # ── Gather feed sections ────────────────────────────
    connected_user_ids = _pending_connected_user_ids(user)

    user_items = _build_user_items(user, connected_user_ids)
    service_items = _build_service_items(user)
    advert_items = _build_advert_items()

    # ── Combine and shuffle ─────────────────────────────
    feed = []
    feed.extend(user_items)
    feed.extend(service_items)
    feed.extend(advert_items)

    random.shuffle(feed)

    # ── Paginate ────────────────────────────────────────
    paginator = Paginator(feed, page_size)

    try:
        page_obj = paginator.page(page)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages or 1)

    return {
        "page": page_obj.number,
        "page_size": page_size,
        "total_items": paginator.count,
        "total_pages": paginator.num_pages,
        "has_next": page_obj.has_next(),
        "has_previous": page_obj.has_previous(),
        "results": list(page_obj.object_list),
    }