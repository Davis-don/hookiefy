from django.contrib import admin
from django.core.exceptions import PermissionDenied

from .models import ClientConfig


@admin.register(ClientConfig)
class ClientConfigAdmin(admin.ModelAdmin):
    list_display = ("hookup_fee", "updated_by", "updated_at")

    # Only ONE instance allowed
    def has_add_permission(self, request):
        if ClientConfig.objects.exists():
            return False
        return request.user.role in ["admin", "superadmin"]

    # Prevent deletion
    def has_delete_permission(self, request, obj=None):
        return False

    # Restrict editing
    def has_change_permission(self, request, obj=None):
        return request.user.role in ["admin", "superadmin"]

    # Secure save
    def save_model(self, request, obj, form, change):
        if request.user.role not in ["admin", "superadmin"]:
            raise PermissionDenied("You are not allowed to modify this.")

        obj.updated_by = request.user
        super().save_model(request, obj, form, change)