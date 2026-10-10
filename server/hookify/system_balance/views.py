# system_balance/views.py

from decimal import Decimal, InvalidOperation
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import SystemBalance


# ============================================================
# AUTH HELPERS
# ============================================================

def _get_authenticated_user(request):
    """
    Return the authenticated user from the JWT in the
    Authorization header, or None.
    """
    try:
        auth = JWTAuthentication()
        result = auth.authenticate(request)
        if result is None:
            return None
        user, _ = result
        return user
    except (InvalidToken, TokenError):
        return None


def _require_superuser(request):
    """
    Return (user, None) if the request is from an authenticated
    superuser. Return (None, JsonResponse) otherwise.
    """
    user = _get_authenticated_user(request)

    if user is None:
        return None, JsonResponse(
            {'success': False, 'error': 'Authentication required.'},
            status=401,
        )

    if not user.is_authenticated:
        return None, JsonResponse(
            {'success': False, 'error': 'Authentication required.'},
            status=401,
        )

    # Accept either Django superuser flag OR the "superadmin" role
    if not (user.is_superuser or getattr(user, 'role', None) == 'superadmin'):
        return None, JsonResponse(
            {'success': False, 'error': 'Superuser access required.'},
            status=403,
        )

    return user, None


def _serialize(balance_obj):
    return {
        'id': balance_obj.id,
        'balance': str(balance_obj.balance),
        'total_deposits': str(balance_obj.total_deposits),
        'total_withdrawals': str(balance_obj.total_withdrawals),
        'currency': balance_obj.currency,
        'updated_at': balance_obj.updated_at.isoformat(),
        'created_at': balance_obj.created_at.isoformat(),
    }


# ============================================================
# MAIN BALANCE VIEW
# ============================================================

@csrf_exempt
@require_http_methods(['GET', 'POST', 'PATCH'])
def system_balance_view(request):
    user, err = _require_superuser(request)
    if err:
        return err

    obj = SystemBalance.get_solo()

    if request.method == 'GET':
        return JsonResponse({'success': True, 'data': _serialize(obj)})

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse(
            {'success': False, 'error': 'Invalid JSON body.'},
            status=400,
        )

    # ── PATCH ─────────────────────────────────────────────
    if request.method == 'PATCH':
        raw_value = payload.get('balance')
        if raw_value is None:
            return JsonResponse(
                {'success': False, 'error': 'Missing "balance" field.'},
                status=400,
            )
        try:
            new_balance = Decimal(str(raw_value))
        except (InvalidOperation, ValueError):
            return JsonResponse(
                {'success': False, 'error': '"balance" must be a valid number.'},
                status=400,
            )

        if new_balance < 0:
            return JsonResponse(
                {'success': False, 'error': 'Balance cannot be negative.'},
                status=400,
            )

        with transaction.atomic():
            obj = SystemBalance.objects.select_for_update().get(pk=obj.pk)
            obj.balance = new_balance
            obj.save()

        return JsonResponse({
            'success': True,
            'message': 'Balance updated.',
            'data': _serialize(obj),
        })

    # ── POST ──────────────────────────────────────────────
    raw_amount = payload.get('amount')
    action = (payload.get('action') or 'credit').lower()

    if raw_amount is None:
        return JsonResponse(
            {'success': False, 'error': 'Missing "amount" field.'},
            status=400,
        )

    if action not in ('credit', 'debit'):
        return JsonResponse(
            {'success': False, 'error': '"action" must be "credit" or "debit".'},
            status=400,
        )

    try:
        amount = Decimal(str(raw_amount))
    except (InvalidOperation, ValueError):
        return JsonResponse(
            {'success': False, 'error': '"amount" must be a valid number.'},
            status=400,
        )

    if amount <= 0:
        return JsonResponse(
            {'success': False, 'error': 'Amount must be greater than zero.'},
            status=400,
        )

    try:
        with transaction.atomic():
            obj = SystemBalance.objects.select_for_update().get(pk=obj.pk)
            if action == 'credit':
                obj.credit(amount, save=True)
            else:
                obj.debit(amount, save=True)
    except ValueError as exc:
        return JsonResponse({'success': False, 'error': str(exc)}, status=400)

    return JsonResponse({
        'success': True,
        'message': f'Balance {"credited" if action == "credit" else "debited"} successfully.',
        'data': _serialize(obj),
    })


# ============================================================
# INITIALIZE VIEW (superuser only)
# ============================================================

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def initialize_system_balance_view(request):
    """
    Superuser-only endpoint.
    Creates the singleton SystemBalance row (0.00 KES) if missing,
    or returns the existing row unchanged.
    """
    user, err = _require_superuser(request)
    if err:
        return err

    payload = {}
    if request.body:
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse(
                {'success': False, 'error': 'Invalid JSON body.'},
                status=400,
            )

    raw_balance = payload.get('balance', '0.00')
    currency = payload.get('currency', 'KES')

    try:
        starting_balance = Decimal(str(raw_balance))
    except (InvalidOperation, ValueError):
        return JsonResponse(
            {'success': False, 'error': '"balance" must be a valid number.'},
            status=400,
        )

    if starting_balance < 0:
        return JsonResponse(
            {'success': False, 'error': 'Balance cannot be negative.'},
            status=400,
        )

    with transaction.atomic():
        obj, created = SystemBalance.objects.get_or_create(
            pk=1,
            defaults={
                'balance': starting_balance,
                'total_deposits': starting_balance,
                'total_withdrawals': Decimal('0.00'),
                'currency': currency,
            },
        )

    return JsonResponse({
        'success': True,
        'created': created,
        'message': (
            'System balance initialised.'
            if created else
            'System balance already exists — returning current state.'
        ),
        'data': _serialize(obj),
    }, status=201 if created else 200)