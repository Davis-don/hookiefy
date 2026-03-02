import { toast } from '../store/Toaststore'

interface ActionResponse {
  message: string;
  success: boolean;
  admin?: any;
  deactivated_count?: number;
  deleted_count?: number;
}



const apiUrl = import.meta.env.VITE_API_URL;

// Generic fetch handler with error handling
async function handleFetch<T>(
  url: string,
  options: RequestInit,
  successMessage: string,
  errorMessage: string
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    toast.success(successMessage, {
      title: 'Success! ✨',
      duration: 4000,
    });

    return data as T;
  } catch (error: any) {
    console.error('Action error:', error);
    
    const errorMsg = error.error || error.message || errorMessage;
    
    toast.error(errorMsg, {
      title: 'Error',
      duration: 5000,
    });
    
    throw error;
  }
}

// Update admin (inline edit)
export async function updateAdmin(
  adminId: number, 
  data: { first_name?: string; last_name?: string; gender?: string }
): Promise<ActionResponse> {
  const endpoint = `${apiUrl}/accounts/admin/${adminId}/update/`;
  
  return handleFetch<ActionResponse>(
    endpoint,
    { 
      method: 'PATCH',
      body: JSON.stringify(data)
    },
    'Admin updated successfully',
    'Failed to update admin'
  );
}

// Toggle admin status (activate/deactivate)
export async function toggleAdminStatus(adminId: number, currentStatus: boolean): Promise<ActionResponse> {
  const endpoint = `${apiUrl}/accounts/admin/${adminId}/toggle-status/`;
  const action = currentStatus ? 'deactivated' : 'activated';
  
  return handleFetch<ActionResponse>(
    endpoint,
    { method: 'POST' },
    `Admin ${action} successfully`,
    `Failed to ${currentStatus ? 'deactivate' : 'activate'} admin`
  );
}

// Delete admin
export async function deleteAdmin(adminId: number): Promise<ActionResponse> {
  const endpoint = `${apiUrl}/accounts/admin/${adminId}/delete/`;
  
  return handleFetch<ActionResponse>(
    endpoint,
    { method: 'DELETE' },
    'Admin deleted successfully',
    'Failed to delete admin'
  );
}

// Bulk deactivate admins
export async function bulkDeactivateAdmins(adminIds: number[]): Promise<ActionResponse> {
  const endpoint = `${apiUrl}/accounts/admins/bulk/deactivate/`;
  
  return handleFetch<ActionResponse>(
    endpoint,
    { 
      method: 'POST',
      body: JSON.stringify({ admin_ids: adminIds })
    },
    `${adminIds.length} admin${adminIds.length > 1 ? 's' : ''} deactivated successfully`,
    'Failed to deactivate admins'
  );
}

// Bulk delete admins
export async function bulkDeleteAdmins(adminIds: number[]): Promise<ActionResponse> {
  const endpoint = `${apiUrl}/accounts/admins/bulk/delete/`;
  
  return handleFetch<ActionResponse>(
    endpoint,
    { 
      method: 'DELETE',
      body: JSON.stringify({ admin_ids: adminIds })
    },
    `${adminIds.length} admin${adminIds.length > 1 ? 's' : ''} deleted successfully`,
    'Failed to delete admins'
  );
}

// We'll handle confirmation modals in the component now