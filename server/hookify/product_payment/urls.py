# product_payment/urls.py

from django.urls import path

from . import views


urlpatterns = [
    # ============================================================
    # CLIENT — initiate, status, sync
    # ============================================================
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

    # ============================================================
    # ADMIN — list + manual record
    # ============================================================
    #
    # GET  /product_payments/           → list (superadmin sees
    #                                     all, user sees their own)
    # POST /product_payments/manual/    → record a manual payment
    #                                     (superadmin only)
    #
    # IMPORTANT: the empty-path route must come AFTER the
    # specific routes. Django matches top-to-bottom, so if
    # path("", …) were first, it would swallow every request
    # and `<str:merchant_reference>/status/` would never be
    # reachable.
    #
    path(
        "",
        views.list_product_payments,
        name="product-payment-list",
    ),
    path(
        "manual/",
        views.manual_payment,
        name="product-payment-manual",
    ),
]