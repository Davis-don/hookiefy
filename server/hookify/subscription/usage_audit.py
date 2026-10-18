# subscription/usage_audit.py

import hashlib
import json
import logging

from django.db import transaction
from django.utils import timezone

from account.controllers.cloudinary_utils import (
    delete_image_from_cloudinary,
)

logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _limit_label(value):
    return "unlimited" if value is None else value


def _overflow_plan(current, limit):
    """
    Return the number of items to delete.
    If limit is None → unlimited → 0.
    """
    if limit is None:
        return 0
    return max(0, current - limit)


def _user_business_ids(user):
    from businesses.models import Businesses
    return list(
        Businesses.objects.filter(owner=user).values_list("id", flat=True)
    )


def _snapshot_usage(user):
    """
    Return a dict describing the user's current usage.
    """
    from posts.models import Posts
    from products.models import Products, ProductImage

    biz_ids = _user_business_ids(user)

    businesses = len(biz_ids)
    posts = Posts.objects.filter(business_id__in=biz_ids).count()
    products = Products.objects.filter(business_id__in=biz_ids).count()
    images = ProductImage.objects.filter(
        product__business_id__in=biz_ids
    ).count()

    return {
        "businesses": businesses,
        "posts": posts,
        "products": products,
        "images": images,
    }


def _plan_limits(target_plan):
    """Canonical limits used by both audit and prune."""
    return {
        "businesses": target_plan.businesses_limit,
        "posts":      target_plan.posts_limit,
        "products":   target_plan.products_limit,
        "images":     (
            None
            if (target_plan.products_limit is None
                or target_plan.images_per_product is None)
            else target_plan.products_limit * target_plan.images_per_product
        ),
    }


# ============================================================
# CLOUDINARY BATCH DELETION
# ============================================================

class _CloudinaryBatch:
    """
    Helper that deduplicates Cloudinary public_ids so we never
    attempt to delete the same asset twice (the second attempt
    would 404 and pollute the failure counter).

    Also handles retries for transient network errors.
    """

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
                    # brief pause before retry — handles transient
                    # Cloudinary 5xx / network flakes
                    import time
                    time.sleep(0.2)
                    continue

        # Both attempts failed — this is an orphan
        self.failed += 1
        self.orphans.append(public_id)
        logger.warning(
            "ORPHAN Cloudinary asset | public_id=%s | error=%s",
            public_id, last_error,
        )


# ============================================================
# PLAN COMPARISON
# ============================================================

def audit_plan_change(user, target_plan):
    """
    Compare the user's current usage against `target_plan`'s
    limits.
    """
    usage = _snapshot_usage(user)
    limits = _plan_limits(target_plan)

    overflow = {
        "businesses": _overflow_plan(usage["businesses"], limits["businesses"]),
        "posts":      _overflow_plan(usage["posts"],      limits["posts"]),
        "products":   _overflow_plan(usage["products"],   limits["products"]),
        "images":     _overflow_plan(usage["images"],     limits["images"]),
    }

    total_overflow = sum(overflow.values())

    if total_overflow == 0:
        return {
            "ok": True,
            "target_plan_slug": target_plan.slug,
            "target_plan_name": target_plan.plan_name,
            "usage": usage,
            "limits": limits,
            "overflow": overflow,
            "total_overflow": 0,
            "confirmation_token": None,
            "message": (
                f"Your current content fits the "
                f"{target_plan.plan_name} plan."
            ),
        }

    token = _make_confirmation_token(user, target_plan, usage)

    return {
        "ok": False,
        "target_plan_slug": target_plan.slug,
        "target_plan_name": target_plan.plan_name,
        "usage": usage,
        "limits": limits,
        "overflow": overflow,
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


def _format_overflow(overflow):
    parts = []
    if overflow["businesses"]: parts.append(f"{overflow['businesses']} businesses")
    if overflow["posts"]:      parts.append(f"{overflow['posts']} posts")
    if overflow["products"]:   parts.append(f"{overflow['products']} products")
    if overflow["images"]:     parts.append(f"{overflow['images']} images")
    return ", ".join(parts) if parts else "nothing"


def _make_confirmation_token(user, target_plan, usage):
    payload = {
        "user_id": user.id,
        "plan_slug": target_plan.slug,
        "usage": usage,
    }
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def verify_confirmation_token(user, target_plan, token):
    """
    Return True iff `token` matches a fresh audit of the user's
    current usage against `target_plan`.
    """
    fresh = audit_plan_change(user, target_plan)
    return fresh["confirmation_token"] == token


# ============================================================
# PRUNE
# ============================================================

@transaction.atomic
def prune_to_plan(user, target_plan):
    """
    Delete the oldest content until the user's usage fits
    `target_plan`'s limits.

    Every Cloudinary asset is deleted BEFORE its DB row, and
    every asset is deleted at most once across the whole run.
    A final sweep catches anything missed.

    Returns:
        {
            "deleted": {businesses, posts, products, images},
            "images_cloudinary_deleted": int,
            "images_cloudinary_failed":  int,
            "orphans": [public_id, ...],
        }
    """
    from businesses.models import Businesses
    from posts.models import Posts
    from products.models import Products, ProductImage

    usage = _snapshot_usage(user)
    limits = _plan_limits(target_plan)
    biz_ids = _user_business_ids(user)

    deleted = {
        "businesses": 0,
        "posts": 0,
        "products": 0,
        "images": 0,
    }

    cloud = _CloudinaryBatch()

    # ────────────────────────────────────────────────────────
    # 1. IMAGES
    # ────────────────────────────────────────────────────────
    images_overflow = _overflow_plan(usage["images"], limits["images"])
    if images_overflow > 0:
        # Snapshot rows first — no re-querying after delete.
        rows = list(
            ProductImage.objects
            .filter(product__business_id__in=biz_ids)
            .order_by("created_at")
            .values_list("id", "image_public_id")[: images_overflow]
        )

        # Delete from Cloudinary first (deduplicated inside `cloud`).
        for _, public_id in rows:
            cloud.delete(public_id)

        # Then DB rows.
        ids = [rid for rid, _ in rows]
        if ids:
            n, _ = ProductImage.objects.filter(id__in=ids).delete()
            deleted["images"] += n

    # ────────────────────────────────────────────────────────
    # 2. PRODUCTS
    # ────────────────────────────────────────────────────────
    products_overflow = _overflow_plan(usage["products"], limits["products"])
    if products_overflow > 0:
        # Snapshot the products AND their images.
        products_to_delete = list(
            Products.objects
            .filter(business_id__in=biz_ids)
            .order_by("created_at")
            .prefetch_related("images")
            [: products_overflow]
        )

        # First pass — collect every image public_id across all
        # products being deleted.
        for p in products_to_delete:
            for image in p.images.all():
                cloud.delete(image.image_public_id)

        # Then delete products (cascade kills ProductImage rows).
        for p in products_to_delete:
            p.delete()
            deleted["products"] += 1

    # ────────────────────────────────────────────────────────
    # 3. POSTS
    # ────────────────────────────────────────────────────────
    posts_overflow = _overflow_plan(usage["posts"], limits["posts"])
    if posts_overflow > 0:
        posts_to_delete = list(
            Posts.objects
            .filter(business_id__in=biz_ids)
            .order_by("created_at")
            [: posts_overflow]
        )

        for p in posts_to_delete:
            cloud.delete(p.image_public_id)

        for p in posts_to_delete:
            p.delete()
            deleted["posts"] += 1

    # ────────────────────────────────────────────────────────
    # 4. BUSINESSES
    # ────────────────────────────────────────────────────────
    biz_overflow = _overflow_plan(usage["businesses"], limits["businesses"])
    if biz_overflow > 0:
        businesses_to_delete = list(
            Businesses.objects
            .filter(owner=user)
            .order_by("created_at")
            .prefetch_related(
                "posts",
                "products__images",
            )
            [: biz_overflow]
        )

        # Sweep every image inside the businesses being removed.
        for b in businesses_to_delete:
            for post in b.posts.all():
                cloud.delete(post.image_public_id)
            for product in b.products.all():
                for image in product.images.all():
                    cloud.delete(image.image_public_id)

        # Delete businesses (cascade kills everything).
        for b in businesses_to_delete:
            b.delete()
            deleted["businesses"] += 1

    # ────────────────────────────────────────────────────────
    # 5. FINAL SWEEP — catch any leftover orphans
    # ────────────────────────────────────────────────────────
    #
    # Everything the DB still references should now fit the plan.
    # Anything that was *supposed* to be deleted has already been
    # removed. But if a Cloudinary delete failed during the run,
    # we now have an orphan we can no longer reach — because the
    # DB row is gone.
    #
    # The best we can do is log those orphans (already done by
    # `cloud.orphans`) and try ONE more batch delete. If those
    # also fail, they're true orphans — manual cleanup required.
    if cloud.orphans:
        logger.warning(
            "Prune finished with %d orphan(s) | user=%s | plan=%s",
            len(cloud.orphans), user.id, target_plan.slug,
        )
        # One more attempt against the same set
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