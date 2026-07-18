from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserBalance

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