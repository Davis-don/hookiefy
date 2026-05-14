from django.urls import path
from . import views

urlpatterns = [
    # HEALTH CHECK (🚀 SERVER STATUS)
    path('health/', views.health_check, name='health_check'),

    # CREATE HOOKUP
    path('create-hookup/', views.create_hookup, name='create_hookup'),

    # FETCH ALL HOOKUPS (sent + received)
    path('my-hookups/', views.my_hookups, name='my_hookups'),

    # PENDING COUNT (for sidebar badge)
    path('pending-count/', views.pending_hookup_count, name='pending_hookup_count'),

    # UNREAD COUNT
    path('unread-count/', views.get_unread_count, name='get_unread_count'),

    # GET PARTNER DETAILS
    path('hookup/<int:hookup_id>/partner-details/', views.get_hookup_partner_details, name='get_hookup_partner_details'),

    # MARK HOOKUP AS READ
    path('hookup/<int:hookup_id>/mark-read/', views.mark_hookup_as_read, name='mark_hookup_as_read'),

    # APPROVE HOOKUP
    path('hookup/<int:hookup_id>/approve/', views.approve_hookup, name='approve_hookup'),

    # REJECT HOOKUP
    path('hookup/<int:hookup_id>/reject/', views.reject_hookup, name='reject_hookup'),

    # MARK AS PAID
    path('hookup/<int:hookup_id>/mark-paid/', views.mark_hookup_as_paid, name='mark_hookup_as_paid'),

    # DELETE HOOKUP
    path('hookup/<int:hookup_id>/delete/', views.delete_hookup, name='delete_hookup'),

    # GET HOOKUP DETAIL
    path('hookup/<int:hookup_id>/', views.get_hookup_detail, name='get_hookup_detail'),
]