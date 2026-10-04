# account/services/profile_stats.py

from django.db.models import Sum

from posts.models import Posts
from stories.models import Story


def get_user_stats(user) -> dict:
    """
    Roll up counts and view totals for a user.
    """

    # ── Stories ─────────────────────────────────────────
    stories_qs = Story.objects.filter(user=user)
    story_count = stories_qs.count()
    story_views = stories_qs.aggregate(total=Sum("views"))["total"] or 0

    # ── Businesses ──────────────────────────────────────
    business_count = user.businesses.count()

    # ── Posts ───────────────────────────────────────────
    posts_qs = Posts.objects.filter(business__owner=user)
    post_count = posts_qs.count()
    post_views = posts_qs.aggregate(total=Sum("views"))["total"] or 0

    # ── Products (optional app) ─────────────────────────
    try:
        from products.models import Products
        products_qs = Products.objects.filter(business__owner=user)
        product_count = products_qs.count()
        product_views = products_qs.aggregate(total=Sum("views"))["total"] or 0
    except Exception:
        product_count = 0
        product_views = 0

    return {
        "counts": {
            "businesses": business_count,
            "posts": post_count,
            "products": product_count,
            "stories": story_count,
        },
        "totals": {
            "post_views": post_views,
            "product_views": product_views,
            "story_views": story_views,
            "all_views": post_views + product_views + story_views,
        },
    }