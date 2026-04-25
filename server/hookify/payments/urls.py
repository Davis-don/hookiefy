# payments/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Payment endpoints
    path('make-payment/', views.Make_payment, name='make_payment'),
    path('callback/', views.pesapal_callback, name='pesapal_callback'),
    path('status/<str:order_tracking_id>/', views.payment_status, name='payment_status'),
    path('check-by-email/<str:email>/', views.check_payment_by_email, name='check_by_email'),
    path('sync-all/', views.sync_all_payments, name='sync_all'),
]