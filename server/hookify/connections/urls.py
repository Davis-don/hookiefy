from django.urls import path
from . import views

app_name = 'connections'

urlpatterns = [
    # Hookup view - create connection request
    path('hookup/<int:id>/', views.hookup_view, name='hookup_view'),
    
    # Accept connection request (receiver only)
    path('accept/<uuid:connection_id>/', views.accept_connection, name='accept_connection'),
    
    # Reject connection request (both sender and receiver)
    path('reject/<uuid:connection_id>/', views.reject_connection, name='reject_connection'),
    
    # Cancel connection request (sender only)
    path('cancel/<uuid:connection_id>/', views.cancel_connection, name='cancel_connection'),
]