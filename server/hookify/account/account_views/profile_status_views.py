# account/account_views/profile_status_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


# ────────────────────────────────────────────────────────────
# REQUIRED PROFILE FIELDS
# Only these block the dashboard. The profile image is not
# included — a missing photo never blocks anything.
# ────────────────────────────────────────────────────────────
REQUIRED_FIELDS = (
    ("first_name",   "First name"),
    ("last_name",    "Last name"),
    ("phone_number", "Phone number"),
    ("gender",       "Gender"),
)


def _missing_fields(user):
    missing, labels = [], []
    for field, label in REQUIRED_FIELDS:
        value = getattr(user, field, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(field)
            labels.append(label)
    return missing, labels


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_status(request):
    """
    Return whether the authenticated user's profile is complete.

    Response:
    {
        "is_complete": true,
        "missing_fields": [],
        "missing_labels": [],
        "completion_percent": 100,
        "total_required": 4,
        "filled_count": 4
    }
    """

    user = request.user
    missing, missing_labels = _missing_fields(user)

    total = len(REQUIRED_FIELDS)
    filled = total - len(missing)
    percent = round((filled / total) * 100) if total else 100

    return Response(
        {
            "is_complete": len(missing) == 0,
            "missing_fields": missing,
            "missing_labels": missing_labels,
            "completion_percent": percent,
            "total_required": total,
            "filled_count": filled,
        },
        status=status.HTTP_200_OK,
    )