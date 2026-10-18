# perfomance_tests/views.py

import traceback

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from . import services


def _is_superadmin(user):
    if not user or not user.is_authenticated:
        return False
    return (
        getattr(user, "is_superuser", False)
        or getattr(user, "role", "") == "superadmin"
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def perf_run_all(request):
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

    try:
        image_runs = int(request.query_params.get("image_runs", "5"))
    except (TypeError, ValueError):
        image_runs = 5

    try:
        posts = int(request.query_params.get("posts", "5"))
    except (TypeError, ValueError):
        posts = 5

    try:
        products = int(request.query_params.get("products", "5"))
    except (TypeError, ValueError):
        products = 5

    try:
        result = services.run_all_tests(
            image_runs=max(1, image_runs),
            posts=max(1, posts),
            products=max(1, products),
        )
        return Response({"ok": True, "result": result}, status=200)
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
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )