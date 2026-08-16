from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import get_user_feed


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_feed_data(request):

    data = get_user_feed(request.user)

    return Response({
        "users": data
    })