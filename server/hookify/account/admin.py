# account/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Accounts

@admin.register(Accounts)
class AccountsAdmin(UserAdmin):
    list_display = [
        'email', 
        'full_name', 
        'phone_number', 
        'role',
        'has_paystack_recipient',  # Show if user has recipient
        'paystack_recipient_code',  # Show the code
        'is_active',
        'is_staff'
    ]
    
    list_filter = ['role', 'is_active', 'is_staff', 'account_status']
    
    search_fields = ['email', 'phone_number', 'first_name', 'last_name', 'paystack_recipient_code']
    
    readonly_fields = [
        'last_login',
        'date_joined',
        'paystack_recipient_created_at'
    ]
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {
            'fields': (
                'first_name', 
                'last_name', 
                'phone_number', 
                'gender',
                'profile_image_url',
                'profile_image_public_id'
            )
        }),
        ('Account Settings', {
            'fields': (
                'role', 
                'account_status',
                'is_active',
                'is_staff',
                'is_superuser'
            )
        }),
        ('Paystack Settings', {  # ← New section for Paystack
            'fields': (
                'paystack_recipient_code',
                'paystack_recipient_phone',
                'paystack_recipient_created_at'
            ),
            'classes': ('collapse',),  # Collapsible section
            'description': 'Paystack recipient information for M-Pesa withdrawals'
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role'),
        }),
    )
    
    ordering = ['email']
    
    def has_paystack_recipient(self, obj):
        """Display if user has a recipient code"""
        return bool(obj.paystack_recipient_code)
    has_paystack_recipient.boolean = True
    has_paystack_recipient.short_description = "Has Recipient"