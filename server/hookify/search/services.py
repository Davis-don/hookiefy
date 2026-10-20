
# search/services.py

from django.contrib.auth import get_user_model
from django.db.models import Q

from businesses.models import Businesses
from posts.models import Posts
from stories.models import Story
from products.models import Products


# ============================================================
# USER MODEL
# ============================================================

User = get_user_model()


# ============================================================
# BUSINESS SEARCH
# ============================================================

def search_businesses(query):
    """
    Search active businesses by name, category, type,
    description, and location.
    """

    return (
        Businesses.objects.filter(
            Q(business_name__icontains=query)
            | Q(business_type__icontains=query)
            | Q(business_category__icontains=query)
            | Q(description__icontains=query)
            | Q(county__icontains=query)
            | Q(city_town__icontains=query)
            | Q(region__icontains=query),
            status="active",
        )
        .select_related("owner")
        .distinct()
    )


# ============================================================
# POST SEARCH
# ============================================================

def search_posts(query):
    """
    Search posts by title, body, and associated business name.

    Only posts belonging to active businesses are returned.
    """

    return (
        Posts.objects.filter(
            Q(title__icontains=query)
            | Q(body__icontains=query)
            | Q(business__business_name__icontains=query),
            business__status="active",
        )
        .select_related("business")
        .distinct()
    )


# ============================================================
# STORY SEARCH
# ============================================================

def search_stories(query):
    """
    Search stories by title, content, category,
    and the author's first or last name.

    Uses actual database fields on Accounts.
    Does not filter on the Python full_name property.
    """

    return (
        Story.objects.filter(
            Q(title__icontains=query)
            | Q(content__icontains=query)
            | Q(category__icontains=query)
            | Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
        )
        .select_related("user")
        .distinct()
    )


# ============================================================
# PRODUCT SEARCH
# ============================================================

def search_products(query):
    """
    Search products by name, description, and associated
    business name or business type.

    Only products belonging to active businesses are returned.
    """

    return (
        Products.objects.filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(business__business_name__icontains=query)
            | Q(business__business_type__icontains=query),
            business__status="active",
        )
        .select_related("business")
        .distinct()
    )


# ============================================================
# USER SEARCH
# ============================================================

def search_users(query):
    """
    Search accounts using actual database fields.

    full_name is a Python property, so the ORM searches
    first_name and last_name separately instead.
    """

    return (
        User.objects.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(email__icontains=query)
        )
        .distinct()
    )
