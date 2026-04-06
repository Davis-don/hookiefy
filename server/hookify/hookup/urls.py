from django.urls import path
from . import views

urlpatterns = [
    # CREATE
    path('create-hookup/', views.create_hookup, name='create_hookup'),

    # FETCH
    path('my-received-hookups/', views.my_received_hookups, name='my_received_hookups'),
    path('my-sent-hookups/', views.my_sent_hookups, name='my_sent_hookups'),
    path('hookup/<int:hookup_id>/', views.get_hookup_detail, name='get_hookup_detail'),
    
    # DEBUG
    path('hookups/status/<str:status>/', views.get_hookup_by_status, name='get_hookup_by_status'),

    # ACTIONS
    path('hookup/<int:hookup_id>/accept/', views.accept_hookup, name='accept_hookup'),
    path('hookup/<int:hookup_id>/reject/', views.reject_hookup, name='reject_hookup'),
    path('hookup/<int:hookup_id>/cancel/', views.cancel_hookup, name='cancel_hookup'),
    path('hookup/<int:hookup_id>/complete/', views.complete_hookup, name='complete_hookup'),
    path('hookup/<int:hookup_id>/confirm/', views.confirm_hookup, name='confirm_hookup'),
    path('hookup/<int:hookup_id>/mark-paid/', views.mark_hookup_as_paid, name='mark_hookup_as_paid'),

    # NOTIFICATIONS 🔔
    path('hookup/unread-count/', views.unread_hookup_count, name='unread_hookup_count'),

    # READ STATUS 👀
    path('hookup/<int:hookup_id>/mark-read/', views.mark_hookup_as_read, name='mark_hookup_as_read'),
]