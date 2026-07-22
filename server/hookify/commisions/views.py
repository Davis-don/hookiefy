# commissions/views.py
from decimal import Decimal
from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from account.models import Accounts
from account.permissions import is_superadmin
from .models import Commission


# ============================================
# COMMISSION VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_commissions(request):
    """
    Get all commission configurations.
    Only accessible by superadmin.
    """
    # Check if user is superadmin
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get all commissions with admin user data
        commissions = Commission.objects.select_related('admin').all()
        
        data = []
        for commission in commissions:
            data.append({
                "id": commission.id,
                "admin_id": commission.admin.id,
                "admin_email": commission.admin.email,
                "admin_full_name": commission.admin.full_name,
                "admin_role": commission.admin.role,
                "percentage": float(commission.percentage),
                "platform_percentage": float(commission.platform_percentage),
                "created_at": commission.created_at,
                "updated_at": commission.updated_at,
            })
        
        return Response({
            "success": True,
            "message": "Commissions fetched successfully",
            "count": len(data),
            "data": data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "message": f"Failed to fetch commissions: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_commission_by_admin_id(request, admin_id):
    """
    Get commission configuration for a specific admin by their user ID.
    Accessible by:
    - Superadmin (can view any admin's commission)
    - The admin themselves (can view their own commission)
    """
    try:
        # Get the admin user
        try:
            admin = Accounts.objects.get(id=admin_id)
        except Accounts.DoesNotExist:
            return Response({
                "success": False,
                "message": "Admin user not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if the user is an admin or superadmin
        if admin.role not in ['admin', 'superadmin']:
            return Response({
                "success": False,
                "message": "User is not an admin or superadmin"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions
        user = request.user
        is_super = is_superadmin(user)
        is_self = user.id == admin.id
        
        if not (is_super or is_self):
            return Response({
                "success": False,
                "message": "Permission denied. You can only view your own commission or must be superadmin."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get or create commission
        commission, created = Commission.objects.get_or_create(
            admin=admin,
            defaults={'percentage': 20.00}
        )
        
        return Response({
            "success": True,
            "message": "Commission fetched successfully",
            "data": {
                "id": commission.id,
                "admin_id": commission.admin.id,
                "admin_email": commission.admin.email,
                "admin_full_name": commission.admin.full_name,
                "admin_role": commission.admin.role,
                "percentage": float(commission.percentage),
                "platform_percentage": float(commission.platform_percentage),
                "created_at": commission.created_at,
                "updated_at": commission.updated_at,
                "is_newly_created": created,
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "message": f"Failed to fetch commission: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_commission(request, admin_id):
    """
    Update commission percentage for a specific admin.
    Only accessible by superadmin.
    """
    # Check if user is superadmin
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get the percentage from request
    percentage = request.data.get('percentage')
    
    if percentage is None:
        return Response({
            "success": False,
            "message": "percentage field is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate percentage
    try:
        percentage = Decimal(str(percentage))
        if percentage < 0 or percentage > 100:
            return Response({
                "success": False,
                "message": "Percentage must be between 0 and 100"
            }, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({
            "success": False,
            "message": "Percentage must be a valid number"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get the admin user
        try:
            admin = Accounts.objects.get(id=admin_id)
        except Accounts.DoesNotExist:
            return Response({
                "success": False,
                "message": "Admin user not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if the user is an admin or superadmin
        if admin.role not in ['admin', 'superadmin']:
            return Response({
                "success": False,
                "message": "User is not an admin or superadmin"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create commission
        commission, created = Commission.objects.get_or_create(
            admin=admin,
            defaults={'percentage': 20.00}
        )
        
        # Update percentage
        old_percentage = commission.percentage
        commission.percentage = percentage
        commission.save()
        
        return Response({
            "success": True,
            "message": "Commission updated successfully",
            "data": {
                "id": commission.id,
                "admin_id": commission.admin.id,
                "admin_email": commission.admin.email,
                "admin_full_name": commission.admin.full_name,
                "admin_role": commission.admin.role,
                "old_percentage": float(old_percentage),
                "new_percentage": float(commission.percentage),
                "platform_percentage": float(commission.platform_percentage),
                "updated_at": commission.updated_at,
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "message": f"Failed to update commission: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_commission(request):
    """
    Get the commission configuration for the currently authenticated admin/superadmin.
    """
    user = request.user
    
    # Check if user is admin or superadmin
    if user.role not in ['admin', 'superadmin']:
        return Response({
            "success": False,
            "message": "Only admins and superadmins have commission configurations"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get or create commission
        commission, created = Commission.objects.get_or_create(
            admin=user,
            defaults={'percentage': 20.00}
        )
        
        return Response({
            "success": True,
            "message": "Your commission fetched successfully",
            "data": {
                "id": commission.id,
                "admin_id": commission.admin.id,
                "admin_email": commission.admin.email,
                "admin_full_name": commission.admin.full_name,
                "admin_role": commission.admin.role,
                "percentage": float(commission.percentage),
                "platform_percentage": float(commission.platform_percentage),
                "created_at": commission.created_at,
                "updated_at": commission.updated_at,
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "message": f"Failed to fetch your commission: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_commission_summary(request):
    """
    Get summary of all commissions (superadmin only).
    Includes statistics like average, min, max, total admins.
    """
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        commissions = Commission.objects.select_related('admin').all()
        
        total_admins = commissions.count()
        percentages = [float(c.percentage) for c in commissions]
        
        if total_admins > 0:
            avg_percentage = sum(percentages) / len(percentages)
            min_percentage = min(percentages)
            max_percentage = max(percentages)
        else:
            avg_percentage = 0
            min_percentage = 0
            max_percentage = 0
        
        # Get admins without commission (should be none if get_or_create is used everywhere)
        admins_without_commission = Accounts.objects.filter(
            role__in=['admin', 'superadmin']
        ).exclude(
            id__in=commissions.values_list('admin_id', flat=True)
        ).count()
        
        return Response({
            "success": True,
            "message": "Commission summary fetched successfully",
            "data": {
                "total_admins": total_admins,
                "admins_without_commission": admins_without_commission,
                "average_percentage": round(avg_percentage, 2),
                "min_percentage": round(min_percentage, 2),
                "max_percentage": round(max_percentage, 2),
                "default_percentage": 20.00,
                "commissions": [
                    {
                        "admin_id": c.admin.id,
                        "admin_email": c.admin.email,
                        "admin_full_name": c.admin.full_name,
                        "percentage": float(c.percentage),
                        "platform_percentage": float(c.platform_percentage),
                    }
                    for c in commissions
                ]
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "success": False,
            "message": f"Failed to fetch commission summary: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_commissions(request):
    """
    Bulk update commission percentages for multiple admins.
    Only accessible by superadmin.
    
    Request body:
    {
        "commissions": [
            {"admin_id": 1, "percentage": 25.00},
            {"admin_id": 2, "percentage": 30.00},
        ]
    }
    """
    if not is_superadmin(request.user):
        return Response(
            {"message": "Permission denied. Superadmin only."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    commissions_data = request.data.get('commissions')
    
    if not commissions_data or not isinstance(commissions_data, list):
        return Response({
            "success": False,
            "message": "commissions list is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(commissions_data) == 0:
        return Response({
            "success": False,
            "message": "commissions list cannot be empty"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    updated = []
    failed = []
    
    for item in commissions_data:
        admin_id = item.get('admin_id')
        percentage = item.get('percentage')
        
        if not admin_id or percentage is None:
            failed.append({
                "admin_id": admin_id,
                "error": "Missing admin_id or percentage"
            })
            continue
        
        try:
            percentage = Decimal(str(percentage))
            if percentage < 0 or percentage > 100:
                failed.append({
                    "admin_id": admin_id,
                    "error": "Percentage must be between 0 and 100"
                })
                continue
        except (ValueError, TypeError):
            failed.append({
                "admin_id": admin_id,
                "error": "Invalid percentage value"
            })
            continue
        
        try:
            admin = Accounts.objects.get(id=admin_id)
            if admin.role not in ['admin', 'superadmin']:
                failed.append({
                    "admin_id": admin_id,
                    "error": "User is not an admin or superadmin"
                })
                continue
            
            commission, created = Commission.objects.get_or_create(
                admin=admin,
                defaults={'percentage': 20.00}
            )
            
            old_percentage = commission.percentage
            commission.percentage = percentage
            commission.save()
            
            updated.append({
                "admin_id": admin_id,
                "admin_email": admin.email,
                "admin_full_name": admin.full_name,
                "old_percentage": float(old_percentage),
                "new_percentage": float(commission.percentage),
            })
            
        except Accounts.DoesNotExist:
            failed.append({
                "admin_id": admin_id,
                "error": "Admin user not found"
            })
        except Exception as e:
            failed.append({
                "admin_id": admin_id,
                "error": str(e)
            })
    
    return Response({
        "success": True,
        "message": f"Bulk update completed: {len(updated)} updated, {len(failed)} failed",
        "data": {
            "updated": updated,
            "failed": failed,
            "total_processed": len(commissions_data),
            "total_updated": len(updated),
            "total_failed": len(failed),
        }
    }, status=status.HTTP_200_OK)