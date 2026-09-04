# adverts/urls.py
from django.urls import path
from . import views

app_name = 'adverts'

urlpatterns = [
    # CREATE endpoints (Superadmin only)
    path('create/url/', views.create_advert_url, name='create_advert_url'),
    path('create/cloudinary/', views.create_advert_cloudinary, name='create_advert_cloudinary'),
    
    # READ endpoints (Public access)
    path('', views.get_all_adverts, name='get_all_adverts'),
    path('<uuid:advert_id>/', views.get_advert_by_id, name='get_advert_by_id'),
    
    # UPDATE endpoint (Superadmin only)
    path('<uuid:advert_id>/update/', views.update_advert, name='update_advert'),
    
    # DELETE endpoints (Superadmin only)
    path('<uuid:advert_id>/delete/', views.delete_advert, name='delete_advert'),
    path('bulk-delete/', views.bulk_delete_adverts, name='bulk_delete_adverts'),
    
    # STATISTICS (Public access)
    path('stats/', views.get_advert_stats, name='get_advert_stats'),
]