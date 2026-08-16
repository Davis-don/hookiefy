from django.urls import path
from .views import get_user_feed_data

urlpatterns = [
    # Use UserFeedView.as_view() since it's a class-based view
    path('info/', get_user_feed_data, name='user-feed'),
]