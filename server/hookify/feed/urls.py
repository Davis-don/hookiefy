from django.urls import path
# Change 'feed_info' to 'UserFeedView'
from .views import UserFeedView 

urlpatterns = [
    # Use UserFeedView.as_view() since it's a class-based view
    path('info/', UserFeedView.as_view(), name='user-feed'),
]