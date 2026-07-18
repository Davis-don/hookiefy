from django.db import models
from account.models import Accounts


class UserBalance(models.Model):
    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="wallet"
    )

    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Current available balance."
    )

    pending_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Funds pending clearance."
    )

    total_earned = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Total amount earned by the user."
    )

    total_withdrawn = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Total amount withdrawn by the user."
    )

    currency = models.CharField(
        max_length=3,
        default="KES"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Balance"
        verbose_name_plural = "User Balances"

    def __str__(self):
        return f"{self.user.full_name} - {self.balance} {self.currency}"