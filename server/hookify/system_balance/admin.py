# system_balance/admin.py

from django.contrib import admin
from django.utils.html import format_html

from .models import SystemBalance


@admin.register(SystemBalance)
class SystemBalanceAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'formatted_balance',
        'formatted_deposits',
        'formatted_withdrawals',
        'currency',
        'updated_at',
    )

    readonly_fields = (
        'balance',
        'total_deposits',
        'total_withdrawals',
        'currency',
        'created_at',
        'updated_at',
    )

    fieldsets = (
        ('System Balance', {
            'fields': ('balance', 'currency'),
        }),
        ('Cumulative Totals', {
            'fields': ('total_deposits', 'total_withdrawals'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    # ── Singleton behaviour ───────────────────────────────────

    def has_add_permission(self, request):
        # Allow creating the row only if it doesn't exist yet
        return not SystemBalance.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Never allow deleting the singleton
        return False

    # ── Formatting helpers ────────────────────────────────────

    @admin.display(description='Balance', ordering='balance')
    def formatted_balance(self, obj):
        # ⬇️ Format numbers FIRST, then pass a plain string to format_html
        amount = f'{obj.balance:,.2f}'
        return format_html(
            '<strong style="color:#059669;">{} {}</strong>',
            obj.currency,
            amount,
        )

    @admin.display(description='Total Deposits', ordering='total_deposits')
    def formatted_deposits(self, obj):
        amount = f'{obj.total_deposits:,.2f}'
        return format_html(
            '<span style="color:#2563EB;">{} {}</span>',
            obj.currency,
            amount,
        )

    @admin.display(description='Total Withdrawals', ordering='total_withdrawals')
    def formatted_withdrawals(self, obj):
        amount = f'{obj.total_withdrawals:,.2f}'
        return format_html(
            '<span style="color:#F97316;">{} {}</span>',
            obj.currency,
            amount,
        )