from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserFeedSerializer
from .services import get_user_feed  # Import your service function

class UserFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch the optimally sorted queryset from services
        queryset = get_user_feed(request.user)
        
        # Serialize and return the complete payload (User + Profile + Preference)
        serializer = UserFeedSerializer(queryset, many=True)
        return Response(serializer.data)