from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import datetime

# Import models from their respective apps
from account.models import Accounts
from UserBalance.models import UserBalance  # Correct import from UserBalance app
from assignments.models import ClientAssignment


# ============================================
# ADMIN DASHBOARD STATISTICS VIEW
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_dashboard_stats(request):
    """
    Get dashboard statistics for the currently authenticated admin/superadmin.
    Returns:
    - Total clients assigned to the admin (if admin)
    - Total revenue (total_earned) for the current year
    
    For superadmin: returns all users as clients and total revenue from all users.
    For admin: returns only clients assigned to them and their own revenue.
    """
    user = request.user
    
    # Check if user is admin or superadmin
    if user.role not in ['admin', 'superadmin']:
        return Response(
            {
                "message": "Dashboard stats only available for admin and superadmin",
                "data": None
            },
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get current year
    current_year = timezone.now().year
    
    # --- 1. GET TOTAL CLIENTS ---
    total_clients = 0
    
    if user.role == 'superadmin':
        # Superadmin: count all users with role 'user'
        total_clients = Accounts.objects.filter(role='user').count()
    else:
        # Admin: count only users assigned to this admin
        total_clients = ClientAssignment.objects.filter(
            assigned_admin=user
        ).count()
    
    # --- 2. GET TOTAL REVENUE (CURRENT YEAR) ---
    total_revenue = 0
    
    if user.role == 'superadmin':
        # Superadmin: sum of all total_earned from all users
        revenue_aggregate = UserBalance.objects.aggregate(
            total=Sum('total_earned')
        )
        total_revenue = revenue_aggregate['total'] or 0
    else:
        # Admin: sum of total_earned for their assigned clients and themselves
        # Get all users assigned to this admin
        assigned_users = ClientAssignment.objects.filter(
            assigned_admin=user
        ).values_list('user_id', flat=True)
        
        # Include the admin themselves
        user_ids = list(assigned_users) + [user.id]
        
        # Sum total_earned for all these users
        revenue_aggregate = UserBalance.objects.filter(
            user_id__in=user_ids
        ).aggregate(
            total=Sum('total_earned')
        )
        total_revenue = revenue_aggregate['total'] or 0
    
    # --- 3. CALCULATE PERCENTAGE CHANGE (YEAR OVER YEAR) ---
    # Get previous year's revenue for comparison
    previous_year = current_year - 1
    percentage_change = 0
    
    if user.role == 'superadmin':
        # Superadmin: previous year revenue from all users
        prev_year_revenue = UserBalance.objects.aggregate(
            total=Sum('total_earned')
        )['total'] or 0
    else:
        # Admin: previous year revenue from assigned users
        assigned_users = ClientAssignment.objects.filter(
            assigned_admin=user
        ).values_list('user_id', flat=True)
        user_ids = list(assigned_users) + [user.id]
        
        prev_year_revenue = UserBalance.objects.filter(
            user_id__in=user_ids
        ).aggregate(
            total=Sum('total_earned')
        )['total'] or 0
    
    # Calculate percentage change
    if prev_year_revenue > 0:
        percentage_change = ((total_revenue - prev_year_revenue) / prev_year_revenue) * 100
    
    # Format percentage to 1 decimal place
    percentage_change = round(percentage_change, 1)
    
    # Determine trend
    trend = "up" if percentage_change >= 0 else "down"
    
    # --- 4. BUILD RESPONSE ---
    response_data = {
        "message": "Dashboard stats fetched successfully",
        "data": {
            "clients": {
                "title": "Clients",
                "value": total_clients,
                "percentage": abs(percentage_change),
                "trend": trend,
                "trendcolor": "green" if trend == "up" else "red",
                "color": "rgba(0, 229, 255, 0.4)"
            },
            "revenue": {
                "title": "Revenue (KES)",
                "value": total_revenue,
                "percentage": abs(percentage_change),
                "trend": trend,
                "trendcolor": "green" if trend == "up" else "red",
                "color": "rgba(0, 153, 255, 0.5)"
            }
        }
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


# ============================================
# CURRENT USER BALANCE VIEW
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