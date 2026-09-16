# userprofile/serializers.py

from datetime import date

from rest_framework import serializers

from .models import UserProfile


# ============================================================
# USER PROFILE SERIALIZER
# ============================================================

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the UserProfile model.

    Notes:
        - `user` is the primary key (OneToOne), so it's read-only
          here. The profile is always created/updated via the
          authenticated user, never by passing an arbitrary user id.
        - `age` is a computed property on the model; it's read-only.
        - Every optional field accepts null AND blank so the
          frontend can send "" or null without a 400.
    """

    # --------------------------------------------------------
    # USER DERIVED FIELDS (read-only)
    # --------------------------------------------------------

    user_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    user_full_name = serializers.CharField(
        source="user.full_name",
        read_only=True,
    )

    user_role = serializers.CharField(
        source="user.role",
        read_only=True,
    )

    # --------------------------------------------------------
    # COMPUTED FIELD (read-only)
    # --------------------------------------------------------

    age = serializers.IntegerField(
        read_only=True,
        allow_null=True,
    )

    # --------------------------------------------------------
    # OPTIONAL PROFILE FIELDS
    # --------------------------------------------------------
    #
    # Explicitly declared so we can accept:
    #   - missing key            (required=False)
    #   - empty string ""        (allow_blank=True)
    #   - explicit null          (allow_null=True)
    #
    # Without these flags, DRF rejects "" and null for
    # CharField / DateField, which is what caused the 400s.
    # --------------------------------------------------------

    bio = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    country = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )

    county = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )

    city = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
    )

    date_of_birth = serializers.DateField(
        required=False,
        allow_null=True,
    )

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        model = UserProfile
        fields = [
            "user",
            "user_email",
            "user_full_name",
            "user_role",
            "bio",
            "country",
            "county",
            "city",
            "date_of_birth",
            "age",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "user_email",
            "user_full_name",
            "user_role",
            "age",
            "created_at",
            "updated_at",
        ]

    # --------------------------------------------------------
    # FIELD VALIDATION
    # --------------------------------------------------------

    def validate_date_of_birth(self, value):
        """
        Date of birth cannot be in the future.
        Empty / null values are allowed.
        """

        if value is None:
            return None

        if value > date.today():

            raise serializers.ValidationError(
                "Date of birth cannot be in the future."
            )

        return value

    def validate_bio(self, value):
        """Empty string → None so the DB stores null consistently."""
        if value == "":
            return None
        return value

    def validate_country(self, value):
        if value == "":
            return None
        return value

    def validate_county(self, value):
        if value == "":
            return None
        return value

    def validate_city(self, value):
        if value == "":
            return None
        return value