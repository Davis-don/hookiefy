from django.urls import path
from . import views

urlpatterns = [
    # Balance endpoints
    path('current-balance/', views.get_current_user_balance, name='get_current_user_balance'),
]