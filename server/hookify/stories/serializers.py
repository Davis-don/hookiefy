# stories/serializers.py

import bleach
from rest_framework import serializers

from .models import Story


# ============================================================
# HTML SANITIZATION CONFIG
# ============================================================

# Tags TipTap can produce — anything else is stripped.
ALLOWED_TAGS = [
    # text
    "p", "br", "span",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark",
    # headings
    "h1", "h2", "h3", "h4", "h5", "h6",
    # lists
    "ul", "ol", "li",
    # quotes / code
    "blockquote", "code", "pre", "hr",
    # links
    "a",
]

ALLOWED_ATTRS = {
    "a":    ["href", "title", "rel", "target"],
    "code": ["class"],
    "pre":  ["class"],
    "span": ["class"],
}

# Force safe link attributes on every <a>
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_html(raw: str) -> str:
    """
    Clean user-supplied HTML.
    - Strips dangerous tags & attributes
    - Blocks javascript:, data:, vbscript: URLs
    - Forces rel="noopener noreferrer" + target="_blank" on links
    """
    cleaned = bleach.clean(
        raw or "",
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
        strip_comments=True,
    )

    # Add link hardening
    cleaned = bleach.linkify(
        cleaned,
        callbacks=[
            bleach.callbacks.nofollow,
            bleach.callbacks.target_blank,
        ],
        skip_tags=["pre", "code"],
    )

    return cleaned.strip()


def html_to_text(raw: str) -> str:
    """
    Strip all tags and unescape entities to get plain text.
    Used for length validation and summary generation.
    """
    text = bleach.clean(raw or "", tags=[], strip=True)
    # collapse whitespace
    return " ".join(text.split()).strip()


def is_blank_html(raw: str) -> bool:
    """True if the HTML contains no meaningful text."""
    return len(html_to_text(raw)) == 0


# ============================================================
# MIXIN — shared validation
# ============================================================

class StoryValidationMixin:
    """
    Shared field-level validation for create & update.
    Works with optional fields (update) and required fields (create).
    """

    TITLE_MAX = 200
    CONTENT_MIN_TEXT = 20
    CONTENT_MAX_HTML = 20_000   # guard against huge payloads

    def _clean_title(self, value, *, allow_none: bool):
        if value is None and allow_none:
            return value
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        if len(value) > self.TITLE_MAX:
            raise serializers.ValidationError(
                f"Title cannot exceed {self.TITLE_MAX} characters."
            )
        return value

    def _clean_content(self, value, *, allow_none: bool):
        if value is None and allow_none:
            return value

        raw = value or ""

        if len(raw) > self.CONTENT_MAX_HTML:
            raise serializers.ValidationError(
                "Content is too large."
            )

        cleaned = sanitize_html(raw)

        if is_blank_html(cleaned):
            raise serializers.ValidationError("Content cannot be empty.")

        # Validate against *plain text* length, not HTML length
        plain_len = len(html_to_text(cleaned))
        if plain_len < self.CONTENT_MIN_TEXT:
            raise serializers.ValidationError(
                f"Story should be at least {self.CONTENT_MIN_TEXT} "
                "characters long."
            )

        return cleaned

    def _clean_category(self, value, *, allow_none: bool):
        if value is None and allow_none:
            return value
        valid = {choice[0] for choice in Story.CATEGORY_CHOICES}
        if value not in valid:
            raise serializers.ValidationError(
                f"Category must be one of: {', '.join(sorted(valid))}."
            )
        return value


# ============================================================
# READ
# ============================================================

class StorySerializer(serializers.ModelSerializer):
    """
    Read serializer — used for every response.
    - content: sanitized HTML
    - summary: short plain-text preview
    """

    author_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    author_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )

    summary = serializers.SerializerMethodField()
    content_html = serializers.SerializerMethodField()
    content_text = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = (
            "id",
            "user",
            "author_email",
            "author_full_name",
            "title",
            "content",           # raw stored HTML (already sanitized on write)
            "content_html",      # same as content, sanitized again for safety
            "content_text",      # plain text version
            "summary",           # short preview
            "category",
            "category_display",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    # ── computed fields ────────────────────────────────

    def get_content_html(self, obj) -> str:
        # Re-sanitize on read — defends against legacy/dirty rows
        return sanitize_html(obj.content or "")

    def get_content_text(self, obj) -> str:
        return html_to_text(obj.content or "")

    def get_summary(self, obj) -> str:
        text = html_to_text(obj.content or "")
        if len(text) <= 160:
            return text
        return text[:157].rstrip() + "…"


# ============================================================
# CREATE
# ============================================================

class StoryCreateSerializer(
    StoryValidationMixin,
    serializers.ModelSerializer,
):
    """
    Validate + sanitize title, content, and category.
    The author is set by the view — never accepted from the client.
    """

    class Meta:
        model = Story
        fields = ("title", "content", "category")

    # ── field-level ────────────────────────────────────

    def validate_title(self, value):
        return self._clean_title(value, allow_none=False)

    def validate_content(self, value):
        return self._clean_content(value, allow_none=False)

    def validate_category(self, value):
        return self._clean_category(value, allow_none=False)


# ============================================================
# UPDATE
# ============================================================

class StoryUpdateSerializer(
    StoryValidationMixin,
    serializers.ModelSerializer,
):
    """
    Same validation as create, but every field is optional.
    Ownership cannot be changed through this serializer.
    """

    class Meta:
        model = Story
        fields = ("title", "content", "category")
        extra_kwargs = {
            "title":    {"required": False},
            "content":  {"required": False},
            "category": {"required": False},
        }

    def validate_title(self, value):
        return self._clean_title(value, allow_none=True)

    def validate_content(self, value):
        return self._clean_content(value, allow_none=True)

    def validate_category(self, value):
        return self._clean_category(value, allow_none=True)