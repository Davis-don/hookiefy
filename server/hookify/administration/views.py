from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from account.models import Accounts
from assignments.models import ClientAssignment
from connections.models import Connection
from .models import PlatformConfig



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_hookup_fee_view(request, connection_id=None):
    """
    Returns the hookup fee for the authenticated user.
    Includes the connection_id for payment initiation.
    """
    
    user = request.user

    # Only regular users can access this endpoint
    if user.role != "user":
        return Response(
            {
                "success": False,
                "message": "Only regular users can access this endpoint."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        # Get the user's assignment
        assignment = ClientAssignment.objects.select_related(
            "assigned_admin"
        ).get(user=user)

        assigned_admin = assignment.assigned_admin

        # Get the admin's configuration
        config = PlatformConfig.objects.get(owner=assigned_admin)

        # Get the connection if connection_id is provided
        connection = None
        if connection_id:
            try:
                connection = Connection.objects.get(
                    connection_id=connection_id,
                    sender=user  # Ensure the user is the sender
                )
            except Connection.DoesNotExist:
                pass  # Connection not found, but we still return the fee

        response_data = {
            "hookup_fee": config.hookup_fee,
            "currency": "KES",
            "assigned_admin": {
                "id": assigned_admin.id,
                "name": assigned_admin.full_name,
                "email": assigned_admin.email,
            },
            "user": {
                "id": user.id,
                "phone_number": user.phone_number,  # Auto-fetch phone number
                "email": user.email,
                "full_name": user.full_name,
            }
        }

        # Add connection_id if available
        if connection:
            response_data["connection_id"] = str(connection.connection_id)
        elif connection_id:
            # If connection_id was provided but not found, still pass it
            response_data["connection_id"] = connection_id

        return Response(
            {
                "success": True,
                "message": "Hookup fee retrieved successfully.",
                "data": response_data,
            },
            status=status.HTTP_200_OK,
        )

    except ClientAssignment.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "You are not assigned to any admin or superadmin."
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except PlatformConfig.DoesNotExist:
        return Response(
            {
                "success": False,
                "message": "Your assigned admin has not configured a hookup fee yet."
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# ============================================
# VIEW 2: FETCH HOOKUP FEE FOR ADMIN/SUPERADMIN
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_admin_hookup_fee_view(request):
    """
    Returns the hookup fee for the authenticated admin or superadmin.
    Only admins and superadmins can access this.
    The fee is obtained from the PlatformConfig of the authenticated admin.
    """
    
    user = request.user

    # Only admins and superadmins can access this endpoint
    if user.role not in ["admin", "superadmin"]:
        return Response(
            {
                "success": False,
                "message": "Only admins and superadmins can access this endpoint."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        # Get or create PlatformConfig for the admin
        config, created = PlatformConfig.objects.get_or_create(
            owner=user,
            defaults={"hookup_fee": 100.00}
        )

        return Response(
            {
                "success": True,
                "message": "Hookup fee retrieved successfully.",
                "data": {
                    "hookup_fee": config.hookup_fee,
                    "currency": "KES",
                    "admin": {
                        "id": user.id,
                        "name": user.full_name,
                        "email": user.email,
                        "role": user.role,
                    },
                    "is_new": created,
                },
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================
# VIEW 3: UPDATE HOOKUP FEE (For Admins/Superadmins)
# ============================================

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_hookup_fee_view(request, user_id=None):
    """
    Updates the hookup fee for a specific user's assigned admin.
    Only admins and superadmins can access this.
    If user_id is provided, updates the fee for that user's admin.
    If no user_id, updates the fee for the authenticated admin's own config.
    """
    
    user = request.user

    # Only admins and superadmins can update hookup fees
    if user.role not in ["admin", "superadmin"]:
        return Response(
            {
                "success": False,
                "message": "Only admins and superadmins can update hookup fees."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get the fee from request data
    hookup_fee = request.data.get("hookup_fee")
    
    if hookup_fee is None:
        return Response(
            {
                "success": False,
                "message": "hookup_fee is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate the fee is a positive number
    try:
        hookup_fee = float(hookup_fee)
        if hookup_fee < 0:
            return Response(
                {
                    "success": False,
                    "message": "Hookup fee must be a positive number."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    except (ValueError, TypeError):
        return Response(
            {
                "success": False,
                "message": "Hookup fee must be a valid number."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # If user_id is provided, update the fee for that user's admin
        if user_id:
            # Check if the target user exists
            try:
                target_user = Accounts.objects.get(id=user_id)
            except Accounts.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": "User not found."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check if the target user has an assignment
            try:
                assignment = ClientAssignment.objects.select_related(
                    "assigned_admin"
                ).get(user=target_user)
                
                assigned_admin = assignment.assigned_admin
                
                # Check if the authenticated admin is the assigned admin
                if assigned_admin.id != user.id:
                    return Response(
                        {
                            "success": False,
                            "message": "You can only update the hookup fee for users assigned to you."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
                
                # Get or create PlatformConfig for the assigned admin
                config, created = PlatformConfig.objects.get_or_create(
                    owner=assigned_admin,
                    defaults={"hookup_fee": hookup_fee}
                )
                
                if not created:
                    config.hookup_fee = hookup_fee
                    config.save()
                
                return Response(
                    {
                        "success": True,
                        "message": f"Hookup fee updated successfully for user {target_user.full_name}.",
                        "data": {
                            "user_id": target_user.id,
                            "user_name": target_user.full_name,
                            "admin_id": assigned_admin.id,
                            "admin_name": assigned_admin.full_name,
                            "hookup_fee": config.hookup_fee,
                            "currency": "KES",
                        }
                    },
                    status=status.HTTP_200_OK,
                )
                
            except ClientAssignment.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": "This user is not assigned to any admin."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
        
        else:
            # Update the authenticated admin's own hookup fee
            config, created = PlatformConfig.objects.get_or_create(
                owner=user,
                defaults={"hookup_fee": hookup_fee}
            )
            
            if not created:
                config.hookup_fee = hookup_fee
                config.save()
            
            return Response(
                {
                    "success": True,
                    "message": "Your hookup fee has been updated successfully.",
                    "data": {
                        "admin_id": user.id,
                        "admin_name": user.full_name,
                        "hookup_fee": config.hookup_fee,
                        "currency": "KES",
                    }
                },
                status=status.HTTP_200_OK,
            )

    except Exception as e:
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred.",
                "error": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )