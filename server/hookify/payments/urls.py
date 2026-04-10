from django.urls import path
from .views import Make_payment

urlpatterns = [
    path("make-payment/", Make_payment, name="make-payment"),
]