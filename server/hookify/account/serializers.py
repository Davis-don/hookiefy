from rest_framework import serializers
from .models import Accounts
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CreateNewUserSerializer(serializers.ModelSerializer):
    confirmpassword = serializers.CharField(write_only=True)

    class Meta:
        model = Accounts
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "gender",
            "role",
            "password",
            "confirmpassword",
        ]
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def validate(self, data):
        if data["password"] != data["confirmpassword"]:
            raise serializers.ValidationError("Passwords do not match!")
        return data

    def create(self, validated_data):
        validated_data.pop("confirmpassword")

        password = validated_data.pop("password")

        user = Accounts(**validated_data)
        user.set_password(password)  # 🔥 important (hashing)
        user.save()

        return user



# Token serializer


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):

    # 👇 This replaces the default ugly error message
    default_error_messages = {
        "no_active_account": "Invalid email or password. Login unsuccessful."
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # 👇 add custom claims into JWT (optional but powerful)
        token["email"] = user.email
        token["role"] = user.role

        return token