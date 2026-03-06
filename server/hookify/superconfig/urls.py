from django.urls import path
from .views import (
    create_admin_config,
    get_admin_configs,
    get_admin_config,
    update_admin_config,
    delete_admin_config
)

urlpatterns = [

    path("create/", create_admin_config),
    path("all/", get_admin_configs),
    path("<int:pk>/", get_admin_config),
    path("update/<int:pk>/", update_admin_config),
    path("delete/<int:pk>/", delete_admin_config),

]