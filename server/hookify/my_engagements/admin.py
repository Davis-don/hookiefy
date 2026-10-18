# my_engagements/admin.py

from django.contrib import admin
from django.contrib.contenttypes.models import ContentType
from django.utils.html import format_html

from .models import Like, Follow


# ============================================================
# HELPERS — shared across LikeAdmin and FollowAdmin
# ============================================================

def _target_preview(obj):
    """
    Return a short human-readable label for the generic target,
    e.g. 'post #17 — Weekend promo' or 'business #7 — Acme Ltd'.
    Falls back to 'type #id' if the target can't be resolved.
    """
    if not obj.content_type_id or not obj.object_id:
        return "—"

    model_label = obj.content_type.model
    try:
        target = obj.content_object
    except Exception:
        target = None

    if target is None:
        return f"{model_label} #{obj.object_id} (missing)"

    label = (
        getattr(target, "business_name", None)   # Businesses
        or getattr(target, "title", None)        # Posts
        or getattr(target, "name", None)         # Products
        or str(target)
    )
    return f"{model_label} #{obj.object_id} — {label}"


class _EngagementAdminBase(admin.ModelAdmin):
    """
    Shared admin config for Like and Follow.
    Both models have the same field shape, so the same
    configuration applies.
    """

    # ── List view ───────────────────────────────────────────
    list_display = (
        "id",
        "user",
        "target_preview",
        "content_type",
        "object_id",
        "created_at",
    )
    list_display_links = ("id", "user")
    list_filter = ("content_type", "created_at")
    ordering = ("-created_at",)
    list_select_related = ("user", "content_type")
    list_per_page = 50
    date_hierarchy = "created_at"
    show_full_result_count = True

    # ── Search ──────────────────────────────────────────────
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "object_id",
    )
    search_help_text = (
        "Search by user email, user name, or target object id."
    )

    # ── Form — fieldsets only (can't mix with `fields`) ─────
    # `fields` was removed; `fieldsets` is the source of truth.
    # All model fields are exposed:
    #   - user (searchable via raw_id)
    #   - content_type (dropdown)
    #   - object_id (editable)
    #   - content_object (read-only resolved preview)
    #   - created_at (read-only, auto_now_add)
    readonly_fields = (
        "content_object",
        "created_at",
    )
    raw_id_fields = ("user",)

    fieldsets = (
        (
            "Who",
            {
                "fields": ("user",),
            },
        ),
        (
            "What",
            {
                "fields": ("content_type", "object_id", "content_object"),
                "description": (
                    "The user's action targets this object. "
                    "'Resolved target' shows a human-readable preview."
                ),
            },
        ),
        (
            "When",
            {
                "fields": ("created_at",),
            },
        ),
    )

    # ── Computed columns ────────────────────────────────────

    @admin.display(description="Target", ordering="object_id")
    def target_preview(self, obj):
        return _target_preview(obj)

    @admin.display(description="Resolved target")
    def content_object(self, obj):
        """
        Read-only field shown in the change form.
        Renders the resolved object with a link to its admin
        page when the target model is registered in admin.
        """
        if obj is None or not obj.pk:
            return "— (save first to resolve)"

        try:
            target = obj.content_object
        except Exception:
            return format_html(
                '<span style="color:#b91c1c;">Could not resolve '
                '({} #{})</span>',
                obj.content_type.model if obj.content_type_id else "?",
                obj.object_id,
            )

        if target is None:
            return format_html(
                '<span style="color:#b91c1c;">Target not found '
                '({} #{})</span>',
                obj.content_type.model if obj.content_type_id else "?",
                obj.object_id,
            )

        try:
            url = target.get_absolute_url()
        except Exception:
            url = None

        if url:
            return format_html('<a href="{}">{}</a>', url, str(target))
        return str(target)

    # ── Queryset optimisation ───────────────────────────────
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user", "content_type")


# ============================================================
# LIKE ADMIN
# ============================================================

@admin.register(Like)
class LikeAdmin(_EngagementAdminBase):
    """Admin for likes: who liked what, when."""


# ============================================================
# FOLLOW ADMIN
# ============================================================

@admin.register(Follow)
class FollowAdmin(_EngagementAdminBase):
    """Admin for follows: who follows what, when."""