from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class SystemBalance(models.Model):
    """
    Singleton-style model that stores the platform's overall system balance.
    Only one row should ever exist — use SystemBalance.get_solo() to access it.
    """

    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Current system balance amount.",
    )

    total_deposits = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cumulative total of all deposits into the system.",
    )

    total_withdrawals = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cumulative total of all withdrawals from the system.",
    )

    currency = models.CharField(
        max_length=8,
        default='KES',
        help_text="ISO currency code for the balance (e.g., KES, USD).",
    )

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'System Balance'
        verbose_name_plural = 'System Balance'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.currency} {self.balance:,.2f}"

    # ── Singleton helpers ─────────────────────────────────────
    def save(self, *args, **kwargs):
        """Force only one row to exist."""
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        """Return the single system balance row, creating it if missing."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    # ── Business helpers ──────────────────────────────────────
    def credit(self, amount, save=True):
        """Add funds to the system balance and track total deposits."""
        amount = Decimal(str(amount))
        self.balance += amount
        self.total_deposits += amount
        if save:
            self.save()
        return self.balance

    def debit(self, amount, save=True):
        """Remove funds from the system balance and track total withdrawals."""
        amount = Decimal(str(amount))
        if amount > self.balance:
            raise ValueError("Insufficient system balance.")
        self.balance -= amount
        self.total_withdrawals += amount
        if save:
            self.save()
        return self.balance