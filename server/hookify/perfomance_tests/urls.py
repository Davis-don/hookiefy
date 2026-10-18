# performance_tests/urls.py

from django.urls import path
from . import views


urlpatterns = [
    path("tests/run/", views.perf_run_all, name="perf-run-all"),
]