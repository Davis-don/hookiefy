from django.urls import path
from . import views

app_name = 'notification'

urlpatterns = [
    # Pending connection requests only
    path('connection-requests/', views.get_connection_requests, name='get_connection_requests'),
    
    # All connection requests (excluding pending)
    path('connection-requests-all/', views.get_connection_requests_all, name='get_connection_requests_all'),
    
    # Mark notification as read
    path('mark-read/<uuid:notification_id>/', views.mark_notification_read, name='mark_notification_read'),
    
    # Mark all PENDING notifications as read
    path('mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    
    # Mark ALL notifications as read (including non-pending)
    path('mark-all-read-all/', views.mark_all_notifications_read_all, name='mark_all_notifications_read_all'),
]