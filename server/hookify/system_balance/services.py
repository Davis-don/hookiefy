# system_balance/services.py

import logging
from decimal import Decimal

from django.db import transaction

from .models import SystemBalance


logger = logging.getLogger(__name__)


def ensure_system_balance_exists(
    *,
    default_balance: Decimal = Decimal('0.00'),
    currency: str = 'KES',
):
    """
    Guarantee the singleton SystemBalance row exists.

    - If it already exists, returns it untouched.
    - If it doesn't exist, creates it with `default_balance`
      (default 0.00) and the given currency.

    Never raises on the "already exists" path. Safe to call
    from anywhere, including inside a transaction.

    Returns: (SystemBalance, created: bool)
    """

    with transaction.atomic():
        obj, created = SystemBalance.objects.get_or_create(
            pk=1,
            defaults={
                'balance': default_balance,
                'total_deposits': default_balance,
                'total_withdrawals': Decimal('0.00'),
                'currency': currency,
            },
        )

    if created:
        logger.info(
            "SystemBalance initialised | balance=%s %s",
            obj.currency,
            obj.balance,
        )
    return obj, created


def credit_system_balance(amount, *, reference: str = ''):
    """
    Add funds to the singleton SystemBalance, ensuring the
    row exists first.

    Runs in its own transaction with a row lock so
    concurrent payments can't race.

    Returns the new balance as a Decimal.
    """

    amount = Decimal(str(amount))

    with transaction.atomic():
        obj, _ = ensure_system_balance_exists()

        # Lock the row so two simultaneous credits can't
        # clobber each other.
        obj = SystemBalance.objects.select_for_update().get(pk=obj.pk)

        obj.credit(amount, save=True)

        logger.info(
            "SystemBalance credited | amount=%s %s | new_balance=%s "
            "| ref=%s",
            obj.currency,
            amount,
            obj.balance,
            reference,
        )

        return obj.balance