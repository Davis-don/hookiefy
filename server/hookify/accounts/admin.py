from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SuperAdminProfile, AdminProfile, ClientProfile


# ----- UserAdmin -----
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('role', 'is_staff', 'is_active', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    filter_horizontal = ('groups', 'user_permissions',)


# ----- SuperAdminProfile Admin -----
@admin.register(SuperAdminProfile)
class SuperAdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'national_id')
    search_fields = ('user__email', 'national_id')


# ----- AdminProfile Admin -----
@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__email',)


# ----- ClientProfile Admin -----
@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__email',)


# Register the custom User model
admin.site.register(User, UserAdmin)