# feed/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from .serializers import UserFeedSerializer
from .services import get_user_feed

class UserFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Fetch the optimally sorted queryset from services
            queryset = get_user_feed(request.user)
            
            # Get pagination parameters
            page = request.query_params.get('page', 1)
            page_size = request.query_params.get('page_size', 10)
            
            # Validate and sanitize page_size
            try:
                page_size = int(page_size)
                if page_size > 50:
                    page_size = 50
                elif page_size < 1:
                    page_size = 10
            except (ValueError, TypeError):
                page_size = 10
            
            # Validate and sanitize page
            try:
                page = int(page)
                if page < 1:
                    page = 1
            except (ValueError, TypeError):
                page = 1
            
            # Apply pagination
            paginator = Paginator(queryset, page_size)
            
            try:
                paginated_queryset = paginator.page(page)
            except PageNotAnInteger:
                paginated_queryset = paginator.page(1)
            except EmptyPage:
                paginated_queryset = paginator.page(paginator.num_pages)
            
            # Serialize and return the complete payload (User + Profile + Preference)
            serializer = UserFeedSerializer(paginated_queryset, many=True)
            
            # Return with pagination metadata
            return Response({
                'status': 'success',
                'data': serializer.data,
                'pagination': {
                    'current_page': paginated_queryset.number,
                    'total_pages': paginator.num_pages,
                    'total_items': paginator.count,
                    'page_size': page_size,
                    'has_next': paginated_queryset.has_next(),
                    'has_previous': paginated_queryset.has_previous(),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)