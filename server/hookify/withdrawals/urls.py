# withdrawals/urls.py
from django.urls import path
from .views import (
    WithdrawView, 
    WithdrawalHistoryView, 
    WithdrawalStatusView,
    TestPaystackView,
    UpdatePhoneNumberView
)

urlpatterns = [
    path('withdraw/', WithdrawView.as_view(), name='withdraw'),
    path('withdrawals/', WithdrawalHistoryView.as_view(), name='withdrawal-history'),
    path('withdrawal/<str:reference>/', WithdrawalStatusView.as_view(), name='withdrawal-status'),
    path('test-paystack/', TestPaystackView.as_view(), name='test-paystack'),
    path('update-phone/', UpdatePhoneNumberView.as_view(), name='update-phone'),
]