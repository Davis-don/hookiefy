# paystack/models.py
# ============================================================
# Paystack Models - Store Paystack transaction data
# ============================================================

from django.db import models
from django.utils import timezone
from decimal import Decimal

class PaystackTransaction(models.Model):
    """
    Store Paystack transaction details.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='KES')
    email = models.EmailField()
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Paystack response data
    paystack_data = models.JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Related to your existing Payment model
    payment_id = models.IntegerField(null=True, blank=True, help_text="ID of the related Payment model")
    
    def __str__(self):
        return f"{self.reference} - {self.status}"
    
    class Meta:
        ordering = ['-created_at']
        db_table = 'paystack_transactions'