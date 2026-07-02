from django.db.models import Case, When, Value, IntegerField
from account.models import Accounts

def get_user_feed(user):
    """
    Retrieves and prioritizes users for the feed based on location proximity,
    ordered by their profile's 'updated_at' timestamp within each location tier.
    
    CRITICAL: Filters out any user where 'profile' or 'preference' is null.
    """
    # 1. Safely extract current user location from their profile
    current_country = None
    current_county = None
    current_city = None

    if hasattr(user, 'profile') and user.profile:
        current_country = getattr(user.profile, 'country', None)
        current_county = getattr(user.profile, 'county', None)
        current_city = getattr(user.profile, 'city', None)

    # 2. Base Query: Must be role='user', NOT the current user,
    # AND both profile and preference MUST exist (not be null)
    base_queryset = Accounts.objects.filter(
        role="user",
        profile__isnull=False,      # Excludes users without a profile profile entry
        preference__isnull=False    # Excludes users without a preference entry
    ).exclude(id=user.id)

    # 3. Apply Tiered Conditional Sorting & Order by profile updated time
    if current_country:
        feed_queryset = base_queryset.annotate(
            location_score=Case(
                # Tier 1: Match Country + County + City
                When(
                    profile__country=current_country,
                    profile__county=current_county,
                    profile__city=current_city,
                    then=Value(4)
                ),
                # Tier 2: Match Country + County
                When(
                    profile__country=current_country,
                    profile__county=current_county,
                    then=Value(3)
                ),
                # Tier 3: Match Country only
                When(
                    profile__country=current_country,
                    then=Value(2)
                ),
                # Tier 4: Remaining users anywhere else (but still have valid profile/preference records)
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by('-location_score', '-profile__updated_at')
    else:
        # Fallback if current user has no location profile data
        feed_queryset = base_queryset.order_by('-profile__updated_at')

    # 4. Performance Optimization: Inner joins account, profile, and preference tables
    return feed_queryset.select_related('profile', 'preference')