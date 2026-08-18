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
    
    # Check if user has unread notifications
    path('has-unread/', views.has_unread_notifications, name='has_unread_notifications'),
    
    # ============================================
    # NEW UNREAD SPECIFIC ENDPOINTS
    # ============================================
    
    # Check unread activity (non-pending, non-rejected)
    path('has-unread-activity/', views.has_unread_activity, name='has_unread_activity'),
    
    # Check unread connection requests (pending only)
    path('has-unread-requests/', views.has_unread_connection_requests, name='has_unread_connection_requests'),
    
    # Get all completed/paid connections (for the Successful Connections tab)
    path('connections-paid/', views.get_paid_connections, name='get_paid_connections'),
    
    # Get specific connected user contact details
    path('connected-user/<uuid:connection_id>/', views.get_connected_user_contact, name='get_connected_user_contact'),
]