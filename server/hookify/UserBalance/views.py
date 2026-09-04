# account/views.py
from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Accounts, UserBalance
from django.conf import settings
import os

# ============================================
# GET CURRENT USER BALANCE
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user_balance(request):
    """
    Get the balance of the currently authenticated user.
    Only admin and superadmin users have balances.
    Regular users (role 'user') will receive a 404 response.
    """
    user = request.user
    
    # Check if user is admin or superadmin
    if user.role not in ['admin', 'superadmin']:
        return Response(
            {
                "message": "Balance not available for users with role 'user'",
                "has_balance": False
            },
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        # Get the user's balance
        balance = UserBalance.objects.get(user=user)
        
        return Response({
            "message": "Balance fetched successfully",
            "has_balance": True,
            "data": {
                "balance": str(balance.balance),
                "pending_balance": str(balance.pending_balance),
                "total_earned": str(balance.total_earned),
                "total_withdrawn": str(balance.total_withdrawn),
                "currency": balance.currency,
                "created_at": balance.created_at,
                "updated_at": balance.updated_at,
            }
        }, status=status.HTTP_200_OK)
        
    except UserBalance.DoesNotExist:
        return Response(
            {
                "message": "Balance not found for this user",
                "has_balance": False
            },
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================
# GET SUPER ADMIN BALANCE (SYSTEM ADMIN)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_superadmin_balance(request):
    """
    Get the balance of the system superadmin.
    This endpoint fetches the balance of the admin user
    whose email matches the SYSTEM_ADMIN_EMAIL from environment variables.
    
    Access restricted to:
    - Superadmin users (role='superadmin')
    - The system admin themselves
    """
    user = request.user
    
    # Get system admin email from environment
    system_admin_email = os.getenv('SYSTEM_ADMIN_EMAIL')
    
    if not system_admin_email:
        return Response(
            {
                "message": "System admin email not configured in environment",
                "has_balance": False
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Check if the requesting user is the system admin or a superadmin
    is_system_admin = user.email == system_admin_email
    is_superadmin = user.role == 'superadmin'
    
    # Only allow access if user is the system admin or a superadmin
    if not (is_system_admin or is_superadmin):
        return Response(
            {
                "message": "You do not have permission to access superadmin balance",
                "has_balance": False
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get the system admin user
        system_admin_user = Accounts.objects.get(email=system_admin_email)
        
        # Check if the system admin has the correct role
        if system_admin_user.role not in ['admin', 'superadmin']:
            return Response(
                {
                    "message": "System admin does not have admin or superadmin role",
                    "has_balance": False
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the system admin's balance
        balance = UserBalance.objects.get(user=system_admin_user)
        
        return Response({
            "message": "Superadmin balance fetched successfully",
            "has_balance": True,
            "data": {
                "balance": str(balance.balance),
                "pending_balance": str(balance.pending_balance),
                "total_earned": str(balance.total_earned),
                "total_withdrawn": str(balance.total_withdrawn),
                "currency": balance.currency,
                "created_at": balance.created_at,
                "updated_at": balance.updated_at,
                "user": {
                    "email": system_admin_user.email,
                    "full_name": system_admin_user.full_name,
                    "role": system_admin_user.role
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Accounts.DoesNotExist:
        return Response(
            {
                "message": f"System admin user with email {system_admin_email} not found",
                "has_balance": False
            },
            status=status.HTTP_404_NOT_FOUND
        )
        
    except UserBalance.DoesNotExist:
        return Response(
            {
                "message": "Balance not found for system admin",
                "has_balance": False
            },
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================
# GET USER BALANCE BY EMAIL (Admin Only)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_balance_by_email(request, email):
    """
    Get balance of a specific user by email.
    Only accessible by admin and superadmin users.
    """
    user = request.user
    
    # Check if requesting user is admin or superadmin
    if user.role not in ['admin', 'superadmin']:
        return Response(
            {
                "message": "You do not have permission to view other users' balances",
                "has_balance": False
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        target_user = Accounts.objects.get(email=email)
        
        # Check if target user has admin or superadmin role
        if target_user.role not in ['admin', 'superadmin']:
            return Response(
                {
                    "message": f"User {email} does not have admin or superadmin role",
                    "has_balance": False
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        balance = UserBalance.objects.get(user=target_user)
        
        return Response({
            "message": "Balance fetched successfully",
            "has_balance": True,
            "data": {
                "balance": str(balance.balance),
                "pending_balance": str(balance.pending_balance),
                "total_earned": str(balance.total_earned),
                "total_withdrawn": str(balance.total_withdrawn),
                "currency": balance.currency,
                "created_at": balance.created_at,
                "updated_at": balance.updated_at,
                "user": {
                    "email": target_user.email,
                    "full_name": target_user.full_name,
                    "role": target_user.role
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Accounts.DoesNotExist:
        return Response(
            {
                "message": f"User with email {email} not found",
                "has_balance": False
            },
            status=status.HTTP_404_NOT_FOUND
        )
        
    except UserBalance.DoesNotExist:
        return Response(
            {
                "message": f"Balance not found for user {email}",
                "has_balance": False
            },
            status=status.HTTP_404_NOT_FOUND
        )


# ============================================
# GET ALL ADMIN AND SUPERADMIN BALANCES
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_admin_balances(request):
    """
    Get balances of all admin and superadmin users.
    Only accessible by superadmin users.
    """
    user = request.user
    
    # Only superadmin can view all admin balances
    if user.role != 'superadmin':
        return Response(
            {
                "message": "Only superadmin users can view all admin balances",
                "has_balance": False
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all admin and superadmin users
    admin_users = Accounts.objects.filter(role__in=['admin', 'superadmin'])
    
    balances_data = []
    
    for admin_user in admin_users:
        try:
            balance = UserBalance.objects.get(user=admin_user)
            balances_data.append({
                "user": {
                    "email": admin_user.email,
                    "full_name": admin_user.full_name,
                    "role": admin_user.role
                },
                "balance": str(balance.balance),
                "pending_balance": str(balance.pending_balance),
                "total_earned": str(balance.total_earned),
                "total_withdrawn": str(balance.total_withdrawn),
                "currency": balance.currency,
                "has_balance": True
            })
        except UserBalance.DoesNotExist:
            balances_data.append({
                "user": {
                    "email": admin_user.email,
                    "full_name": admin_user.full_name,
                    "role": admin_user.role
                },
                "balance": "0.00",
                "pending_balance": "0.00",
                "total_earned": "0.00",
                "total_withdrawn": "0.00",
                "currency": "KES",
                "has_balance": False
            })
    
    return Response({
        "message": "All admin balances fetched successfully",
        "count": len(balances_data),
        "data": balances_data
    }, status=status.HTTP_200_OK)