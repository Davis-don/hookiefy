# perfomance_tests/views.py

import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from . import services


# ============================================================
# HARD CAPS — prevent OOM on small workers (512 MB)
# ============================================================
#
# The perf test loads images, creates DB rows, and makes
# in-process HTTP requests via Django's test Client.
# Every one of those costs memory. Without caps, a client
# sending ?posts=100 would instantly blow past 512 MB.
#
# These caps keep the worst-case run under ~40 MB of peak
# memory — safe on any Render tier.

MAX_IMAGE_RUNS  = 3
MAX_POSTS       = 3
MAX_PRODUCTS    = 3

# Defaults — used when the client doesn't pass a query param.
# Kept deliberately small so a bare /perf/tests/run/ call is
# the safest possible invocation.

DEFAULT_IMAGE_RUNS  = 1
DEFAULT_POSTS       = 1
DEFAULT_PRODUCTS    = 1


# ============================================================
# HELPERS
# ============================================================

def _is_superadmin(user):
    if not user or not user.is_authenticated:
        return False
    return (
        getattr(user, "is_superuser", False)
        or getattr(user, "role", "") == "superadmin"
    )


def _clamp(value: int, minimum: int, maximum: int) -> int:
    """Clamp an int to [minimum, maximum]."""
    return max(minimum, min(maximum, value))


def _parse_capped_int(raw, default: int, maximum: int) -> int:
    """
    Parse a query-param string into an int and cap it.

    - Missing / invalid → `default`
    - < 1 → 1
    - > maximum → maximum
    """
    try:
        value = int(raw) if raw is not None else default
    except (TypeError, ValueError):
        value = default
    return _clamp(value, 1, maximum)


# ============================================================
# PERF ENDPOINT
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def perf_run_all(request):
    # ── Superadmin gate ────────────────────────────────
    if not _is_superadmin(request.user):
        return Response(
            {
                "ok": False,
                "message": "Only superadmins can run performance tests.",
                "your_role": getattr(request.user, "role", None),
                "is_superuser": getattr(request.user, "is_superuser", False),
                "authenticated": request.user.is_authenticated,
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # ── Parse + hard-cap the workload ─────────────────
    image_runs = _parse_capped_int(
        request.query_params.get("image_runs"),
        DEFAULT_IMAGE_RUNS,
        MAX_IMAGE_RUNS,
    )
    posts = _parse_capped_int(
        request.query_params.get("posts"),
        DEFAULT_POSTS,
        MAX_POSTS,
    )
    products = _parse_capped_int(
        request.query_params.get("products"),
        DEFAULT_PRODUCTS,
        MAX_PRODUCTS,
    )

    # ── Run ────────────────────────────────────────────
    try:
        result = services.run_all_tests(
            image_runs=image_runs,
            posts=posts,
            products=products,
        )
        return Response(
            {
                "ok": True,
                "result": result,
                "applied": {
                    "image_runs": image_runs,
                    "posts": posts,
                    "products": products,
                },
            },
            status=status.HTTP_200_OK,
        )

    except MemoryError as e:
        # Extremely rare with these caps, but be explicit
        return Response(
            {
                "ok": False,
                "message": (
                    "Perf test ran out of memory. "
                    "Try again with smaller counts."
                ),
                "detail": str(e),
                "applied": {
                    "image_runs": image_runs,
                    "posts": posts,
                    "products": products,
                },
            },
            status=status.HTTP_507_INSUFFICIENT_STORAGE,
        )

    except Exception as e:
        return Response(
            {
                "ok": False,
                "message": f"Perf run failed: {e}",
                "trace": (
                    traceback.format_exc()
                    if _is_superadmin(request.user)
                    else None
                ),
                "applied": {
                    "image_runs": image_runs,
                    "posts": posts,
                    "products": products,
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )