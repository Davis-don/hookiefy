from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html  # Use format_html instead of mark_safe for better security
from .models import User, SuperAdminProfile, AdminProfile, ClientProfile, ClientHistory

# ----- Custom Admin Site Configuration -----
class CustomAdminSite(admin.AdminSite):
    site_header = 'Hookify Administration'
    site_title = 'Hookify Admin'
    index_title = 'Dashboard'

# ----- Inline Profiles -----
class SuperAdminProfileInline(admin.StackedInline):
    model = SuperAdminProfile
    can_delete = False
    verbose_name_plural = 'Super Admin Profile'
    fields = ('national_id',)


class AdminProfileInline(admin.StackedInline):
    model = AdminProfile
    can_delete = False
    verbose_name_plural = 'Admin Profile'
    fields = ('gender',)


class ClientProfileInline(admin.StackedInline):
    model = ClientProfile
    can_delete = False
    verbose_name_plural = 'Client Profile'
    fields = ('gender', 'created_by_admin', 'managed_by_superuser',
              'is_deleted', 'deleted_by', 'deleted_at', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at', 'deleted_at')

    def get_fieldsets(self, request, obj=None):
        if obj and obj.role == 'client':
            return super().get_fieldsets(request, obj)
        return ()

# ----- Custom User Admin -----
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'email', 'first_name', 'last_name', 'role',
                    'is_staff', 'is_active', 'get_profile_status')
    list_display_links = ('id', 'email')
    list_filter = ('role', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name', 'id')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'username')}),
        ('Permissions', {
            'fields': ('role', 'is_staff', 'is_active', 'is_superuser',
                       'groups', 'user_permissions'),
            'classes': ('wide',),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role',
                       'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )

    filter_horizontal = ('groups', 'user_permissions')
    save_on_top = True

    def get_profile_status(self, obj):
        """Display profile status with color coding"""
        if obj.role == 'client' and hasattr(obj, 'client_profile'):
            profile = obj.client_profile
            if profile.is_deleted:
                return format_html(
                    '<span style="color: #e74c3c; font-weight: bold;">🗑️ Deleted</span>'
                )
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">✓ Active</span>'
            )
        return format_html(
            '<span style="color: #3498db;">✓ Active</span>'
        )

    get_profile_status.short_description = 'Profile Status'
    get_profile_status.admin_order_field = 'client_profile__is_deleted'

    def get_inlines(self, request, obj=None):
        """Return appropriate inlines based on user role"""
        if not obj:
            return []
        if obj.role == 'superadmin':
            return [SuperAdminProfileInline]
        elif obj.role == 'admin':
            return [AdminProfileInline]
        elif obj.role == 'client':
            return [ClientProfileInline]
        return []

    def get_queryset(self, request):
        """Optimize queryset with select_related for profiles"""
        queryset = super().get_queryset(request)
        return queryset.select_related(
            'superadmin_profile',
            'admin_profile',
            'client_profile'
        )

# ----- SuperAdminProfile Admin -----
@admin.register(SuperAdminProfile)
class SuperAdminProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'national_id', 'get_user_email')
    list_display_links = ('id', 'user')
    search_fields = ('user__email', 'national_id', 'user__first_name', 'user__last_name')
    list_filter = ('user__is_active',)
    raw_id_fields = ('user',)

    def get_user_email(self, obj):
        return obj.user.email
    get_user_email.short_description = 'Email'
    get_user_email.admin_order_field = 'user__email'

# ----- AdminProfile Admin -----
@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'gender', 'get_user_email', 'get_user_full_name')
    list_display_links = ('id', 'user')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'gender')
    list_filter = ('gender', 'user__is_active')
    raw_id_fields = ('user',)

    def get_user_email(self, obj):
        return obj.user.email
    get_user_email.short_description = 'Email'
    get_user_email.admin_order_field = 'user__email'

    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    get_user_full_name.short_description = 'Full Name'

# ----- ClientProfile Admin -----
@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'gender', 'created_by_admin', 'managed_by_superuser',
                    'is_deleted', 'deleted_by', 'created_at', 'get_status_badge')
    list_display_links = ('id', 'user')
    list_filter = ('gender', 'is_deleted', 'created_at', 'deleted_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name',
                     'created_by_admin__email', 'managed_by_superuser__email')
    raw_id_fields = ('user', 'created_by_admin', 'managed_by_superuser', 'deleted_by')
    readonly_fields = ('created_at', 'updated_at', 'deleted_at', 'get_client_history_link')
    list_per_page = 25

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'gender')
        }),
        ('Management Information', {
            'fields': ('created_by_admin', 'managed_by_superuser'),
            'classes': ('wide',),
        }),
        ('Soft Delete Status', {
            'fields': ('is_deleted', 'deleted_by', 'deleted_at'),
            'classes': ('wide',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
        ('History', {
            'fields': ('get_client_history_link',),
            'classes': ('wide',),
        }),
    )

    actions = ['soft_delete_selected', 'restore_selected', 'transfer_to_superuser']

    def get_status_badge(self, obj):
        if obj.is_deleted:
            return format_html(
                '<span style="background-color: #e74c3c; color: white; padding: 3px 10px; border-radius: 10px;">🗑️ Deleted</span>'
            )
        return format_html(
            '<span style="background-color: #27ae60; color: white; padding: 3px 10px; border-radius: 10px;">✓ Active</span>'
        )
    get_status_badge.short_description = 'Status'

    def get_client_history_link(self, obj):
        count = obj.history.count()
        url = f"/admin/accounts/clienthistory/?client__id={obj.id}"
        return format_html('<a href="{}">View History ({} entries)</a>', url, count)
    get_client_history_link.short_description = 'History'

    def soft_delete_selected(self, request, queryset):
        for profile in queryset:
            if not profile.is_deleted:
                profile.soft_delete(request.user)
        self.message_user(request, f"Successfully soft deleted {queryset.count()} client(s)")
    soft_delete_selected.short_description = "Soft delete selected clients"

    def restore_selected(self, request, queryset):
        for profile in queryset.filter(is_deleted=True):
            profile.restore()
        self.message_user(request, f"Successfully restored {queryset.count()} client(s)")
    restore_selected.short_description = "Restore selected clients"

    def transfer_to_superuser(self, request, queryset):
        if request.user.role != 'superadmin':
            self.message_user(request, "Only superadmins can transfer clients", level='ERROR')
            return
        for profile in queryset:
            profile.managed_by_superuser = request.user
            profile.save()
        self.message_user(request, f"Transferred {queryset.count()} client(s) to {request.user.email}")
    transfer_to_superuser.short_description = "Transfer to me (superuser)"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'created_by_admin', 'managed_by_superuser', 'deleted_by'
        )

# ----- ClientHistory Admin -----
@admin.register(ClientHistory)
class ClientHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'action', 'performed_by', 'timestamp', 'get_action_icon')
    list_display_links = ('id', 'client')
    list_filter = ('action', 'timestamp', 'performed_by')
    search_fields = ('client__user__email', 'client__user__first_name',
                     'client__user__last_name', 'performed_by__email')
    readonly_fields = ('client', 'action', 'performed_by', 'timestamp', 'details',
                       'previous_admin', 'new_admin')
    date_hierarchy = 'timestamp'
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': ('client', 'action', 'performed_by', 'timestamp')
        }),
        ('Transfer Details', {
            'fields': ('previous_admin', 'new_admin'),
            'classes': ('collapse',),
        }),
        ('Additional Details', {
            'fields': ('details',),
        }),
    )

    def get_action_icon(self, obj):
        icons = {
            'created': '➕',
            'updated': '✏️',
            'deleted': '🗑️',
            'restored': '🔄',
            'transferred': '↔️',
        }
        icon = icons.get(obj.action, '📝')
        return format_html('{} {}', icon, obj.action)
    get_action_icon.short_description = 'Action'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'client', 'client__user', 'performed_by', 'previous_admin', 'new_admin'
        )

# ----- Dashboard Statistics -----
class DashboardStats:
    """Helper class to display statistics in admin dashboard"""
    @staticmethod
    def get_stats():
        return {
            'total_users': User.objects.count(),
            'total_superadmins': User.objects.filter(role='superadmin').count(),
            'total_admins': User.objects.filter(role='admin').count(),
            'total_clients': User.objects.filter(role='client').count(),
            'active_clients': ClientProfile.active_clients().count(),
            'deleted_clients': ClientProfile.deleted_clients().count(),
            'recent_history': ClientHistory.objects.all()[:10],
        }

# ----- Admin Site Registration -----
admin.site.register(User, UserAdmin)

# Customize admin site
admin.site.site_header = 'Hookify Administration'
admin.site.site_title = 'Hookify Admin'
admin.site.index_title = 'Dashboard'