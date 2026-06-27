from django.contrib import admin
from .models import ClientAssignment


@admin.register(ClientAssignment)
class ClientAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "assigned_admin",
        "assigned_at",
        "updated_at",
    )
    list_filter = (
        "assigned_admin",
        "assigned_at",
    )
    search_fields = (
        "user__email",
        "assigned_admin__email",
        "user__first_name",
        "user__last_name",
        "assigned_admin__first_name",
        "assigned_admin__last_name",
    )
    autocomplete_fields = (
        "user",
        "assigned_admin",
    )
    readonly_fields = (
        "assigned_at",
        "updated_at",
    )
    ordering = ("-assigned_at",)