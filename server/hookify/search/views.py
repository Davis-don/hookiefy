# search/views.py

import json

from django.http import JsonResponse, StreamingHttpResponse
from django.views import View

from .services import (
    search_businesses,
    search_posts,
    search_stories,
    search_products,
    search_users,
)


PAGE_SIZE = 10

# Order matters — the frontend renders sections in this order.
STREAM_ORDER = (
    "businesses",
    "posts",
    "products",
    "stories",
    "users",
)


class SearchView(View):
    """
    Unified search — NDJSON streaming (default) or single JSON object.

    Query params:
        q       — search string (must be ≥ 2 chars)
        kind    — all | businesses | posts | stories | products | users
        page    — 1-based page number (default 1)
        stream  — "1" (default) → NDJSON lines
                  "0"          → single JSON object

    Streaming response is `application/x-ndjson`. Each line is
    one JSON object. The final line has `"type": "done"`.
    """

    def get(self, request):
        query = request.GET.get("q", "").strip()
        kind = request.GET.get("kind", "all").strip().lower()
        wants_stream = request.GET.get("stream", "1") != "0"

        allowed_kinds = {
            "all",
            "businesses",
            "posts",
            "stories",
            "products",
            "users",
        }
        if kind not in allowed_kinds:
            return JsonResponse({"error": "Invalid search kind."}, status=400)

        try:
            page = int(request.GET.get("page", 1))
        except (TypeError, ValueError):
            page = 1
        if page < 1:
            page = 1

        kinds_to_run = (
            list(STREAM_ORDER) if kind == "all" else [kind]
        )

        # ── Too-short query ─────────────────────────────
        if len(query) < 2:
            return JsonResponse({
                "query":     query,
                "kind":      kind,
                "page":      page,
                "page_size": PAGE_SIZE,
                "pages":     {k: 0 for k in STREAM_ORDER},
                "has_more":  {k: False for k in STREAM_ORDER},
                "results":   {k: [] for k in STREAM_ORDER},
                "counts":    {k: 0 for k in STREAM_ORDER},
                "total":     0,
            })

        handlers = {
            "businesses": _run_businesses,
            "posts":      _run_posts,
            "products":   _run_products,
            "stories":    _run_stories,
            "users":      _run_users,
        }

        # ── Non-streaming fallback ──────────────────────
        if not wants_stream:
            results = {k: [] for k in STREAM_ORDER}
            counts = {k: 0 for k in STREAM_ORDER}
            pages = {k: 0 for k in STREAM_ORDER}
            has_more = {k: False for k in STREAM_ORDER}

            for one_kind in kinds_to_run:
                payload = handlers[one_kind](query, page)
                results[one_kind] = payload["items"]
                counts[one_kind] = payload["total"]
                pages[one_kind] = payload["total_pages"]
                has_more[one_kind] = payload["has_more"]

            return JsonResponse({
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

        # ── Streaming (NDJSON) ──────────────────────────
        def generate():
            for one_kind in kinds_to_run:
                try:
                    payload = handlers[one_kind](query, page)
                    yield json.dumps(payload, default=str) + "\n"
                except Exception as exc:
                    yield json.dumps({
                        "kind":  one_kind,
                        "error": str(exc),
                    }) + "\n"
            yield json.dumps({
                "type":  "done",
                "query": query,
                "kind":  kind,
                "page":  page,
            }) + "\n"

        response = StreamingHttpResponse(
            generate(),
            content_type="application/x-ndjson",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


# ============================================================
# PER-KIND RUNNERS
# ============================================================

def _paginate(qs, page):
    total = qs.count()
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE
    total_pages = (total + PAGE_SIZE - 1) // PAGE_SIZE if total else 0
    return qs[start:end], total, total_pages


def _run_businesses(query, page):
    qs = search_businesses(query)
    sliced, total, total_pages = _paginate(qs, page)
    return {
        "kind":        "businesses",
        "page":        page,
        "page_size":   PAGE_SIZE,
        "items": [
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
        ],
        "total":       total,
        "total_pages": total_pages,
        "has_more":    page < total_pages,
    }


def _run_posts(query, page):
    qs = search_posts(query)
    sliced, total, total_pages = _paginate(qs, page)
    return {
        "kind":        "posts",
        "page":        page,
        "page_size":   PAGE_SIZE,
        "items": [
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
        ],
        "total":       total,
        "total_pages": total_pages,
        "has_more":    page < total_pages,
    }


def _run_products(query, page):
    qs = search_products(query)
    sliced, total, total_pages = _paginate(qs, page)
    return {
        "kind":        "products",
        "page":        page,
        "page_size":   PAGE_SIZE,
        "items": [
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
        ],
        "total":       total,
        "total_pages": total_pages,
        "has_more":    page < total_pages,
    }


def _run_stories(query, page):
    qs = search_stories(query)
    sliced, total, total_pages = _paginate(qs, page)
    return {
        "kind":        "stories",
        "page":        page,
        "page_size":   PAGE_SIZE,
        "items": [
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
        ],
        "total":       total,
        "total_pages": total_pages,
        "has_more":    page < total_pages,
    }


def _run_users(query, page):
    qs = search_users(query)
    sliced, total, total_pages = _paginate(qs, page)
    return {
        "kind":        "users",
        "page":        page,
        "page_size":   PAGE_SIZE,
        "items": [
            {
                "id": obj.pk,
                "full_name": obj.full_name,
            }
            for obj in sliced
        ],
        "total":       total,
        "total_pages": total_pages,
        "has_more":    page < total_pages,
    }