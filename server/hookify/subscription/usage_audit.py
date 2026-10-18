# subscription/usage_audit.py

import hashlib
import json
import logging
import time

from django.db import transaction
from django.utils import timezone

from account.controllers.cloudinary_utils import (
    delete_image_from_cloudinary,
)

logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _overflow_plan(current, limit):
    """How many items to delete to reach `limit`. None = unlimited."""
    if limit is None:
        return 0
    return max(0, current - limit)


def _user_business_ids(user):
    from businesses.models import Businesses
    return list(
        Businesses.objects.filter(owner=user).values_list("id", flat=True)
    )


def _month_start():
    now = timezone.now()
    local = timezone.localtime(now)
    return local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


# ============================================================
# PLAN LIMITS
# ============================================================

def _plan_limits(target_plan):
    """
    The plan limits as stored on the Plan object.

    Note: posts/products/images limits are PER BUSINESS / PER PRODUCT,
    not global. The audit and prune must respect that.
    """
    return {
        "businesses":         target_plan.businesses_limit,
        "posts_per_business": target_plan.posts_limit,
        "products_per_business": target_plan.products_limit,
        "images_per_product": target_plan.images_per_product,
        "stories_per_month":  target_plan.stories_per_month,
    }


# ============================================================
# PER-BUSINESS USAGE + OVERFLOW COMPUTATION
# ============================================================

def _business_breakdown(user):
    """
    Return a per-business snapshot with per-category overflow
    calculated against the plan's limits.

    Structure:
        [
            {
                "business_id": 12,
                "business_name": "Acme Ltd",
                "posts": 30,
                "products": 4,
                "posts_to_delete": 25,          # how many to prune
                "products_to_delete": 1,
                "products": [
                    {"id": 42, "images": 8, "images_to_delete": 6},
                    ...
                ],
            },
            ...
        ]

    The numbers assume nothing has been deleted yet — they're the
    "raw overflow" from this state.
    """
    from businesses.models import Businesses
    from posts.models import Posts
    from products.models import Products

    out = []
    businesses = Businesses.objects.filter(owner=user).order_by("created_at")

    for biz in businesses:
        posts_count = Posts.objects.filter(business=biz).count()
        products = list(
            Products.objects
            .filter(business=biz)
            .order_by("created_at")
            .prefetch_related("images")
        )

        product_entries = []
        for p in products:
            imgs = p.images.count()
            product_entries.append({
                "id": p.pk,
                "created_at": p.created_at,
                "images": imgs,
            })

        out.append({
            "business_id": biz.pk,
            "business_name": biz.business_name,
            "created_at": biz.created_at,
            "posts": posts_count,
            "products": len(products),
            "products_detail": product_entries,
        })

    return out


def _raw_overflow(user, target_plan):
    """
    Return per-business and per-product overflow WITHOUT any
    deletions applied yet.

    Returns:
        {
            "businesses": N,               # total businesses to delete
            "businesses_detail": [...],    # kept + deleted split
            "posts_to_delete": N,
            "products_to_delete": N,
            "images_to_delete": N,
            "stories_to_delete": N,
            "per_business": [...],         # full breakdown
        }
    """
    from businesses.models import Businesses
    from posts.models import Posts
    from products.models import Products, ProductImage
    from stories.models import Story  # optional — guarded below

    limits = _plan_limits(target_plan)
    breakdown = _business_breakdown(user)

    # Sort businesses oldest-first — the prune keeps the newest,
    # so overflow is the oldest ones.
    breakdown.sort(key=lambda b: b["created_at"])

    total_businesses = len(breakdown)
    businesses_to_delete = _overflow_plan(
        total_businesses, limits["businesses"]
    )

    # Businesses that will SURVIVE are the newest N.
    survivors = breakdown[businesses_to_delete:]

    posts_to_delete = 0
    products_to_delete = 0
    images_to_delete = 0

    per_business = []

    for biz in survivors:
        biz_posts_del = _overflow_plan(
            biz["posts"], limits["posts_per_business"]
        )
        biz_products_del = _overflow_plan(
            biz["products"], limits["products_per_business"]
        )

        # Products that will SURVIVE — newest N per business
        survivors_products = biz["products_detail"][biz_products_del:]

        biz_images_del = 0
        for prod in survivors_products:
            img_del = _overflow_plan(
                prod["images"], limits["images_per_product"]
            )
            biz_images_del += img_del

        per_business.append({
            "business_id": biz["business_id"],
            "business_name": biz["business_name"],
            "posts_to_delete": biz_posts_del,
            "products_to_delete": biz_products_del,
            "images_to_delete": biz_images_del,
        })

        posts_to_delete += biz_posts_del
        products_to_delete += biz_products_del
        images_to_delete += biz_images_del

    # ── Stories (per user, per current month) ───────────────
    stories_to_delete = 0
    try:
        current_month_stories = Story.objects.filter(
            user=user,
            created_at__gte=_month_start(),
        ).count()
        stories_to_delete = _overflow_plan(
            current_month_stories, limits["stories_per_month"]
        )
    except Exception:
        # Story model absent — skip silently.
        pass

    return {
        "businesses": businesses_to_delete,
        "posts_to_delete": posts_to_delete,
        "products_to_delete": products_to_delete,
        "images_to_delete": images_to_delete,
        "stories_to_delete": stories_to_delete,
        "per_business": per_business,
    }


# ============================================================
# PLAN COMPARISON (audit)
# ============================================================

def audit_plan_change(user, target_plan):
    """
    Compare the user's current usage against `target_plan`'s
    limits, using PER-BUSINESS and PER-PRODUCT rules.

    Returns a dict shaped the same as before, plus a richer
    `per_business` breakdown so the UI can show what will go.
    """
    raw = _raw_overflow(user, target_plan)

    overflow = {
        "businesses": raw["businesses"],
        "posts":      raw["posts_to_delete"],
        "products":   raw["products_to_delete"],
        "images":     raw["images_to_delete"],
        "stories":    raw["stories_to_delete"],
    }

    total_overflow = sum(overflow.values())

    limits = _plan_limits(target_plan)

    if total_overflow == 0:
        return {
            "ok": True,
            "target_plan_slug": target_plan.slug,
            "target_plan_name": target_plan.plan_name,
            "usage": _snapshot_totals(user),
            "limits": limits,
            "overflow": overflow,
            "per_business": raw["per_business"],
            "total_overflow": 0,
            "confirmation_token": None,
            "message": (
                f"Your current content fits the "
                f"{target_plan.plan_name} plan."
            ),
        }

    token = _make_confirmation_token(user, target_plan, overflow)

    return {
        "ok": False,
        "target_plan_slug": target_plan.slug,
        "target_plan_name": target_plan.plan_name,
        "usage": _snapshot_totals(user),
        "limits": limits,
        "overflow": overflow,
        "per_business": raw["per_business"],
        "total_overflow": total_overflow,
        "confirmation_token": token,
        "message": (
            f"Downgrading to {target_plan.plan_name} requires "
            f"removing {total_overflow} item(s): "
            f"{_format_overflow(overflow)}. "
            f"To proceed, confirm — the extra items will be "
            f"permanently deleted, including their images."
        ),
    }


def _snapshot_totals(user):
    """Flat totals for display."""
    from posts.models import Posts
    from products.models import Products, ProductImage

    biz_ids = _user_business_ids(user)

    totals = {
        "businesses": len(biz_ids),
        "posts": Posts.objects.filter(business_id__in=biz_ids).count(),
        "products": Products.objects.filter(business_id__in=biz_ids).count(),
        "images": ProductImage.objects.filter(
            product__business_id__in=biz_ids
        ).count(),
    }

    try:
        from stories.models import Story
        totals["stories"] = Story.objects.filter(
            user=user,
            created_at__gte=_month_start(),
        ).count()
    except Exception:
        totals["stories"] = 0

    return totals


def _format_overflow(overflow):
    parts = []
    if overflow["businesses"]: parts.append(f"{overflow['businesses']} businesses")
    if overflow["posts"]:      parts.append(f"{overflow['posts']} posts")
    if overflow["products"]:   parts.append(f"{overflow['products']} products")
    if overflow["images"]:     parts.append(f"{overflow['images']} images")
    if overflow.get("stories"): parts.append(f"{overflow['stories']} stories")
    return ", ".join(parts) if parts else "nothing"


def _make_confirmation_token(user, target_plan, overflow):
    """
    Token now hashes the *overflow* (what will be deleted), not
    raw usage. If the user changes anything between audit and
    confirm, the overflow changes and the token mismatches.
    """
    payload = {
        "user_id": user.id,
        "plan_slug": target_plan.slug,
        "overflow": overflow,
    }
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def verify_confirmation_token(user, target_plan, token):
    fresh = audit_plan_change(user, target_plan)
    return fresh["confirmation_token"] == token


# ============================================================
# CLOUDINARY BATCH
# ============================================================

class _CloudinaryBatch:
    def __init__(self):
        self._seen: set[str] = set()
        self.deleted = 0
        self.failed = 0
        self.skipped_dup = 0
        self.orphans: list[str] = []

    def delete(self, public_id):
        if not public_id:
            return
        if public_id in self._seen:
            self.skipped_dup += 1
            return
        self._seen.add(public_id)

        last_error = None
        for attempt in (1, 2):
            try:
                delete_image_from_cloudinary(public_id)
                self.deleted += 1
                return
            except Exception as e:
                last_error = e
                if attempt == 1:
                    time.sleep(0.2)
                    continue

        self.failed += 1
        self.orphans.append(public_id)
        logger.warning(
            "ORPHAN Cloudinary asset | public_id=%s | error=%s",
            public_id, last_error,
        )


# ============================================================
# PRUNE
# ============================================================

@transaction.atomic
def prune_to_plan(user, target_plan):
    """
    Delete content until EVERY business AND every product fits
    `target_plan`'s limits — using per-business and per-product
    rules, not global totals.

    Also prunes this month's stories if `stories_per_month` is
    exceeded.

    Every Cloudinary asset is deleted BEFORE its DB row, and
    every asset is deleted at most once across the whole run.
    """
    from businesses.models import Businesses
    from posts.models import Posts
    from products.models import Products, ProductImage
    from stories.models import Story  # optional — guarded

    limits = _plan_limits(target_plan)
    breakdown = _business_breakdown(user)
    breakdown.sort(key=lambda b: b["created_at"])  # oldest first

    cloud = _CloudinaryBatch()

    deleted = {
        "businesses": 0,
        "posts": 0,
        "products": 0,
        "images": 0,
        "stories": 0,
    }

    # ────────────────────────────────────────────────────────
    # 1. BUSINESSES — keep the newest N
    # ────────────────────────────────────────────────────────
    biz_to_delete = _overflow_plan(len(breakdown), limits["businesses"])
    businesses_to_remove = breakdown[:biz_to_delete]
    businesses_to_keep = breakdown[biz_to_delete:]

    for b in businesses_to_remove:
        biz = Businesses.objects.get(pk=b["business_id"])

        # Cloudinary sweep — every image inside the business.
        for post in Posts.objects.filter(business=biz):
            cloud.delete(post.image_public_id)
        for product in Products.objects.filter(business=biz).prefetch_related("images"):
            for image in product.images.all():
                cloud.delete(image.image_public_id)

        biz.delete()
        deleted["businesses"] += 1

    # ────────────────────────────────────────────────────────
    # 2. FOR EACH KEPT BUSINESS — trim posts and products
    # ────────────────────────────────────────────────────────
    for b in businesses_to_keep:
        biz = Businesses.objects.get(pk=b["business_id"])

        # ── 2a. Posts (keep newest N) ──────────────────────
        posts_qs = Posts.objects.filter(business=biz).order_by("created_at")
        posts_total = posts_qs.count()
        posts_to_del = _overflow_plan(posts_total, limits["posts_per_business"])

        if posts_to_del > 0:
            old_posts = list(posts_qs[:posts_to_del])
            for p in old_posts:
                cloud.delete(p.image_public_id)
            for p in old_posts:
                p.delete()
                deleted["posts"] += 1

        # ── 2b. Products (keep newest N) ───────────────────
        products_qs = (
            Products.objects
            .filter(business=biz)
            .order_by("created_at")
            .prefetch_related("images")
        )
        products_total = products_qs.count()
        products_to_del = _overflow_plan(
            products_total, limits["products_per_business"]
        )

        if products_to_del > 0:
            old_products = list(products_qs[:products_to_del])

            # Cloudinary for every image in every doomed product
            for p in old_products:
                for image in p.images.all():
                    cloud.delete(image.image_public_id)

            for p in old_products:
                p.delete()
                deleted["products"] += 1

        # ── 2c. Remaining products — trim images per product ──
        remaining_products = Products.objects.filter(business=biz).prefetch_related("images")
        for p in remaining_products:
            imgs = list(p.images.all().order_by("created_at"))
            imgs_to_del = _overflow_plan(len(imgs), limits["images_per_product"])
            if imgs_to_del <= 0:
                continue

            for img in imgs[:imgs_to_del]:
                cloud.delete(img.image_public_id)

            ids = [img.pk for img in imgs[:imgs_to_del]]
            if ids:
                n, _ = ProductImage.objects.filter(id__in=ids).delete()
                deleted["images"] += n

    # ────────────────────────────────────────────────────────
    # 3. STORIES — trim to monthly limit
    # ────────────────────────────────────────────────────────
    stories_to_del = 0
    try:
        current_month_qs = Story.objects.filter(
            user=user,
            created_at__gte=_month_start(),
        ).order_by("created_at")
        stories_to_del = _overflow_plan(
            current_month_qs.count(), limits["stories_per_month"]
        )
        if stories_to_del > 0:
            story_ids = list(
                current_month_qs[:stories_to_del].values_list("id", flat=True)
            )
            n, _ = Story.objects.filter(id__in=story_ids).delete()
            deleted["stories"] += n
    except Exception:
        # Story model absent — skip silently.
        pass

    # ────────────────────────────────────────────────────────
    # 4. FINAL SWEEP — retry orphans
    # ────────────────────────────────────────────────────────
    if cloud.orphans:
        logger.warning(
            "Prune finished with %d orphan(s) | user=%s | plan=%s",
            len(cloud.orphans), user.id, target_plan.slug,
        )
        for pid in list(cloud.orphans):
            try:
                delete_image_from_cloudinary(pid)
                cloud.orphans.remove(pid)
                cloud.deleted += 1
                cloud.failed -= 1
                logger.info("Recovered orphan on 2nd sweep: %s", pid)
            except Exception as e:
                logger.error(
                    "Orphan permanently lost | public_id=%s | error=%s",
                    pid, e,
                )

    summary = {
        "deleted": deleted,
        "images_cloudinary_deleted": cloud.deleted,
        "images_cloudinary_failed":  cloud.failed,
        "orphans": list(cloud.orphans),
        "skipped_duplicates": cloud.skipped_dup,
    }

    logger.info(
        "Downgrade prune | user=%s | plan=%s | %s",
        user.id, target_plan.slug, summary,
    )

    return summary