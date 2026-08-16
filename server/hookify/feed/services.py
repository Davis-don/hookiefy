from account.models import Accounts
from .serializers import UserFeedSerializer
from connections.models import Connection
from django.db.models import Q


def get_user_feed(user):

    # Get IDs of users who have a PENDING connection with the current user
    pending_connections = Connection.objects.filter(
        Q(sender=user) | Q(receiver=user),
        status=Connection.Status.PENDING
    )

    # Get the IDs of the other users in those connections
    connected_user_ids = []

    for connection in pending_connections:
        if connection.sender_id == user.id:
            connected_user_ids.append(connection.receiver_id)
        else:
            connected_user_ids.append(connection.sender_id)

    # Fetch feed users, excluding current user and pending connections
    all_account_data = Accounts.objects.select_related(
        'profile',
        'preference'
    ).filter(
        role='user'
    ).exclude(
        id=user.id
    ).exclude(
        id__in=connected_user_ids
    )

    serialized_data = UserFeedSerializer(
        all_account_data,
        many=True
    )

    return serialized_data.data