from rest_framework import serializers
from account.models import Accounts


class UserFeedSerializer(serializers.ModelSerializer):

    country = serializers.CharField(source='profile.country')
    county = serializers.CharField(source='profile.county')
    city = serializers.CharField(source='profile.city')
    bio = serializers.CharField(source='profile.bio')

    minimum_age = serializers.IntegerField(source='preference.minimum_age')
    maximum_age = serializers.IntegerField(source='preference.maximum_age')
    interested_in_gender=serializers.CharField(source='preference.interested_in_gender')

    class Meta:
        model = Accounts
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'country',
            'county',
            'city',
            'role',
            'profile_image_url',
            'bio',
            'interested_in_gender',
            'minimum_age',
            'maximum_age',
        ]