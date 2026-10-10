# my_engagements/services.py

from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import F

from .models import Like, Follow


# ============================================================
# TARGET RESOLUTION
# ============================================================
#
# Maps the "target_type" string sent by the client into
# the actual Django model class. Only the three allowed
# targets are listed here — anything else raises ValueError.
# ============================================================

TARGET_MODELS = {
    "product": ("products", "Products"),
    "post":    ("posts",    "Posts"),
    "story":   ("stories",  "Story"),
}


def resolve_target(target_type, target_id):
    """
    Return the model instance for the given type + id.
    Raises ValueError if target_type is unknown.
    Raises Model.DoesNotExist if the row doesn't exist.
    """
    if target_type not in TARGET_MODELS:
        raise ValueError(f"Unknown target_type: {target_type}")

    app_label, model_name = TARGET_MODELS[target_type]
    Model = apps.get_model(app_label, model_name)

    return Model.objects.get(pk=target_id)


def _ct(obj):
    return ContentType.objects.get_for_model(obj)


# ============================================================
# LIKE
# ============================================================

@transaction.atomic
def like_object(user, obj):
    """
    User likes obj (Product / Post / Story).
    Increments likes_count on new likes only.
    """
    created = Like.objects.get_or_create(
        user=user,
        content_type=_ct(obj),
        object_id=obj.pk,
    )[1]

    if created:
        type(obj).objects.filter(pk=obj.pk).update(
            likes_count=F("likes_count") + 1
        )

    return created


@transaction.atomic
def unlike_object(user, obj):
    """
    Remove a Like. Decrements likes_count, never below 0.
    """
    deleted, _ = Like.objects.filter(
        user=user,
        content_type=_ct(obj),
        object_id=obj.pk,
    ).delete()

    if deleted:
        type(obj).objects.filter(
            pk=obj.pk, likes_count__gt=0
        ).update(likes_count=F("likes_count") - 1)

    return deleted > 0


def has_liked(user, obj):
    if not user or not user.is_authenticated:
        return False
    return Like.objects.filter(
        user=user,
        content_type=_ct(obj),
        object_id=obj.pk,
    ).exists()


# ============================================================
# FOLLOW
# ============================================================

@transaction.atomic
def follow_object(user, obj):
    """
    User follows obj. Increments follows_count on new follows only.
    """
    created = Follow.objects.get_or_create(
        user=user,
        content_type=_ct(obj),
        object_id=obj.pk,
    )[1]

    if created:
        type(obj).objects.filter(pk=obj.pk).update(
            follows_count=F("follows_count") + 1
        )

    return created


@transaction.atomic
def unfollow_object(user, obj):
    """
    Remove a Follow. Decrements follows_count, never below 0.
    """
    deleted, _ = Follow.objects.filter(
        user=user,
        content_type=_ct(obj),
        object_id=obj.pk,
    ).delete()

    if deleted:
        type(obj).objects.filter(
            pk=obj.pk, follows_count__gt=0
        ).update(follows_count=F("follows_count") - 1)

    return deleted > 0


def has_followed(user, obj):
    if not user or not user.is_authenticated:
        return False
    return Follow.objects.filter(
        user=user,
        content_type=_ct(obj),
        object_id=obj.pk,
    ).exists()