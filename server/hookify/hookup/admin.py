from django.contrib import admin
from .models import Hookup

class HookupAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'receiver', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'created_at', 'responded_at')
    search_fields = ('sender__user__email', 'receiver__user__email', 'sender__user__first_name', 'receiver__user__first_name')
    raw_id_fields = ('sender', 'receiver')
    readonly_fields = ('created_at', 'updated_at', 'responded_at', 'paid_at')
    list_select_related = ('sender__user', 'receiver__user')
    
    fieldsets = (
        ('Hook-up Information', {
            'fields': ('sender', 'receiver', 'status', 'payment_status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'responded_at', 'paid_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['accept_hookups', 'reject_hookups', 'mark_as_paid']
    
    def accept_hookups(self, request, queryset):
        for hookup in queryset:
            if hookup.status == 'pending':
                hookup.accept()
        self.message_user(request, f"{queryset.count()} hookup(s) accepted.")
    accept_hookups.short_description = "Accept selected hookups"
    
    def reject_hookups(self, request, queryset):
        for hookup in queryset:
            if hookup.status == 'pending':
                hookup.reject()
        self.message_user(request, f"{queryset.count()} hookup(s) rejected.")
    reject_hookups.short_description = "Reject selected hookups"
    
    def mark_as_paid(self, request, queryset):
        for hookup in queryset:
            if hookup.status == 'accepted' and hookup.payment_status == 'unpaid':
                hookup.mark_as_paid()
        self.message_user(request, f"{queryset.count()} hookup(s) marked as paid.")
    mark_as_paid.short_description = "Mark selected hookups as paid"

# Register Hookup model
admin.site.register(Hookup, HookupAdmin)