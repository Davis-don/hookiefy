# deliveries/urls.py

from django.urls import path
from . import views


urlpatterns = [
    # ============================================================
    # CURRENT USER'S DELIVERIES
    # ============================================================
    #
    # GET /deliveries/       — list the current user's deliveries.
    #
    # POST is deliberately NOT served on this path. Django's URL
    # resolver matches by path first, so two routes on "" would
    # only ever reach the first one registered — the second
    # would be unreachable. To keep the surface clean, creation
    # lives on its own path below.
    #
    path(
        "",
        views.my_deliveries,
        name="my_deliveries",
    ),

    # ============================================================
    # CREATE DELIVERY (superadmin only)
    # ============================================================
    #
    # POST /deliveries/create/
    #
    # ManualDeliveryModal posts here. Not on /deliveries/ — the
    # 405 the client sees on POST /deliveries/ is Django telling
    # you my_deliveries() only accepts GET, which is correct.
    #
    path(
        "create/",
        views.create_delivery,
        name="create_delivery",
    ),

    # ============================================================
    # ADMIN VIEWS (superadmin only)
    # ============================================================
    path(
        "all/",
        views.all_deliveries,
        name="all_deliveries",
    ),
    path(
        "all/<uuid:pk>/",
        views.all_delivery_detail,
        name="all_delivery_detail",
    ),
    path(
        "all/<uuid:pk>/status/",
        views.all_delivery_update_status,
        name="all_delivery_update_status",
    ),
]