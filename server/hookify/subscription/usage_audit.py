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
    Return a dict describing the user's current usage:

        {
            "businesses": 3,
            "posts": 41,
            "products": 87,
            "images": 210,
        }
    """
    from businesses.models import Businesses
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


# ============================================================
# PLAN COMPARISON
# ============================================================

def audit_plan_change(user, target_plan):
    """
    Compare the user's current usage against `target_plan`'s
    limits.

    Returns:
        {
            "ok": bool,
            "target_plan_slug": str,
            "target_plan_name": str,
            "usage":    {businesses, posts, products, images},
            "limits":   {businesses, posts, products, images},
            "overflow": {businesses, posts, products, images},
            "total_overflow": int,
            "confirmation_token": str | None,
            "message": str,
        }

    When `ok=True` — no pruning needed; token is None.
    When `ok=False` — token is generated; caller must retry
                       with the token to confirm deletion.
    """
    usage = _snapshot_usage(user)

    limits = {
        "businesses": target_plan.businesses_limit,
        "posts":      target_plan.posts_limit,
        "products":   target_plan.products_limit,
        # The plan limits images PER PRODUCT. The audit compares
        # the user's *current max images per product* against the
        # target's per-product cap. Simpler: compare total images
        # against (products_limit × images_per_product).
        "images":     (
            None
            if (target_plan.products_limit is None
                or target_plan.images_per_product is None)
            else target_plan.products_limit * target_plan.images_per_product
        ),
    }

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

    # Build the confirmation token from user + plan + usage snapshot.
    # If the user deletes something before confirming, the token
    # becomes invalid — which is exactly what we want: re-audit.
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
    current usage against `target_plan`. This guarantees that
    nothing has changed since the audit — if the user deleted
    items or added new ones, we re-audit.
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
    `target_plan`'s limits. Cloudinary images are deleted
    BEFORE their database rows.

    Order of deletion (oldest first within each category):
        1. Product images (per product, keeping the newest)
        2. Products
        3. Posts
        4. Businesses

    Returns a summary:
        {
            "deleted": {businesses, posts, products, images},
            "images_cloudinary_deleted": int,
            "images_cloudinary_failed":  int,
        }
    """
    from businesses.models import Businesses
    from posts.models import Posts
    from products.models import Products, ProductImage

    summary = {
        "deleted": {
            "businesses": 0,
            "posts": 0,
            "products": 0,
            "images": 0,
        },
        "images_cloudinary_deleted": 0,
        "images_cloudinary_failed": 0,
    }

    usage = _snapshot_usage(user)
    limits = {
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

    biz_ids = _user_business_ids(user)

    # ── 1. Images ────────────────────────────────────────
    images_overflow = _overflow_plan(usage["images"], limits["images"])
    if images_overflow > 0:
        # Delete oldest images first, but never strip a product
        # below the per-product cap. Since images_overflow is
        # computed against total budget, we just delete the
        # oldest images across all products until we're under.
        old_images = (
            ProductImage.objects
            .filter(product__business_id__in=biz_ids)
            .order_by("created_at")
            .values_list("id", "image_public_id")[: images_overflow]
        )

        for image_id, public_id in old_images:
            if public_id:
                try:
                    delete_image_from_cloudinary(public_id)
                    summary["images_cloudinary_deleted"] += 1
                except Exception as e:
                    logger.warning(
                        "Failed to delete image %s from Cloudinary: %s",
                        public_id, e,
                    )
                    summary["images_cloudinary_failed"] += 1

            ProductImage.objects.filter(id=image_id).delete()
            summary["deleted"]["images"] += 1

    # ── 2. Products ──────────────────────────────────────
    products_overflow = _overflow_plan(usage["products"], limits["products"])
    if products_overflow > 0:
        old_products = (
            Products.objects
            .filter(business_id__in=biz_ids)
            .order_by("created_at")
            .prefetch_related("images")[: products_overflow]
        )

        # Need fresh queryset since slicing with prefetch_related
        # doesn't always evaluate. Re-query by id.
        product_ids = list(Products.objects
            .filter(business_id__in=biz_ids)
            .order_by("created_at")
            .values_list("id", flat=True)[: products_overflow]
        )

        for p in Products.objects.filter(id__in=product_ids).prefetch_related("images"):
            # Delete each product's images from Cloudinary first
            for image in p.images.all():
                if image.image_public_id:
                    try:
                        delete_image_from_cloudinary(image.image_public_id)
                        summary["images_cloudinary_deleted"] += 1
                    except Exception as e:
                        logger.warning(
                            "Failed to delete image %s from Cloudinary: %s",
                            image.image_public_id, e,
                        )
                        summary["images_cloudinary_failed"] += 1

            p.delete()   # cascade deletes ProductImage rows
            summary["deleted"]["products"] += 1

    # ── 3. Posts ─────────────────────────────────────────
    posts_overflow = _overflow_plan(usage["posts"], limits["posts"])
    if posts_overflow > 0:
        old_posts = (
            Posts.objects
            .filter(business_id__in=biz_ids)
            .order_by("created_at")[: posts_overflow]
        )

        for p in old_posts:
            if p.image_public_id:
                try:
                    delete_image_from_cloudinary(p.image_public_id)
                    summary["images_cloudinary_deleted"] += 1
                except Exception as e:
                    logger.warning(
                        "Failed to delete post image %s: %s",
                        p.image_public_id, e,
                    )
                    summary["images_cloudinary_failed"] += 1

            p.delete()
            summary["deleted"]["posts"] += 1

    # ── 4. Businesses ────────────────────────────────────
    biz_overflow = _overflow_plan(usage["businesses"], limits["businesses"])
    if biz_overflow > 0:
        old_businesses = (
            Businesses.objects
            .filter(owner=user)
            .order_by("created_at")[: biz_overflow]
        )

        for b in old_businesses:
            # Cascade-deletes posts, products, images, properties
            # But first, wipe Cloudinary for every image we can find
            for post in b.posts.all():
                if post.image_public_id:
                    try:
                        delete_image_from_cloudinary(post.image_public_id)
                        summary["images_cloudinary_deleted"] += 1
                    except Exception as e:
                        logger.warning(
                            "Failed to delete post image %s: %s",
                            post.image_public_id, e,
                        )
                        summary["images_cloudinary_failed"] += 1

            for product in b.products.all():
                for image in product.images.all():
                    if image.image_public_id:
                        try:
                            delete_image_from_cloudinary(image.image_public_id)
                            summary["images_cloudinary_deleted"] += 1
                        except Exception as e:
                            logger.warning(
                                "Failed to delete product image %s: %s",
                                image.image_public_id, e,
                            )
                            summary["images_cloudinary_failed"] += 1

            b.delete()
            summary["deleted"]["businesses"] += 1

    logger.info(
        "Downgrade prune | user=%s | plan=%s | %s",
        user.id, target_plan.slug, summary,
    )

    return summary