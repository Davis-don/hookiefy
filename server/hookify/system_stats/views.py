# system_stats/views.py

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from account.models import Accounts
from businesses.models import Businesses


# ============================================================
# AUTH HELPER
# ============================================================

def _require_superuser(request):
    """
    Return the authenticated superuser, or None.

    Accepts either:
      - Django's is_superuser=True
      - role == "superadmin"
    """
    try:
        auth = JWTAuthentication()
        result = auth.authenticate(request)

        if result is None:
            return None

        user, _ = result

        if not user.is_authenticated:
            return None

        if not (user.is_superuser or getattr(user, 'role', None) == 'superadmin'):
            return None

        return user

    except (InvalidToken, TokenError):
        return None
    except Exception:
        return None


def _forbidden():
    return JsonResponse(
        {'success': False, 'error': 'Superuser access required.'},
        status=403,
    )


# ============================================================
# HELPERS
# ============================================================

def _regular_users_qs():
    """
    Regular users only — no superusers, no superadmins.
    """
    return (
        Accounts.objects
        .exclude(is_superuser=True)
        .exclude(role='superadmin')
    )


def _business_owner_ids():
    """
    Set of user IDs that own at least one business.

    Adjust the field name below if your Businesses model uses
    something other than `owner` (e.g. `user`, `account`, `owner_id`).
    """
    return set(
        Businesses.objects
        .values_list('owner_id', flat=True)
        .distinct()
    )


# ============================================================
# ENDPOINTS
# ============================================================

@require_http_methods(['GET'])
def system_users_count(request):
    """
    GET /system_stats/users/

    Returns:
        {
            "success": true,
            "count": <total regular users>,
            "with_business": <users who own ≥ 1 business>,
            "without_business": <users with no business>,
            "total": <same as count>  (convenience alias)
        }
    """
    if not _require_superuser(request):
        return _forbidden()

    users = _regular_users_qs()
    total = users.count()

    owner_ids = _business_owner_ids()

    with_business = users.filter(id__in=owner_ids).count()
    without_business = total - with_business

    return JsonResponse({
        'success': True,
        'count': total,
        'total': total,
        'with_business': with_business,
        'without_business': without_business,
    })


@require_http_methods(['GET'])
def system_businesses_count(request):
    """
    GET /system_stats/businesses/

    Returns:
        {
            "success": true,
            "count": <total businesses>
        }
    """
    if not _require_superuser(request):
        return _forbidden()

    return JsonResponse({
        'success': True,
        'count': Businesses.objects.count(),
    })