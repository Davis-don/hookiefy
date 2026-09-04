from account.models import Accounts
from .serializers import UserFeedSerializer
from connections.models import Connection
from adverts.models import Advert

from django.db.models import Q
import random


def get_user_feed(user):

    # -----------------------------------------
    # 1. Get pending connections
    # -----------------------------------------
    pending_connections = Connection.objects.filter(
        Q(sender=user) | Q(receiver=user),
        status=Connection.Status.PENDING
    )

    # Get the IDs of the other users involved
    # in pending connections
    connected_user_ids = []

    for connection in pending_connections:
        if connection.sender_id == user.id:
            connected_user_ids.append(connection.receiver_id)
        else:
            connected_user_ids.append(connection.sender_id)

    # -----------------------------------------
    # 2. Get users for the feed
    # -----------------------------------------
    all_account_data = Accounts.objects.select_related(
        "profile",
        "preference"
    ).filter(
        role="user",
        account_status="public"
    ).exclude(
        id=user.id
    ).exclude(
        id__in=connected_user_ids
    )

    # -----------------------------------------
    # 3. Serialize users
    # -----------------------------------------
    serialized_users = UserFeedSerializer(
        all_account_data,
        many=True
    ).data

    # -----------------------------------------
    # 4. Get active adverts
    # -----------------------------------------
    adverts = Advert.objects.all()

    # -----------------------------------------
    # 5. Build combined feed
    # -----------------------------------------
    feed = []

    # Add users
    for user_data in serialized_users:
        feed.append({
            "type": "user",
            "data": user_data
        })

    # Add adverts
    for advert in adverts:
        feed.append({
            "type": "advert",
            "data": {
                "id": str(advert.id),
                "title": advert.title,
                "description": advert.description,
                "url": advert.url,
                "type": advert.type,
                "public_id": advert.public_id,
                "created_at": advert.created_at,
            }
        })

    # -----------------------------------------
    # 6. Randomize the combined feed
    # -----------------------------------------
    random.shuffle(feed)

    return feed