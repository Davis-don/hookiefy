# =====================================================
# DJANGO IMPORTS
# =====================================================
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models

User = get_user_model()

# =====================================================
# DRF IMPORTS
# =====================================================
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# =====================================================
# LOCAL IMPORTS - USING RELATIVE IMPORTS
# =====================================================
from ..authentication import CookieJWTAuthentication
from ..serializers import (
    ClientSignupSerializer,
    ClientUpdateSerializer,
    ClientDetailSerializer,
    BulkClientActionSerializer,
    ClientTransferSerializer,
    ClientRestoreSerializer,
)
from ..models import SuperAdminProfile, AdminProfile, ClientProfile, ClientHistory


# =====================================================
# CREATE CLIENT (ADMIN OR SUPERADMIN)
# =====================================================
@api_view(["POST"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def create_client(request):
    """Create a new client - accessible by admins and superadmins"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can create clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = ClientSignupSerializer(data=request.data)

    if serializer.is_valid():
        try:
            user = serializer.save()
            
            # Get or create client profile and link to creator
            client_profile = user.client_profile
            client_profile.created_by_admin = request.user
            
            # If superadmin creates client, they also manage it
            if request.user.role == 'superadmin':
                client_profile.managed_by_superuser = request.user
            
            client_profile.save()
            
            # Create history entry
            ClientHistory.objects.create(
                client=client_profile,
                action='created',
                performed_by=request.user,
                details={
                    'created_by': request.user.email,
                    'created_by_role': request.user.role,
                    'created_by_id': request.user.id
                }
            )

            return Response(
                {
                    "message": "Client created successfully",
                    "client": {
                        "id": user.id,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": user.role,
                        "gender": user.client_profile.gender if hasattr(user, "client_profile") else None,
                        "created_by": request.user.email,
                        "created_by_role": request.user.role,
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# FETCH ALL CLIENTS (WITH ROLE-BASED FILTERING)
# =====================================================
@api_view(["GET"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def fetch_all_clients(request):
    """Fetch clients with role-based filtering"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can view clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get query parameters
    include_deleted = request.query_params.get('include_deleted', 'false').lower() == 'true'
    filter_by = request.query_params.get('filter_by', None)  # 'created_by_me', 'managed_by_me', 'all'
    
    # Base queryset
    clients_query = User.objects.filter(role="client").select_related("client_profile")
    
    # Apply role-based filtering
    if request.user.role == 'admin':
        # Admins only see clients they created (unless include_deleted is true)
        clients_query = clients_query.filter(client_profile__created_by_admin=request.user)
        if not include_deleted:
            clients_query = clients_query.filter(client_profile__is_deleted=False)
    
    elif request.user.role == 'superadmin':
        # Superadmins can see all clients with optional filters
        if filter_by == 'created_by_me':
            clients_query = clients_query.filter(client_profile__created_by_admin=request.user)
        elif filter_by == 'managed_by_me':
            clients_query = clients_query.filter(client_profile__managed_by_superuser=request.user)
        
        if not include_deleted:
            clients_query = clients_query.filter(client_profile__is_deleted=False)
    
    # Apply additional filters
    gender_filter = request.query_params.get('gender', None)
    if gender_filter and gender_filter != 'all':
        clients_query = clients_query.filter(client_profile__gender=gender_filter)
    
    search_term = request.query_params.get('search', None)
    if search_term:
        clients_query = clients_query.filter(
            models.Q(email__icontains=search_term) |
            models.Q(first_name__icontains=search_term) |
            models.Q(last_name__icontains=search_term)
        )
    
    # Order by
    order_by = request.query_params.get('order_by', '-id')
    clients_query = clients_query.order_by(order_by)

    client_list = []

    for client in clients_query:
        profile = client.client_profile
        client_list.append({
            "id": client.id,
            "email": client.email,
            "first_name": client.first_name,
            "last_name": client.last_name,
            "gender": profile.gender if profile else None,
            "is_active": client.is_active,
            "is_deleted": profile.is_deleted if profile else False,
            "created_by": profile.created_by_admin.email if profile and profile.created_by_admin else None,
            "created_by_id": profile.created_by_admin.id if profile and profile.created_by_admin else None,
            "managed_by": profile.managed_by_superuser.email if profile and profile.managed_by_superuser else None,
            "managed_by_id": profile.managed_by_superuser.id if profile and profile.managed_by_superuser else None,
            "deleted_by": profile.deleted_by.email if profile and profile.deleted_by else None,
            "deleted_at": profile.deleted_at if profile else None,
            "date_joined": client.date_joined,
        })

    return Response(
        {
            "message": "Clients fetched successfully",
            "total_clients": len(client_list),
            "clients": client_list,
            "filters_applied": {
                "include_deleted": include_deleted,
                "gender": gender_filter,
                "search": search_term,
                "filter_by": filter_by
            }
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# FETCH SINGLE CLIENT DETAILS
# =====================================================
@api_view(["GET"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def fetch_client_details(request, client_id):
    """Fetch detailed information about a specific client"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can view client details."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        client = User.objects.select_related("client_profile").get(id=client_id, role="client")
        profile = client.client_profile
    except User.DoesNotExist:
        return Response(
            {"error": "Client not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check permissions
    if request.user.role == 'admin' and profile.created_by_admin != request.user:
        return Response(
            {"error": "You can only view clients you created."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = ClientDetailSerializer(client)
    return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================
# UPDATE CLIENT
# =====================================================
@api_view(["PATCH", "PUT"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_client(request, client_id):
    """Update client information"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can update clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        client = User.objects.select_related("client_profile").get(id=client_id, role="client")
        profile = client.client_profile
    except User.DoesNotExist:
        return Response(
            {"error": "Client not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check permissions
    if request.user.role == 'admin' and profile.created_by_admin != request.user:
        return Response(
            {"error": "You can only update clients you created."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Don't allow updates on deleted clients
    if profile.is_deleted:
        return Response(
            {"error": "Cannot update a deleted client."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = ClientUpdateSerializer(
        client,
        data=request.data,
        partial=request.method == "PATCH",
        context={"request": request},
    )

    if serializer.is_valid():
        # Store old values for history
        old_values = {
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "gender": profile.gender,
        }
        
        serializer.save()
        
        # Refresh client data
        client.refresh_from_db()
        profile.refresh_from_db()
        
        # Create history entry
        new_values = {
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "gender": profile.gender,
        }
        
        changes = {}
        for field in old_values:
            if old_values[field] != new_values[field]:
                changes[field] = {
                    "old": old_values[field],
                    "new": new_values[field]
                }
        
        if changes:
            ClientHistory.objects.create(
                client=profile,
                action='updated',
                performed_by=request.user,
                details={
                    'changes': changes,
                    'updated_by': request.user.email,
                    'updated_by_role': request.user.role
                }
            )

        return Response(
            {
                "message": "Client updated successfully",
                "client": {
                    "id": client.id,
                    "email": client.email,
                    "first_name": client.first_name,
                    "last_name": client.last_name,
                    "gender": profile.gender,
                    "is_active": client.is_active,
                },
                "changes": changes
            },
            status=status.HTTP_200_OK,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# DELETE CLIENT (SOFT DELETE WITH OPTIONAL PERMANENT)
# =====================================================
@api_view(["DELETE"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_client(request, client_id):
    """Soft delete or permanently delete a client"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can delete clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        client = User.objects.select_related("client_profile").get(id=client_id, role="client")
        profile = client.client_profile
    except User.DoesNotExist:
        return Response(
            {"error": "Client not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if permanent delete (superadmin only)
    permanent = request.data.get('permanent', False)
    
    if permanent and request.user.role != 'superadmin':
        return Response(
            {"error": "Only Superadmins can permanently delete clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Check permissions for soft delete
    if request.user.role == 'admin' and profile.created_by_admin != request.user:
        return Response(
            {"error": "You can only delete clients you created."},
            status=status.HTTP_403_FORBIDDEN,
        )

    client_info = {
        "id": client.id,
        "email": client.email,
        "first_name": client.first_name,
        "last_name": client.last_name,
    }

    if permanent:
        # Permanent delete - remove from database
        client.delete()
        return Response(
            {
                "message": "Client permanently deleted successfully",
                "client": client_info,
            },
            status=status.HTTP_200_OK,
        )
    else:
        # Soft delete
        profile.soft_delete(request.user)
        
        return Response(
            {
                "message": "Client soft deleted successfully",
                "client": client_info,
                "managed_by": profile.managed_by_superuser.email if profile.managed_by_superuser else None,
                "deleted_at": profile.deleted_at,
            },
            status=status.HTTP_200_OK,
        )


# =====================================================
# RESTORE SOFT-DELETED CLIENT
# =====================================================
@api_view(["POST"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def restore_client(request, client_id):
    """Restore a soft-deleted client"""
    
    if request.user.role != 'superadmin':
        return Response(
            {"error": "Only Superadmins can restore deleted clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        client = User.objects.select_related("client_profile").get(id=client_id, role="client")
        profile = client.client_profile
    except User.DoesNotExist:
        return Response(
            {"error": "Client not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not profile.is_deleted:
        return Response(
            {"error": "Client is not deleted."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Restore the client
    profile.restore()
    
    # Create history entry
    ClientHistory.objects.create(
        client=profile,
        action='restored',
        performed_by=request.user,
        details={
            'restored_by': request.user.email,
            'previous_deleted_by': profile.deleted_by.email if profile.deleted_by else None,
            'previous_deleted_at': profile.deleted_at
        }
    )

    return Response(
        {
            "message": "Client restored successfully",
            "client": {
                "id": client.id,
                "email": client.email,
                "first_name": client.first_name,
                "last_name": client.last_name,
                "gender": profile.gender,
                "is_active": client.is_active,
            }
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# BULK DELETE CLIENTS (SOFT DELETE)
# =====================================================
@api_view(["DELETE"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def bulk_delete_clients(request):
    """Soft delete multiple clients at once"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can delete clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = BulkClientActionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    client_ids = serializer.validated_data['client_ids']
    results = {'success': [], 'failed': []}

    for client_id in client_ids:
        try:
            client = User.objects.select_related("client_profile").get(id=client_id, role="client")
            profile = client.client_profile
            
            # Check permissions
            if request.user.role == 'admin' and profile.created_by_admin != request.user:
                results['failed'].append({
                    'id': client_id,
                    'reason': 'Permission denied - not your client'
                })
                continue
            
            if profile.is_deleted:
                results['failed'].append({
                    'id': client_id,
                    'reason': 'Client already deleted'
                })
                continue
            
            # Soft delete
            profile.soft_delete(request.user)
            results['success'].append(client_id)
            
        except User.DoesNotExist:
            results['failed'].append({
                'id': client_id,
                'reason': 'Client not found'
            })

    return Response({
        'message': f"Soft deleted {len(results['success'])} clients",
        'results': results
    }, status=status.HTTP_200_OK)





    # =====================================================
# TRANSFER CLIENT MANAGEMENT
# =====================================================
@api_view(["POST"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def transfer_client_management(request, client_id):
    """Transfer client management to another superuser"""
    
    if request.user.role != 'superadmin':
        return Response(
            {"error": "Only Superadmins can transfer client management."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        client = User.objects.select_related("client_profile").get(id=client_id, role="client")
        profile = client.client_profile
    except User.DoesNotExist:
        return Response(
            {"error": "Client not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ClientTransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_manager_id = serializer.validated_data['new_manager_id']
    
    try:
        new_manager = User.objects.get(id=new_manager_id, role='superadmin')
    except User.DoesNotExist:
        return Response(
            {"error": "New manager not found or not a superadmin."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Store old manager for history
    old_manager = profile.managed_by_superuser
    
    # Transfer management
    profile.managed_by_superuser = new_manager
    profile.save()
    
    # Create history entry
    ClientHistory.objects.create(
        client=profile,
        action='transferred',
        performed_by=request.user,
        details={
            'transferred_by': request.user.email,
            'old_manager': old_manager.email if old_manager else None,
            'new_manager': new_manager.email,
            'old_manager_id': old_manager.id if old_manager else None,
            'new_manager_id': new_manager.id
        }
    )

    return Response(
        {
            "message": "Client management transferred successfully",
            "client_id": client.id,
            "previous_manager": old_manager.email if old_manager else None,
            "new_manager": new_manager.email,
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# BULK DEACTIVATE CLIENTS
# =====================================================
@api_view(["POST"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def bulk_deactivate_clients(request):
    """Deactivate multiple clients at once"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can deactivate clients."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = BulkClientActionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    client_ids = serializer.validated_data['client_ids']
    results = {'success': [], 'failed': []}

    for client_id in client_ids:
        try:
            client = User.objects.select_related("client_profile").get(id=client_id, role="client")
            profile = client.client_profile
            
            # Check permissions
            if request.user.role == 'admin' and profile.created_by_admin != request.user:
                results['failed'].append({
                    'id': client_id,
                    'reason': 'Permission denied - not your client'
                })
                continue
            
            if profile.is_deleted:
                results['failed'].append({
                    'id': client_id,
                    'reason': 'Client is deleted'
                })
                continue
            
            client.is_active = False
            client.save()
            
            results['success'].append(client_id)
            
        except User.DoesNotExist:
            results['failed'].append({
                'id': client_id,
                'reason': 'Client not found'
            })

    return Response({
        'message': f"Deactivated {len(results['success'])} clients",
        'results': results
    }, status=status.HTTP_200_OK)


# =====================================================
# GET CLIENT HISTORY
# =====================================================
@api_view(["GET"])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_client_history(request, client_id):
    """Get action history for a specific client"""
    
    if request.user.role not in ["admin", "superadmin"]:
        return Response(
            {"error": "Only Admins and Superadmins can view client history."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        client = User.objects.select_related("client_profile").get(id=client_id, role="client")
        profile = client.client_profile
    except User.DoesNotExist:
        return Response(
            {"error": "Client not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check permissions
    if request.user.role == 'admin' and profile.created_by_admin != request.user:
        return Response(
            {"error": "You can only view history of clients you created."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get pagination parameters
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    start = (page - 1) * page_size
    end = start + page_size

    history = ClientHistory.objects.filter(client=profile).select_related('performed_by').order_by('-timestamp')
    total = history.count()
    
    history_data = []
    for entry in history[start:end]:
        history_data.append({
            'id': entry.id,
            'action': entry.action,
            'performed_by': entry.performed_by.email if entry.performed_by else 'System',
            'performed_by_id': entry.performed_by.id if entry.performed_by else None,
            'timestamp': entry.timestamp,
            'details': entry.details,
        })

    return Response({
        'client_id': client_id,
        'client_email': client.email,
        'history': history_data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': (total + page_size - 1) // page_size
        }
    }, status=status.HTTP_200_OK)