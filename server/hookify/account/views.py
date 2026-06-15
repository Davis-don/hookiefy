from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .serializers import MyTokenObtainPairSerializer, CreateNewUserSerializer
from .models import Accounts
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .permissions import is_superadmin, can_create_user, can_create_admin


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_new_user(request):

    target_role = request.data.get("role", "user")

    # 🔥 ADMIN creation rule
    if target_role == "admin":
        if not can_create_admin(request.user):
            return Response(
                {"message": "Only superadmin can create admin accounts"},
                status=status.HTTP_403_FORBIDDEN
            )

    # 🔥 USER / OTHER roles rule
    else:
        if not can_create_user(request.user, target_role):
            return Response(
                {"message": "Permission denied to create this user"},
                status=status.HTTP_403_FORBIDDEN
            )

    serializer = CreateNewUserSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "message": "User created successfully",
                "data": CreateNewUserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Login view using JWT and cookies

User = get_user_model()


class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # ❌ LOGIN FAILED (handled cleanly by serializer)
        if response.status_code != 200:
            return Response(
                {"message": "Invalid email or password. Login unsuccessful."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        access = response.data["access"]
        refresh = response.data["refresh"]

        # ✅ get full user
        user = User.objects.get(email=request.data.get("email"))

        res = Response({
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            }
        })

        # 🍪 ACCESS TOKEN COOKIE
        res.set_cookie(
            key="access_token",
            value=access,
            httponly=True,
            secure=False,   # True in production (HTTPS)
            samesite="Lax"
        )

        # 🍪 REFRESH TOKEN COOKIE
        res.set_cookie(
            key="refresh_token",
            value=refresh,
            httponly=True,
            secure=False,
            samesite="Lax"
        )

        return res



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_logged_in_user(request):

    user = request.user

    return Response({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
    })




@api_view(['POST'])
def logout_user(request):

    refresh_token = request.COOKIES.get("refresh_token")

    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

    res = Response({"message": "Logout successful"})

    res.delete_cookie("access_token")
    res.delete_cookie("refresh_token")

    return res


# Super admin enabled views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users_by_role(request, role):

    # 🔒 ONLY SUPERADMIN CAN ACCESS
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )

    # 🔎 fetch users by role
    users = Accounts.objects.filter(role=role)

    data = [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "first_name": u.first_name,
            "last_name": u.last_name,
        }
        for u in users
    ]

    return Response({
        "message": f"Users with role '{role}' fetched successfully",
        "count": len(data),
        "data": data
    })


# Update user details (optional, can be expanded with more fields and permissions)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_details(request):

    user = request.user

    # email uniqueness check
    new_email = request.data.get("email")

    if new_email and new_email != user.email:
        email_exists = Accounts.objects.filter(email=new_email).exclude(id=user.id).exists()

        if email_exists:
            return Response(
                {"message": "Email already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.email = new_email

    # update remaining fields
    user.first_name = request.data.get("first_name", user.first_name)
    user.last_name = request.data.get("last_name", user.last_name)
    user.phone_number = request.data.get("phone_number", user.phone_number)
    user.gender = request.data.get("gender", user.gender)

    user.save()

    return Response({
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "gender": user.gender,
        }
    })



# password update

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_password(request):

    user = request.user


    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not current_password:
        return Response(
            {"message": "Current password is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not user.check_password(current_password):
        return Response(
            {"message": "Current password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if new_password != confirm_password:
        return Response(
            {"message": "New passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not new_password:
        return Response(
            {"message": "New password is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 8:
        return Response(
            {"message": "Password must be at least 8 characters long."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()

    return Response({
        "message": "Password updated successfully"
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fetch_user_by_id(request, id):
    # check the ROLE of the logged-in user
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"message": "Permission denied. Only admin or superadmin can access user details."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        user = Accounts.objects.get(id=id)

        return Response({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
        })

    except Accounts.DoesNotExist:
        return Response(
            {"message": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )