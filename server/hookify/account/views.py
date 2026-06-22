# views.py
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Accounts
from .permissions import is_superadmin, can_create_user, can_create_admin
from .serializers import MyTokenObtainPairSerializer, CreateNewUserSerializer

User = get_user_model()

# ============================================
# HEALTH CHECK
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "server is running 🚀"})


# ============================================
# AUTHENTICATION VIEWS (NEW - Using Headers)
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login view that returns tokens in response body
    """
    try:
        serializer = MyTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        access = data["access"]
        refresh = data["refresh"]

        user = User.objects.get(email=request.data.get("email"))

        return Response({
            "message": "Login successful",
            "access": access,
            "refresh": refresh,
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({
            "message": "Invalid email or password"
        }, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return Response({
            "message": "Invalid email or password"
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout view - blacklists the refresh token
    """
    try:
        refresh_token = request.data.get("refresh_token")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        return Response({
            "message": "Logout successful"
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            "message": "Logout failed"
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """
    Refresh token view - returns new access token
    """
    try:
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response({
                "message": "Refresh token is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        token = RefreshToken(refresh_token)
        access = str(token.access_token)
        
        return Response({
            "access": access
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            "message": "Invalid refresh token"
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_check(request):
    """
    Check if user is authenticated
    """
    user = request.user
    return Response({
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    })


# ============================================
# USER MANAGEMENT VIEWS (KEPT FROM ORIGINAL)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_logged_in_user(request):
    """
    Get current user details
    """
    user = request.user
    return Response({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "gender": user.gender,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_new_user(request):
    """
    Create a new user (admin/superadmin only)
    """
    target_role = request.data.get("role", "user")

    if target_role == "admin":
        if not can_create_admin(request.user):
            return Response(
                {"message": "Only superadmin can create admin accounts"},
                status=status.HTTP_403_FORBIDDEN
            )
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


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_details(request):
    """
    Update current user's details
    """
    user = request.user
    new_email = request.data.get("email")

    if new_email and new_email != user.email:
        email_exists = Accounts.objects.filter(email=new_email).exclude(id=user.id).exists()
        if email_exists:
            return Response(
                {"message": "Email already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.email = new_email

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


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_password(request):
    """
    Update current user's password
    """
    user = request.user
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")
    confirm_password = request.data.get("confirm_password")

    if not current_password or not user.check_password(current_password):
        return Response({"message": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"message": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 8:
        return Response({"message": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({"message": "Password updated successfully"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fetch_user_by_id(request, id):
    """
    Fetch user by ID (admin/superadmin only)
    """
    if request.user.role not in ["admin", "superadmin"]:
        return Response({"message": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = Accounts.objects.get(id=id)
        return Response({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "phone_number": user.phone_number,
            "gender": user.gender,
        })
    except Accounts.DoesNotExist:
        return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users_by_role(request, role):
    """
    Get all users with a specific role (superadmin only)
    """
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )

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