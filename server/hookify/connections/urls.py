# connections/urls.py
from django.urls import path
from . import views

app_name = "connections"

urlpatterns = [
    # ============================================
    # INITIATE — "Get Contact" / "Connect"
    # ============================================
    path(
        "initiate/<int:id>/",
        views.initiate_connection_view,
        name="initiate_connection",
    ),

    # ============================================
    # LIST — every connection the user is part of
    # ============================================
    path(
        "mine/",
        views.list_my_connections,
        name="list_my_connections",
    ),

    # ============================================
    # FETCH CONTACT (only if paid)
    # ============================================
    path(
        "contact/<uuid:connection_id>/",
        views.get_connection_contact,
        name="get_connection_contact",
    ),

    # ============================================
    # ADMIN — hookups list
    # ============================================
    path(
        "admin-hookups/",
        views.get_admin_hookups,
        name="get_admin_hookups",
    ),
]