from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services import (
    search_businesses,
    search_posts,
    search_stories,
    search_products,
    search_users,
)


PAGE_SIZE = 10


class SearchView(APIView):
    """
    Unified search with per-kind pagination.

    Query params:
        q       — search string (must be ≥ 2 chars to run)
        kind    — all | businesses | posts | stories | products | users
        page    — 1-based page number (default 1)

    Response:
        {
          "query":      "...",
          "kind":       "...",
          "page":       N,
          "page_size":  10,
          "pages":      { kind: total_pages, ... },   # per-kind
          "has_more":   { kind: bool, ... },          # per-kind
          "results":    { kind: [item, ...], ... },   # current page slice
          "counts":     { kind: total_count, ... },   # total across all pages
          "total":      <sum of all counts>,
        }
    """

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        kind = request.query_params.get("kind", "all").strip().lower()

        allowed_kinds = {
            "all",
            "businesses",
            "posts",
            "stories",
            "products",
            "users",
        }

        if kind not in allowed_kinds:
            return Response(
                {"error": "Invalid search kind."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Parse `page` (1-based, clamped to ≥ 1) ──────────
        try:
            page = int(request.query_params.get("page", 1))
        except (TypeError, ValueError):
            page = 1
        if page < 1:
            page = 1

        # ── Empty response skeleton ─────────────────────────
        empty_results = {
            "businesses": [],
            "posts": [],
            "stories": [],
            "products": [],
            "users": [],
        }
        empty_counts = {key: 0 for key in empty_results}
        empty_pages = {key: 0 for key in empty_results}
        empty_has_more = {key: False for key in empty_results}

        # ── Too-short query: return immediately ─────────────
        if len(query) < 2:
            return Response({
                "query":     query,
                "kind":      kind,
                "page":      page,
                "page_size": PAGE_SIZE,
                "pages":     empty_pages,
                "has_more":  empty_has_more,
                "results":   empty_results,
                "counts":    empty_counts,
                "total":     0,
            })

        results = {}
        counts = {}
        pages = {}
        has_more = {}

        # ── Helper: slice a queryset for one kind ───────────
        def paginate(qs):
            total = qs.count()
            start = (page - 1) * PAGE_SIZE
            end = start + PAGE_SIZE
            total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE if total else 0
            return qs[start:end], total, total_pages

        # ── Businesses ──────────────────────────────────────
        if kind in ("all", "businesses"):
            qs = search_businesses(query)
            sliced, total, total_pages = paginate(qs)

            results["businesses"] = [
                {
                    "id": obj.pk,
                    "business_name": obj.business_name,
                    "business_type": obj.business_type,
                    "business_category": obj.business_category,
                    "description": obj.description,
                    "county": obj.county,
                    "city_town": obj.city_town,
                    "region": obj.region,
                }
                for obj in sliced
            ]
            counts["businesses"] = total
            pages["businesses"] = total_pages
            has_more["businesses"] = page < total_pages

        # ── Posts ───────────────────────────────────────────
        if kind in ("all", "posts"):
            qs = search_posts(query)
            sliced, total, total_pages = paginate(qs)

            results["posts"] = [
                {
                    "id": obj.pk,
                    "title": obj.title,
                    "body": obj.body,
                    "image_url": obj.image_url,
                    "business_id": obj.business_id,
                    "business_name": obj.business.business_name,
                    "created_at": obj.created_at,
                }
                for obj in sliced
            ]
            counts["posts"] = total
            pages["posts"] = total_pages
            has_more["posts"] = page < total_pages

        # ── Stories ─────────────────────────────────────────
        if kind in ("all", "stories"):
            qs = search_stories(query)
            sliced, total, total_pages = paginate(qs)

            results["stories"] = [
                {
                    "id": obj.pk,
                    "title": obj.title,
                    "summary": obj.summary,
                    "category": obj.category,
                    "user_id": obj.user_id,
                    "author": obj.user.full_name,
                    "created_at": obj.created_at,
                }
                for obj in sliced
            ]
            counts["stories"] = total
            pages["stories"] = total_pages
            has_more["stories"] = page < total_pages

        # ── Products ────────────────────────────────────────
        if kind in ("all", "products"):
            qs = search_products(query)
            sliced, total, total_pages = paginate(qs)

            results["products"] = [
                {
                    "id": obj.pk,
                    "name": obj.name,
                    "description": obj.description,
                    "price": str(obj.price) if obj.price is not None else None,
                    "image_url": obj.primary_image.image_url
                    if obj.primary_image else None,
                    "business_id": obj.business_id,
                    "business_name": obj.business.business_name,
                }
                for obj in sliced
            ]
            counts["products"] = total
            pages["products"] = total_pages
            has_more["products"] = page < total_pages

        # ── Users ───────────────────────────────────────────
        if kind in ("all", "users"):
            qs = search_users(query)
            sliced, total, total_pages = paginate(qs)

            results["users"] = [
                {
                    "id": obj.pk,
                    "full_name": obj.full_name,
                }
                for obj in sliced
            ]
            counts["users"] = total
            pages["users"] = total_pages
            has_more["users"] = page < total_pages

        # ── Fill any unrequested kinds with empty defaults ──
        for key in empty_results:
            results.setdefault(key, [])
            counts.setdefault(key, 0)
            pages.setdefault(key, 0)
            has_more.setdefault(key, False)

        return Response({
            "query":     query,
            "kind":      kind,
            "page":      page,
            "page_size": PAGE_SIZE,
            "pages":     pages,
            "has_more":  has_more,
            "results":   results,
            "counts":    counts,
            "total":     sum(counts.values()),
        })