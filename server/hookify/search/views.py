# search/views.py

import json

from django.http import StreamingHttpResponse
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


# ============================================================
# RUN ORDER — kinds stream in this sequence
# ============================================================
# Each block below fires in this exact order. The moment a
# block finishes, its JSON line is flushed to the client.
# Put the fastest / most-expected kinds first so users see
# something on screen sooner.
# ============================================================

STREAM_ORDER = (
    "businesses",
    "posts",
    "products",
    "stories",
    "users",
)


class SearchView(APIView):
    """
    Unified search with per-kind pagination + streaming.

    Query params:
        q       — search string (must be ≥ 2 chars to run)
        kind    — all | businesses | posts | stories | products | users
        page    — 1-based page number (default 1)
        stream  — if "1" (default), response is NDJSON;
                  if "0", response is a single JSON object.

    Streaming response (default):
        Each line is one JSON object:
        { "kind": "businesses", "page": 1, "page_size": 10,
          "items": [...], "total": 24, "total_pages": 3,
          "has_more": true }
        ...
        { "type": "done", "query": "...", "kind": "all", "page": 1 }
    """

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        kind = request.query_params.get("kind", "all").strip().lower()
        wants_stream = request.query_params.get("stream", "1") != "0"

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

        # ── Which kinds to run? ─────────────────────────────
        if kind == "all":
            kinds_to_run = [k for k in STREAM_ORDER]
        else:
            kinds_to_run = [kind]

        # ── Too-short query: single JSON response, no stream ──
        if len(query) < 2:
            empty_results = {k: [] for k in STREAM_ORDER}
            empty_counts = {k: 0 for k in STREAM_ORDER}
            empty_pages = {k: 0 for k in STREAM_ORDER}
            empty_has_more = {k: False for k in STREAM_ORDER}

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

        # ── Dispatch table ──────────────────────────────────
        handlers = {
            "businesses": _run_businesses,
            "posts":      _run_posts,
            "products":   _run_products,
            "stories":    _run_stories,
            "users":      _run_users,
        }

        if not wants_stream:
            # ── Non-streaming: run everything, return once ──
            return self._non_stream_response(
                query, kind, page, kinds_to_run, handlers,
            )

        # ── Streaming: yield one line per kind ──────────────
        def generate():
            for one_kind in kinds_to_run:
                try:
                    payload = handlers[one_kind](query, page)
                    yield json.dumps(payload) + "\n"
                except Exception as exc:
                    # Don't kill the stream — report this kind's error
                    yield json.dumps({
                        "kind":  one_kind,
                        "error": str(exc),
                    }) + "\n"

            # Final marker
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
        response["X-Accel-Buffering"] = "no"  # disable proxy buffering
        return response

    # ────────────────────────────────────────────────────────
    # Non-streaming path (same shape as before)
    # ────────────────────────────────────────────────────────

    def _non_stream_response(
        self, query, kind, page, kinds_to_run, handlers,
    ):
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


# ============================================================
# PER-KIND RUNNERS
# ============================================================
# Each returns a dict:
#   {
#     "kind":        "posts",
#     "page":        1,
#     "page_size":   10,
#     "items":       [ ...up to 10 rows... ],
#     "total":       47,
#     "total_pages": 5,
#     "has_more":    true,
#   }
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