from django.contrib import admin
from .models import Withdrawal

@admin.register(Withdrawal)
class WithdrawalAdmin(admin.ModelAdmin):
    list_display = ['reference', 'user', 'amount', 'phone_number', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['reference', 'user__email', 'phone_number']
    readonly_fields = ['reference', 'created_at', 'updated_at']