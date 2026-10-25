# product_payment/urls.py

from django.urls import path

from . import views


urlpatterns = [
    path(
        "initiate/",
        views.initiate_payment,
        name="initiate-product-payment",
    ),
    path(
        "<str:merchant_reference>/status/",
        views.payment_status,
        name="product-payment-status",
    ),
    path(
        "<str:merchant_reference>/sync/",
        views.sync_payment,
        name="product-payment-sync",
    ),
]