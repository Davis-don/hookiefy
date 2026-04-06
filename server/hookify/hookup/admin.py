from django.contrib import admin
from .models import Hookup


# =========================
# HOOKUP ADMIN 🔥
# =========================
@admin.register(Hookup)
class HookupAdmin(admin.ModelAdmin):

    # =========================
    # LIST VIEW ⚡
    # =========================
    list_display = (
        'id',
        'sender',
        'receiver',
        'status',
        'payment_status',
        'is_read_by_sender',
        'is_read_by_receiver',
        'is_deleted',  # ✅ Added is_deleted field
        'created_at',
    )

    list_filter = (
        'status',
        'payment_status',
        'is_read_by_sender',
        'is_read_by_receiver',
        'is_deleted',  # ✅ Added is_deleted filter
        'created_at',
        'responded_at',
        'paid_at',
        'completed_at',
        'deleted_at',  # ✅ Added deleted_at filter
    )

    search_fields = (
        'sender__user__email',
        'receiver__user__email',
        'sender__user__first_name',
        'receiver__user__first_name',
    )

    raw_id_fields = ('sender', 'receiver')

    list_select_related = ('sender__user', 'receiver__user')

    ordering = ('-created_at',)

    # =========================
    # READONLY FIELDS 🔒
    # =========================
    readonly_fields = (
        'created_at',
        'updated_at',
        'responded_at',
        'paid_at',
        'cancelled_at',
        'completed_at',
        'deleted_at',  # ✅ Added deleted_at as readonly
    )

    # =========================
    # FIELDSETS (CLEAN UI)
    # =========================
    fieldsets = (
        ('👤 Participants', {
            'fields': ('sender', 'receiver')
        }),

        ('📊 Status & Payment', {
            'fields': ('status', 'payment_status')
        }),

        ('👀 Read Tracking', {
            'fields': ('is_read_by_sender', 'is_read_by_receiver')
        }),

        ('🗑️ Deletion Status', {  # ✅ Added deletion section
            'fields': ('is_deleted', 'deleted_at', 'scheduled_deletion_at'),
            'classes': ('collapse',)
        }),

        ('💬 Details', {
            'fields': ('message', 'location', 'scheduled_time'),
            'classes': ('collapse',)
        }),

        ('⏱️ Lifecycle', {
            'fields': (
                'responded_at',
                'paid_at',
                'cancelled_at',
                'completed_at',
            ),
            'classes': ('collapse',)
        }),

        ('🕒 System', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    # =========================
    # ADMIN ACTIONS ⚡
    # =========================
    actions = [
        'accept_hookups',
        'reject_hookups',
        'cancel_hookups',
        'mark_as_paid',
        'mark_as_completed',
        'mark_read_by_sender',
        'mark_read_by_receiver',
        'soft_delete_hookups',      # ✅ Added soft delete action
        'restore_hookups',           # ✅ Added restore action
        'permanently_delete_hookups', # ✅ Added permanent delete action
    ]

    # -------------------------
    # ACTION: ACCEPT
    # -------------------------
    def accept_hookups(self, request, queryset):
        updated = 0
        for hookup in queryset:
            if hookup.status == 'pending' and not hookup.is_deleted:
                hookup.accept()
                updated += 1

        self.message_user(request, f"{updated} hookup(s) accepted.")
    accept_hookups.short_description = "✅ Accept selected hookups"

    # -------------------------
    # ACTION: REJECT
    # -------------------------
    def reject_hookups(self, request, queryset):
        updated = 0
        for hookup in queryset:
            if hookup.status == 'pending' and not hookup.is_deleted:
                hookup.reject()
                updated += 1

        self.message_user(request, f"{updated} hookup(s) rejected.")
    reject_hookups.short_description = "❌ Reject selected hookups"

    # -------------------------
    # ACTION: CANCEL
    # -------------------------
    def cancel_hookups(self, request, queryset):
        updated = 0
        for hookup in queryset:
            if hookup.status == 'pending' and not hookup.is_deleted:
                hookup.cancel()
                updated += 1

        self.message_user(request, f"{updated} hookup(s) cancelled.")
    cancel_hookups.short_description = "🚫 Cancel selected hookups"

    # -------------------------
    # ACTION: MARK AS PAID
    # -------------------------
    def mark_as_paid(self, request, queryset):
        updated = 0
        for hookup in queryset:
            if hookup.status == 'accepted' and hookup.payment_status == 'unpaid' and not hookup.is_deleted:
                hookup.mark_as_paid()
                updated += 1

        self.message_user(request, f"{updated} hookup(s) marked as paid.")
    mark_as_paid.short_description = "💰 Mark as paid"

    # -------------------------
    # ACTION: COMPLETE
    # -------------------------
    def mark_as_completed(self, request, queryset):
        updated = 0
        for hookup in queryset:
            if hookup.status == 'accepted' and not hookup.is_deleted:
                hookup.mark_as_completed()
                updated += 1

        self.message_user(request, f"{updated} hookup(s) completed.")
    mark_as_completed.short_description = "🏁 Mark as completed"

    # -------------------------
    # ACTION: READ FLAGS
    # -------------------------
    def mark_read_by_sender(self, request, queryset):
        updated = queryset.filter(is_deleted=False).update(is_read_by_sender=True)
        self.message_user(request, f"{updated} marked as read by sender.")
    mark_read_by_sender.short_description = "👀 Mark read by sender"

    def mark_read_by_receiver(self, request, queryset):
        updated = queryset.filter(is_deleted=False).update(is_read_by_receiver=True)
        self.message_user(request, f"{updated} marked as read by receiver.")
    mark_read_by_receiver.short_description = "👀 Mark read by receiver"

    # -------------------------
    # ACTION: SOFT DELETE ✅
    # -------------------------
    def soft_delete_hookups(self, request, queryset):
        updated = 0
        for hookup in queryset:
            if not hookup.is_deleted:
                hookup.soft_delete()
                updated += 1
        
        self.message_user(request, f"{updated} hookup(s) soft deleted.")
    soft_delete_hookups.short_description = "🗑️ Soft delete selected hookups"

    # -------------------------
    # ACTION: RESTORE ✅
    # -------------------------
    def restore_hookups(self, request, queryset):
        updated = queryset.filter(is_deleted=True).update(
            is_deleted=False,
            deleted_at=None
        )
        self.message_user(request, f"{updated} hookup(s) restored.")
    restore_hookups.short_description = "♻️ Restore selected hookups"

    # -------------------------
    # ACTION: PERMANENT DELETE ✅
    # -------------------------
    def permanently_delete_hookups(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f"{count} hookup(s) permanently deleted.")
    permanently_delete_hookups.short_description = "🔥 Permanently delete selected hookups"

    # =========================
    # CUSTOM QUERYSET TO SHOW DELETED BY DEFAULT
    # =========================
    def get_queryset(self, request):
        """Show all hookups including soft-deleted ones in admin"""
        return super().get_queryset(request)

    # =========================
    # CUSTOM DELETE METHOD
    # =========================
    def delete_queryset(self, request, queryset):
        """Override to allow permanent deletion from admin"""
        for obj in queryset:
            obj.delete()  # This will hard delete
        self.message_user(request, f"{queryset.count()} hookup(s) permanently deleted.")