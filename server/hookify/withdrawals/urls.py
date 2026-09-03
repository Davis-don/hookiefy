# withdrawals/urls.py - Complete updated file
from django.urls import path
from .views import (
    WithdrawView, 
    WithdrawalHistoryView, 
    WithdrawalStatusView,
    DebugPaystackView,  # Changed from TestPaystackView to DebugPaystackView
    UpdatePhoneNumberView
)

urlpatterns = [
    path('withdraw/', WithdrawView.as_view(), name='withdraw'),
    path('withdrawals/', WithdrawalHistoryView.as_view(), name='withdrawal-history'),
    path('withdrawal/<str:reference>/', WithdrawalStatusView.as_view(), name='withdrawal-status'),
    path('debug/', DebugPaystackView.as_view(), name='debug-paystack'),
    path('update-phone/', UpdatePhoneNumberView.as_view(), name='update-phone'),
]