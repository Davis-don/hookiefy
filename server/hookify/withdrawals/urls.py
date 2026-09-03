from django.urls import path
from .views import WithdrawView, WithdrawalHistoryView, WithdrawalStatusView

urlpatterns = [
    path('withdraw/', WithdrawView.as_view(), name='withdraw'),
    path('withdrawals/', WithdrawalHistoryView.as_view(), name='withdrawal-history'),
    path('withdrawal/<str:reference>/', WithdrawalStatusView.as_view(), name='withdrawal-status'),
]