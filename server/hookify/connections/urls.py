from django.urls import path
from . import views

app_name = 'connections'

urlpatterns = [
    # Hookup view - create connection request
    path('hookup/<int:id>/', views.hookup_view, name='hookup_view'),
    
    # Accept connection request
    path('accept/<uuid:connection_id>/', views.accept_connection, name='accept_connection'),
    
    # Reject connection request
    path('reject/<uuid:connection_id>/', views.reject_connection, name='reject_connection'),
     # Admin hookups endpoint
    path('admin-hookups/', views.get_admin_hookups, name='get_admin_hookups'),
      # Revenue by location endpoint
    path('revenue-by-location/', views.get_revenue_by_location, name='revenue_by_location'),
]