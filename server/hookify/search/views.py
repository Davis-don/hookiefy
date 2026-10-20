
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


class SearchView(APIView):

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

        results = {
            "businesses": [],
            "posts": [],
            "stories": [],
            "products": [],
            "users": [],
        }

        if len(query) < 2:
            return Response({
                "query": query,
                "kind": kind,
                "results": results,
                "counts": {key: 0 for key in results},
            })

        if kind in ("all", "businesses"):
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
                for obj in search_businesses(query)[:20]
            ]

        if kind in ("all", "posts"):
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
                for obj in search_posts(query)[:20]
            ]

        if kind in ("all", "stories"):
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
                for obj in search_stories(query)[:20]
            ]

        if kind in ("all", "products"):
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
                for obj in search_products(query)[:20]
            ]

        if kind in ("all", "users"):
            results["users"] = [
                {
                    "id": obj.pk,
                    "full_name": obj.full_name,
                }
                for obj in search_users(query)[:20]
            ]

        return Response({
            "query": query,
            "kind": kind,
            "results": results,
            "counts": {
                key: len(value)
                for key, value in results.items()
            },
        })
