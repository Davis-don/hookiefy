# system_balance/models.py

from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class SystemBalance(models.Model):
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    total_deposits = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    total_withdrawals = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    currency = models.CharField(
        max_length=8,
        default='KES',
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'System Balance'
        verbose_name_plural = 'System Balance'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.currency} {self.balance:,.2f}"

    # ── Singleton ─────────────────────────────────────────────
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    # ── Business helpers ──────────────────────────────────────
    def credit(self, amount, save=True):
        amount = Decimal(str(amount))
        self.balance += amount
        self.total_deposits += amount
        if save:
            self.save()
        return self.balance

    def debit(self, amount, save=True):
        amount = Decimal(str(amount))
        if amount > self.balance:
            raise ValueError("Insufficient system balance.")
        self.balance -= amount
        self.total_withdrawals += amount
        if save:
            self.save()
        return self.balance