# account/views.py
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import transaction
from django.db.models import Q
import os

from .models import Accounts
from .permissions import is_superadmin, can_create_user, can_create_admin
from .serializers import MyTokenObtainPairSerializer, CreateNewUserSerializer
from assignments.models import ClientAssignment
from userprofile.models import UserProfile
from userpreference.models import Preference
from UserBalance.models import UserBalance
from commisions.models import Commission
from .controllers.cloudinary_utils import (
    upload_image_to_cloudinary,
    delete_image_from_cloudinary,
    upload_or_replace_profile_image,
    delete_user_all_images
)
import time

User = get_user_model()


# ============================================================
# HELPER: Get System Admin from Environment
# ============================================================

def get_system_admin():
    """
    Get the system admin user from environment variables.
    Returns (system_admin, error_message)
    """
    system_admin_email = os.environ.get('SYSTEM_ADMIN_EMAIL')
    
    if not system_admin_email:
        print("❌ SYSTEM_ADMIN_EMAIL not set in environment variables")
        return None, "System is currently unavailable. Please try again later or contact support."
    
    try:
        system_admin = Accounts.objects.get(email=system_admin_email)
        print(f"✅ System admin found: {system_admin.email} (ID: {system_admin.id})")
        return system_admin, None
    except Accounts.DoesNotExist:
        print(f"❌ System admin not found: {system_admin_email}")
        return None, "System is currently unavailable. Please try again later or contact support."


# ============================================================
# PUBLIC SIGNUP - ASSIGN TO SYSTEM ADMIN (NO AUTHENTICATION REQUIRED)
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])  # ✅ PUBLIC - No authentication required
@transaction.atomic
def create_user_assigned_to_system_admin(request):
    """
    PUBLIC ENDPOINT - Create a new user with role 'user' and automatically assign to System Admin.
    NO AUTHENTICATION REQUIRED - Anyone can sign up.
    System Admin credentials are read from environment variables (SYSTEM_ADMIN_EMAIL).
    """
    
    print("=" * 60)
    print("📝 PUBLIC SIGNUP REQUEST RECEIVED (SYSTEM ADMIN)")
    print("=" * 60)
    print(f"📋 Request data: {request.data}")
    print("=" * 60)
    
    # Get System Admin from environment
    system_admin, error_message = get_system_admin()
    
    if system_admin is None:
        print(f"❌ {error_message}")
        return Response(
            {"message": error_message or "System is currently unavailable. Please try again later or contact support."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Prepare data with role explicitly set to 'user'
    data = request.data.copy()
    data['role'] = 'user'
    
    # Create the user
    serializer = CreateNewUserSerializer(data=data)
    
    if not serializer.is_valid():
        print(f"❌ Serializer validation errors: {serializer.errors}")
        return Response(
            {
                "message": "Validation failed",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Save the user
    try:
        user = serializer.save()
        print(f"✅ User created: {user.email} (ID: {user.id})")
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return Response(
            {"message": f"Failed to create user: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Assign the user to the System Admin
    try:
        assignment = ClientAssignment.objects.create(
            user=user,
            assigned_admin=system_admin
        )
        print(f"✅ User {user.email} assigned to System Admin {system_admin.email}")
    except Exception as e:
        user.delete()
        print(f"❌ Failed to assign user to System Admin: {str(e)}")
        return Response(
            {"message": f"Failed to complete registration: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Return success response
    return Response(
        {
            "message": "Account created successfully! You can now login.",
            "data": {
                **CreateNewUserSerializer(user).data,
                "assignment": {
                    "assigned_to_id": assignment.assigned_admin.id,
                    "assigned_to_email": assignment.assigned_admin.email,
                    "assigned_to_name": assignment.assigned_admin.full_name,
                    "assigned_at": assignment.assigned_at
                }
            }
        },
        status=status.HTTP_201_CREATED
    )


# ============================================================
# PUBLIC SIGNUP - ASSIGN TO SUPERADMIN (DEPRECATED)
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])  # ✅ PUBLIC - No authentication required
@transaction.atomic
def create_user_assigned_to_superadmin(request):
    """
    DEPRECATED - PUBLIC ENDPOINT - Create a new user with role 'user' and automatically assign to superadmin.
    NO AUTHENTICATION REQUIRED - Anyone can sign up.
    This endpoint is deprecated and will be removed. Use create_user_assigned_to_system_admin instead.
    """
    
    print("=" * 60)
    print("⚠️ DEPRECATED: SUPERADMIN SIGNUP REQUEST RECEIVED")
    print("=" * 60)
    print(f"📋 Request data: {request.data}")
    print("=" * 60)
    
    # Check if a superadmin exists in the system
    try:
        superadmin = Accounts.objects.get(role='superadmin')
        print(f"✅ Superadmin found: {superadmin.email} (ID: {superadmin.id})")
    except Accounts.DoesNotExist:
        print("❌ No superadmin found in the system")
        return Response(
            {"message": "System is currently unavailable for registration. Please try again later or contact support."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Accounts.MultipleObjectsReturned:
        superadmin = Accounts.objects.filter(role='superadmin').first()
        print(f"⚠️ Multiple superadmins found, using first: {superadmin.email}")
    
    # Prepare data with role explicitly set to 'user'
    data = request.data.copy()
    data['role'] = 'user'
    
    # Create the user
    serializer = CreateNewUserSerializer(data=data)
    
    if not serializer.is_valid():
        print(f"❌ Serializer validation errors: {serializer.errors}")
        return Response(
            {
                "message": "Validation failed",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Save the user
    try:
        user = serializer.save()
        print(f"✅ User created: {user.email} (ID: {user.id})")
    except Exception as e:
        print(f"❌ Error creating user: {str(e)}")
        return Response(
            {"message": f"Failed to create user: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Assign the user to the superadmin
    try:
        assignment = ClientAssignment.objects.create(
            user=user,
            assigned_admin=superadmin
        )
        print(f"✅ User {user.email} assigned to superadmin {superadmin.email}")
    except Exception as e:
        user.delete()
        print(f"❌ Failed to assign user to superadmin: {str(e)}")
        return Response(
            {"message": f"Failed to complete registration: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Return success response
    return Response(
        {
            "message": "Account created successfully! You can now login.",
            "data": {
                **CreateNewUserSerializer(user).data,
                "assignment": {
                    "assigned_to_id": assignment.assigned_admin.id,
                    "assigned_to_email": assignment.assigned_admin.email,
                    "assigned_to_name": assignment.assigned_admin.full_name,
                    "assigned_at": assignment.assigned_at
                }
            }
        },
        status=status.HTTP_201_CREATED
    )


# ============================================
# HELPER: Create user balance
# ============================================

def create_user_balance(user):
    """
    Create a UserBalance record for a newly created user.
    Balance is initialized to 0.00 by default.
    Only for admin and superadmin roles.
    """
    # Only create balance for admin and superadmin
    if user.role not in ['admin', 'superadmin']:
        print(f"ℹ️ Balance not created for {user.role}: {user.email}")
        return None
    
    try:
        balance = UserBalance.objects.create(
            user=user,
            balance=0.00,
            pending_balance=0.00,
            total_earned=0.00,
            total_withdrawn=0.00,
            currency="KES"
        )
        print(f"💰 Balance created for {user.role}: {user.email} (ID: {user.id})")
        return balance
    except Exception as e:
        print(f"❌ Error creating balance for user {user.email}: {str(e)}")
        raise


# ============================================
# HELPER: Create commission for admin
# ============================================

def create_admin_commission(user):
    """
    Create a Commission record for a newly created admin.
    Commission percentage is set to default 20%.
    Only for admin and superadmin roles.
    """
    # Only create commission for admin and superadmin
    if user.role not in ['admin', 'superadmin']:
        print(f"ℹ️ Commission not created for {user.role}: {user.email}")
        return None
    
    try:
        # Check if commission already exists
        commission, created = Commission.objects.get_or_create(
            admin=user,
            defaults={
                'percentage': 20.00
            }
        )
        
        if created:
            print(f"💰 Commission created for {user.role}: {user.email} (ID: {user.id}) with 20% default")
        else:
            print(f"ℹ️ Commission already exists for {user.role}: {user.email}")
        
        return commission
    except Exception as e:
        print(f"❌ Error creating commission for user {user.email}: {str(e)}")
        raise


def get_user_balance(user):
    """
    Get balance info for a user.
    Returns None for regular users (role 'user').
    """
    if user.role == 'user':
        return None
    
    try:
        balance = UserBalance.objects.get(user=user)
        return {
            'balance': str(balance.balance),
            'pending_balance': str(balance.pending_balance),
            'total_earned': str(balance.total_earned),
            'total_withdrawn': str(balance.total_withdrawn),
            'currency': balance.currency,
        }
    except UserBalance.DoesNotExist:
        return None


def get_user_commission(user):
    """
    Get commission info for a user.
    Returns None for regular users (role 'user').
    """
    if user.role == 'user':
        return None
    
    try:
        commission = Commission.objects.get(admin=user)
        return {
            'percentage': float(commission.percentage),
            'platform_percentage': float(commission.platform_percentage),
            'created_at': commission.created_at,
            'updated_at': commission.updated_at,
        }
    except Commission.DoesNotExist:
        return None


# ============================================
# HEALTH CHECK
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "server is running 🚀"})


# ============================================
# AUTHENTICATION VIEWS
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

        assignment_info = None
        if user.role == 'user':
            try:
                assignment = ClientAssignment.objects.get(user=user)
                assignment_info = {
                    'assigned_to_id': assignment.assigned_admin.id,
                    'assigned_to_email': assignment.assigned_admin.email,
                    'assigned_to_name': assignment.assigned_admin.full_name,
                    'assigned_at': assignment.assigned_at
                }
            except ClientAssignment.DoesNotExist:
                assignment_info = {
                    'assigned_to_id': None,
                    'assigned_to_email': None,
                    'assigned_to_name': None,
                    'assigned_at': None
                }

        balance_info = get_user_balance(user)
        commission_info = get_user_commission(user)

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
                "full_name": user.full_name,
                "profile_image_url": user.profile_image_url,
                "has_profile_image": user.has_profile_image,
                "assignment": assignment_info if user.role == 'user' else None,
                "balance": balance_info,
                "commission": commission_info,
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
    
    assignment_info = None
    if user.role == 'user':
        try:
            assignment = ClientAssignment.objects.get(user=user)
            assignment_info = {
                'assigned_to_id': assignment.assigned_admin.id,
                'assigned_to_email': assignment.assigned_admin.email,
                'assigned_to_name': assignment.assigned_admin.full_name,
            }
        except ClientAssignment.DoesNotExist:
            assignment_info = None
    
    balance_info = get_user_balance(user)
    commission_info = get_user_commission(user)
    
    return Response({
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "profile_image_url": user.profile_image_url,
            "has_profile_image": user.has_profile_image,
            "assignment": assignment_info if user.role == 'user' else None,
            "balance": balance_info,
            "commission": commission_info,
        }
    })


# ============================================
# USER MANAGEMENT VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_logged_in_user(request):
    """
    Get current user details including profile image and balance
    """
    user = request.user
    
    assignment_info = None
    if user.role == 'user':
        try:
            assignment = ClientAssignment.objects.get(user=user)
            assignment_info = {
                'assigned_to_id': assignment.assigned_admin.id,
                'assigned_to_email': assignment.assigned_admin.email,
                'assigned_to_name': assignment.assigned_admin.full_name,
            }
        except ClientAssignment.DoesNotExist:
            assignment_info = None
    
    balance_info = get_user_balance(user)
    commission_info = get_user_commission(user)
    
    return Response({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "gender": user.gender,
        "profile_image_url": user.profile_image_url,
        "profile_image_public_id": user.profile_image_public_id,
        "has_profile_image": bool(user.profile_image_url),
        "assignment": assignment_info if user.role == 'user' else None,
        "balance": balance_info,
        "commission": commission_info,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def has_profile_image(request):
    """
    Check if the currently authenticated user has a profile image.
    """
    user = request.user
    profile_image_url = user.profile_image_url
    has_image = bool(profile_image_url and profile_image_url.strip())
    
    return Response({
        "has_profile_image": has_image,
        "message": "Profile image status checked successfully"
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_new_user(request):
    """
    Create a new user with assignment, balance, and commission
    """
    target_role = request.data.get("role", "user")
    current_user = request.user

    if target_role == "superadmin":
        if Accounts.objects.filter(role='superadmin').exists():
            return Response(
                {"message": "A superadmin already exists. Cannot create another one."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not is_superadmin(current_user):
            return Response(
                {"message": "Only superadmin can create superadmin accounts"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateNewUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            create_user_balance(user)
            create_admin_commission(user)
            
            return Response(
                {
                    "message": "Superadmin created successfully",
                    "data": CreateNewUserSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if target_role == "admin":
        if not is_superadmin(current_user):
            return Response(
                {"message": "Only superadmin can create admin accounts"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateNewUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            create_user_balance(user)
            create_admin_commission(user)
            
            return Response(
                {
                    "message": "Admin created successfully",
                    "data": CreateNewUserSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if target_role == "user":
        if not (current_user.role in ['admin', 'superadmin']):
            return Response(
                {"message": "Only admin or superadmin can create user accounts"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateNewUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            try:
                assignment = ClientAssignment.objects.create(
                    user=user,
                    assigned_admin=current_user
                )
            except Exception as e:
                user.delete()
                return Response(
                    {"message": f"Failed to assign user: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response(
                {
                    "message": "User created and assigned successfully",
                    "data": {
                        **CreateNewUserSerializer(user).data,
                        "assignment": {
                            "assigned_to_id": assignment.assigned_admin.id,
                            "assigned_to_email": assignment.assigned_admin.email,
                            "assigned_to_name": assignment.assigned_admin.full_name,
                            "assigned_at": assignment.assigned_at
                        }
                    }
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {"message": "Invalid role specified"},
        status=status.HTTP_400_BAD_REQUEST
    )


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

    balance_info = get_user_balance(user)
    commission_info = get_user_commission(user)

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
            "full_name": user.full_name,
            "profile_image_url": user.profile_image_url,
            "has_profile_image": user.has_profile_image,
            "balance": balance_info,
            "commission": commission_info,
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


# ============================================
# HELPER: Delete user and all associated data
# ============================================

def delete_user_completely(user, reassign_admin=None):
    """
    Completely delete a user and all associated data
    """
    deleted = False
    cloudinary_images_deleted = False
    reassigned_count = 0
    
    print("=" * 60)
    print("🗑️ STARTING USER DELETION PROCESS")
    print("=" * 60)
    print(f"👤 User: {user.email} ({user.full_name})")
    print(f"🆔 ID: {user.id}")
    print(f"📋 Role: {user.role}")
    print("=" * 60)
    
    try:
        if user.profile_image_public_id:
            print("\n📸 Deleting Cloudinary images...")
            try:
                delete_result = delete_image_from_cloudinary(user.profile_image_public_id)
                if delete_result.get('result') == 'ok':
                    print(f"✅ Profile image deleted: {user.profile_image_public_id}")
                    cloudinary_images_deleted = True
                else:
                    print(f"⚠️ Failed to delete profile image: {delete_result}")
            except Exception as e:
                print(f"⚠️ Error deleting profile image: {str(e)}")
        else:
            print("\n📸 No profile image to delete")
        
        print("\n📝 Deleting user profile...")
        try:
            profile = UserProfile.objects.get(user=user)
            profile.delete()
            print("✅ Profile deleted successfully")
        except UserProfile.DoesNotExist:
            print("ℹ️ No profile found")
        except Exception as e:
            print(f"⚠️ Error deleting profile: {str(e)}")
        
        print("\n⚙️ Deleting user preferences...")
        try:
            preference = Preference.objects.get(user=user)
            preference.delete()
            print("✅ Preferences deleted successfully")
        except Preference.DoesNotExist:
            print("ℹ️ No preferences found")
        except Exception as e:
            print(f"⚠️ Error deleting preferences: {str(e)}")
        
        if user.role in ['admin', 'superadmin']:
            print("\n💰 Deleting user balance...")
            try:
                balance = UserBalance.objects.get(user=user)
                balance.delete()
                print("✅ Balance deleted successfully")
            except UserBalance.DoesNotExist:
                print("ℹ️ No balance found")
            except Exception as e:
                print(f"⚠️ Error deleting balance: {str(e)}")
            
            print("\n📊 Deleting user commission...")
            try:
                commission = Commission.objects.get(admin=user)
                commission.delete()
                print("✅ Commission deleted successfully")
            except Commission.DoesNotExist:
                print("ℹ️ No commission found")
            except Exception as e:
                print(f"⚠️ Error deleting commission: {str(e)}")
        else:
            print("\nℹ️ No balance/commission to delete for regular user")
        
        print("\n📋 Handling assignments...")
        if user.role == 'admin' and reassign_admin:
            reassigned_count = ClientAssignment.objects.filter(assigned_admin=user).update(
                assigned_admin=reassign_admin
            )
            print(f"✅ Reassigned {reassigned_count} clients to {reassign_admin.email}")
        elif user.role == 'user':
            try:
                assignment = ClientAssignment.objects.get(user=user)
                assignment.delete()
                print("✅ User assignment deleted")
            except ClientAssignment.DoesNotExist:
                print("ℹ️ No assignment found")
        
        print("\n🗑️ Deleting user account...")
        user.delete()
        deleted = True
        print("✅ Account deleted successfully")
        
        print("\n" + "=" * 60)
        print("✅ USER DELETION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
        return {
            'deleted': deleted,
            'cloudinary_images_deleted': cloudinary_images_deleted,
            'reassigned_count': reassigned_count
        }
        
    except Exception as e:
        print(f"❌ Error during user deletion: {str(e)}")
        raise


# ============================================
# USER MANAGEMENT BY ID (Superadmin only)
# ============================================

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def manage_user_by_id(request, id):
    """
    Fetch, update, or delete user by ID (superadmin only)
    """
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        user = Accounts.objects.get(id=id)
    except Accounts.DoesNotExist:
        return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        assignment_info = None
        if user.role == 'user':
            try:
                assignment = ClientAssignment.objects.get(user=user)
                assignment_info = {
                    'assigned_to_id': assignment.assigned_admin.id,
                    'assigned_to_email': assignment.assigned_admin.email,
                    'assigned_to_name': assignment.assigned_admin.full_name,
                    'assigned_at': assignment.assigned_at
                }
            except ClientAssignment.DoesNotExist:
                assignment_info = None
        
        balance_info = None
        if user.role in ['admin', 'superadmin']:
            try:
                balance = UserBalance.objects.get(user=user)
                balance_info = {
                    'balance': str(balance.balance),
                    'pending_balance': str(balance.pending_balance),
                    'total_earned': str(balance.total_earned),
                    'total_withdrawn': str(balance.total_withdrawn),
                    'currency': balance.currency,
                }
            except UserBalance.DoesNotExist:
                balance_info = None
        
        commission_info = None
        if user.role in ['admin', 'superadmin']:
            try:
                commission = Commission.objects.get(admin=user)
                commission_info = {
                    'percentage': float(commission.percentage),
                    'platform_percentage': float(commission.platform_percentage),
                    'created_at': commission.created_at,
                    'updated_at': commission.updated_at,
                }
            except Commission.DoesNotExist:
                commission_info = None
        
        return Response({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "role": user.role,
            "phone_number": user.phone_number,
            "gender": user.gender,
            "profile_image_url": user.profile_image_url,
            "profile_image_public_id": user.profile_image_public_id,
            "has_profile_image": user.has_profile_image,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
            "assignment": assignment_info if user.role == 'user' else None,
            "balance": balance_info,
            "commission": commission_info,
        })

    elif request.method == 'PUT':
        if user.id == request.user.id:
            return Response(
                {"message": "You cannot update your own account through this endpoint."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role == 'superadmin':
            return Response(
                {"message": "Cannot update superadmin account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        phone_number = request.data.get("phone_number")
        role = request.data.get("role")
        is_active = request.data.get("is_active")
        assigned_admin_id = request.data.get("assigned_admin_id")

        if email and email != user.email:
            if Accounts.objects.filter(email=email).exclude(id=user.id).exists():
                return Response(
                    {"message": "Email already exists."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.email = email

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if phone_number is not None:
            user.phone_number = phone_number
        
        if role and role in ['user', 'admin']:
            if user.role != role:
                if user.role == 'admin' and role == 'user':
                    superadmin = Accounts.objects.get(role='superadmin')
                    ClientAssignment.objects.filter(assigned_admin=user).update(assigned_admin=superadmin)
                    try:
                        balance = UserBalance.objects.get(user=user)
                        balance.delete()
                        print(f"💰 Balance deleted for {user.email} (changed to user)")
                    except UserBalance.DoesNotExist:
                        pass
                    try:
                        commission = Commission.objects.get(admin=user)
                        commission.delete()
                        print(f"📊 Commission deleted for {user.email} (changed to user)")
                    except Commission.DoesNotExist:
                        pass
                
                if user.role == 'user' and role == 'admin':
                    create_user_balance(user)
                    create_admin_commission(user)
                    ClientAssignment.objects.filter(user=user).delete()
                
                user.role = role
                
                if role == 'user':
                    superadmin = Accounts.objects.get(role='superadmin')
                    ClientAssignment.objects.update_or_create(
                        user=user,
                        defaults={'assigned_admin': superadmin}
                    )
        
        if is_active is not None:
            user.is_active = is_active

        user.save()

        if user.role == 'user' and assigned_admin_id:
            try:
                new_admin = Accounts.objects.get(id=assigned_admin_id, role__in=['admin', 'superadmin'])
                assignment, created = ClientAssignment.objects.get_or_create(user=user)
                assignment.assigned_admin = new_admin
                assignment.save()
            except Accounts.DoesNotExist:
                return Response(
                    {"message": "Invalid admin ID. Must be admin or superadmin."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        assignment_info = None
        if user.role == 'user':
            try:
                assignment = ClientAssignment.objects.get(user=user)
                assignment_info = {
                    'assigned_to_id': assignment.assigned_admin.id,
                    'assigned_to_email': assignment.assigned_admin.email,
                    'assigned_to_name': assignment.assigned_admin.full_name,
                }
            except ClientAssignment.DoesNotExist:
                assignment_info = None
        
        balance_info = None
        if user.role in ['admin', 'superadmin']:
            try:
                balance = UserBalance.objects.get(user=user)
                balance_info = {
                    'balance': str(balance.balance),
                    'pending_balance': str(balance.pending_balance),
                    'total_earned': str(balance.total_earned),
                    'total_withdrawn': str(balance.total_withdrawn),
                    'currency': balance.currency,
                }
            except UserBalance.DoesNotExist:
                balance_info = None
        
        commission_info = None
        if user.role in ['admin', 'superadmin']:
            try:
                commission = Commission.objects.get(admin=user)
                commission_info = {
                    'percentage': float(commission.percentage),
                    'platform_percentage': float(commission.platform_percentage),
                    'created_at': commission.created_at,
                    'updated_at': commission.updated_at,
                }
            except Commission.DoesNotExist:
                commission_info = None

        return Response({
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.full_name,
                "phone_number": user.phone_number,
                "gender": user.gender,
                "profile_image_url": user.profile_image_url,
                "has_profile_image": user.has_profile_image,
                "is_active": user.is_active,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "assignment": assignment_info if user.role == 'user' else None,
                "balance": balance_info,
                "commission": commission_info,
            }
        })

    elif request.method == 'DELETE':
        if user.role == 'superadmin':
            return Response(
                {"message": "Superadmin cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.id == request.user.id:
            return Response(
                {"message": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_email = user.email
        user_name = user.full_name
        user_role = user.role

        try:
            superadmin = None
            if user_role == 'admin':
                superadmin = Accounts.objects.get(role='superadmin')
            
            result = delete_user_completely(user, reassign_admin=superadmin)
            
            return Response({
                "message": f"User '{user_name}' ({user_email}) deleted successfully",
                "role_deleted": user_role,
                "cloudinary_images_deleted": result.get('cloudinary_images_deleted', False),
                "clients_reassigned": result.get('reassigned_count', 0)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"❌ Error during user deletion: {str(e)}")
            return Response({
                "message": f"Failed to delete user: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# USERS BY ROLE VIEWS WITH PAGINATION
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users_by_role_or_all(request, role=None):
    """
    Get users by role with pagination, or all users if 'all' is passed
    """
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )

    current_user = request.user

    if role == 'all' or role is None:
        users = Accounts.objects.exclude(id=current_user.id).order_by('-date_joined')
        message = "All users fetched successfully (excluding current user)"
    else:
        users = Accounts.objects.filter(role=role).exclude(id=current_user.id).order_by('-date_joined')
        message = f"Users with role '{role}' fetched successfully (excluding current user)"

    page = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 5)

    try:
        page = int(page)
        page_size = int(page_size)
        if page_size > 100:
            page_size = 100
    except ValueError:
        page = 1
        page_size = 5

    paginator = Paginator(users, page_size)
    total_pages = paginator.num_pages
    total_count = paginator.count

    try:
        users_page = paginator.page(page)
    except PageNotAnInteger:
        users_page = paginator.page(1)
    except EmptyPage:
        users_page = paginator.page(paginator.num_pages)

    data = []
    for u in users_page:
        assignment_info = None
        if u.role == 'user':
            try:
                assignment = ClientAssignment.objects.get(user=u)
                assignment_info = {
                    'assigned_to_id': assignment.assigned_admin.id,
                    'assigned_to_email': assignment.assigned_admin.email,
                    'assigned_to_name': assignment.assigned_admin.full_name,
                }
            except ClientAssignment.DoesNotExist:
                assignment_info = None
        
        balance_info = None
        if u.role in ['admin', 'superadmin']:
            try:
                balance = UserBalance.objects.get(user=u)
                balance_info = {
                    'balance': str(balance.balance),
                    'pending_balance': str(balance.pending_balance),
                    'total_earned': str(balance.total_earned),
                    'total_withdrawn': str(balance.total_withdrawn),
                    'currency': balance.currency,
                }
            except UserBalance.DoesNotExist:
                balance_info = None
        
        commission_info = None
        if u.role in ['admin', 'superadmin']:
            try:
                commission = Commission.objects.get(admin=u)
                commission_info = {
                    'percentage': float(commission.percentage),
                    'platform_percentage': float(commission.platform_percentage),
                }
            except Commission.DoesNotExist:
                commission_info = None
        
        data.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "full_name": u.full_name,
            "phone_number": u.phone_number,
            "gender": u.gender,
            "profile_image_url": u.profile_image_url,
            "profile_image_public_id": u.profile_image_public_id,
            "has_profile_image": u.has_profile_image,
            "is_active": u.is_active,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "date_joined": u.date_joined,
            "last_login": u.last_login,
            "assignment": assignment_info if u.role == 'user' else None,
            "balance": balance_info,
            "commission": commission_info,
        })

    return Response({
        "message": message,
        "count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": users_page.has_next(),
        "has_previous": users_page.has_previous(),
        "data": data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_users_paginated(request):
    """
    Get all users with pagination (superadmin only)
    """
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )

    current_user = request.user
    users = Accounts.objects.exclude(id=current_user.id).order_by('-date_joined')

    page = request.GET.get('page', 1)
    page_size = request.GET.get('page_size', 5)

    try:
        page = int(page)
        page_size = int(page_size)
        if page_size > 100:
            page_size = 100
    except ValueError:
        page = 1
        page_size = 5

    paginator = Paginator(users, page_size)
    total_pages = paginator.num_pages
    total_count = paginator.count

    try:
        users_page = paginator.page(page)
    except PageNotAnInteger:
        users_page = paginator.page(1)
    except EmptyPage:
        users_page = paginator.page(paginator.num_pages)

    data = []
    for u in users_page:
        assignment_info = None
        if u.role == 'user':
            try:
                assignment = ClientAssignment.objects.get(user=u)
                assignment_info = {
                    'assigned_to_id': assignment.assigned_admin.id,
                    'assigned_to_email': assignment.assigned_admin.email,
                    'assigned_to_name': assignment.assigned_admin.full_name,
                }
            except ClientAssignment.DoesNotExist:
                assignment_info = None
        
        balance_info = None
        if u.role in ['admin', 'superadmin']:
            try:
                balance = UserBalance.objects.get(user=u)
                balance_info = {
                    'balance': str(balance.balance),
                    'pending_balance': str(balance.pending_balance),
                    'total_earned': str(balance.total_earned),
                    'total_withdrawn': str(balance.total_withdrawn),
                    'currency': balance.currency,
                }
            except UserBalance.DoesNotExist:
                balance_info = None
        
        commission_info = None
        if u.role in ['admin', 'superadmin']:
            try:
                commission = Commission.objects.get(admin=u)
                commission_info = {
                    'percentage': float(commission.percentage),
                    'platform_percentage': float(commission.platform_percentage),
                }
            except Commission.DoesNotExist:
                commission_info = None
        
        data.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "full_name": u.full_name,
            "phone_number": u.phone_number,
            "gender": u.gender,
            "profile_image_url": u.profile_image_url,
            "profile_image_public_id": u.profile_image_public_id,
            "has_profile_image": u.has_profile_image,
            "is_active": u.is_active,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
            "date_joined": u.date_joined,
            "last_login": u.last_login,
            "assignment": assignment_info if u.role == 'user' else None,
            "balance": balance_info,
            "commission": commission_info,
        })

    return Response({
        "message": "All users fetched successfully (excluding current user)",
        "count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": users_page.has_next(),
        "has_previous": users_page.has_previous(),
        "data": data
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def delete_current_user(request):
    """
    Delete the currently logged in user account
    """
    user = request.user
    
    if user.role == 'superadmin':
        return Response(
            {"message": "Superadmin cannot be deleted."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user_email = user.email
    user_name = user.full_name or f"{user.first_name} {user.last_name}"
    user_role = user.role
    
    try:
        superadmin = None
        if user_role == 'admin':
            superadmin = Accounts.objects.get(role='superadmin')
        
        result = delete_user_completely(user, reassign_admin=superadmin)
        
        return Response({
            "message": f"User '{user_name}' ({user_email}) deleted successfully",
            "role_deleted": user_role,
            "cloudinary_images_deleted": result.get('cloudinary_images_deleted', False),
            "clients_reassigned": result.get('reassigned_count', 0)
        }, status=status.HTTP_200_OK)
        
    except Accounts.DoesNotExist:
        return Response({
            "message": "Superadmin not found"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"❌ Error during user deletion: {str(e)}")
        return Response({
            "message": f"Failed to delete user: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# USER PROFILE IMAGE UPLOAD
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_image(request):
    """
    Upload profile image for the current user
    """
    try:
        if 'image' not in request.FILES:
            return Response({
                "message": "No image file provided"
            }, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        
        valid_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in valid_types:
            return Response({
                "message": f"Invalid file type. Allowed: {', '.join(valid_types)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print("=" * 60)
        print("📸 PROFILE IMAGE UPLOAD RECEIVED")
        print("=" * 60)
        print(f"📁 File name: {image_file.name}")
        print(f"📏 File size: {image_file.size} bytes ({image_file.size / (1024*1024):.2f} MB)")
        print(f"📄 Content type: {image_file.content_type}")
        print(f"🧑 User ID: {request.user.id}")
        print(f"👤 User Email: {request.user.email}")
        print("=" * 60)
        
        print("\n🔄 Processing profile image...")
        result = upload_or_replace_profile_image(
            image_file=image_file,
            user=request.user,
            folder="profile_images"
        )
        
        print("\n✅ Upload Result:")
        print("-" * 40)
        print(f"🔗 URL: {result['url']}")
        print(f"🆔 Public ID: {result['public_id']}")
        print(f"🔄 Replaced: {result['replaced']}")
        if result['replaced']:
            print(f"🗑️ Old Public ID: {result['old_public_id']}")
        print("-" * 40)
        print("=" * 60)
        print("✅ Profile image processed successfully")
        print("=" * 60)
        
        return Response({
            "message": "Profile image uploaded successfully",
            "file_name": image_file.name,
            "file_size": image_file.size,
            "file_size_mb": round(image_file.size / (1024 * 1024), 2),
            "content_type": image_file.content_type,
            "replaced": result['replaced'],
            "old_public_id": result['old_public_id'],
            "cloudinary": {
                "url": result['url'],
                "public_id": result['public_id'],
            },
            "user": {
                "id": request.user.id,
                "email": request.user.email,
                "profile_image_url": request.user.profile_image_url,
                "profile_image_public_id": request.user.profile_image_public_id,
                "has_profile_image": request.user.has_profile_image
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error in upload_profile_image: {str(e)}")
        return Response({
            "message": f"Failed to upload image: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# ACCOUNT STATUS MANAGEMENT
# ============================================

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_account_status(request):
    """
    Update the current user's account status (public/private)
    """
    user = request.user
    account_status = request.data.get("account_status")
    
    if account_status not in ['public', 'private']:
        return Response(
            {"message": "Invalid account status. Must be 'public' or 'private'."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.account_status = account_status
    user.save()
    
    return Response({
        "message": f"Account status updated to '{account_status}' successfully",
        "account_status": user.account_status
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_account_status(request):
    """
    Get the current user's account status
    """
    user = request.user
    
    return Response({
        "account_status": user.account_status
    }, status=status.HTTP_200_OK)