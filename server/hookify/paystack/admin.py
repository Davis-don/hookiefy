# paystack/admin.py
# ============================================================
# Paystack Admin
# ============================================================

from django.contrib import admin
from .models import PaystackTransaction

@admin.register(PaystackTransaction)
class PaystackTransactionAdmin(admin.ModelAdmin):
    list_display = ['reference', 'amount', 'currency', 'email', 'status', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['reference', 'email']
    readonly_fields = ['reference', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Transaction Details', {
            'fields': ('reference', 'amount', 'currency', 'email', 'status')
        }),
        ('Payment Data', {
            'fields': ('paystack_data', 'metadata', 'payment_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'paid_at')
        }),
    )