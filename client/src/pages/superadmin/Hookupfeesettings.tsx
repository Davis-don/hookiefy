import './hookupfeesettings.css'
import { useState, useEffect } from 'react'
import { 
  FiDollarSign, 
  FiSave, 
  FiEdit2, 
  FiXCircle, 
  FiRefreshCw,
  FiInfo
} from 'react-icons/fi'
import { IoMdClose } from "react-icons/io";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'

interface HookupFeeData {
  hookup_fee: number;
  currency: string;
  admin?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  is_new?: boolean;
}

interface HookupFeeResponse {
  success: boolean;
  message: string;
  data: HookupFeeData;
}

interface UpdateHookupFeeResponse {
  success: boolean;
  message: string;
  data: {
    admin_id: number;
    admin_name: string;
    hookup_fee: number;
    currency: string;
  };
}

interface HookupfeesettingsProps {
  onClose?: () => void;
}

// Fetch hookup fee for admin/superadmin
const fetchAdminHookupFee = async (accessToken: string | null): Promise<HookupFeeResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/administration/admin-hookup-fee/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. Only admins and superadmins can access this.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch hookup fee: ${response.status}`);
  }

  return response.json();
};

// Update hookup fee
const updateHookupFee = async (
  accessToken: string | null,
  hookupFee: number
): Promise<UpdateHookupFeeResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/administration/hookup-fee/update/`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hookup_fee: hookupFee }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update hookup fee');
  }

  return response.json();
};

function Hookupfeesettings({ onClose }: HookupfeesettingsProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [hookupFee, setHookupFee] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch current hookup fee for admin
  const {
    data: feeData,
    isLoading: isLoadingFee,
    isError: isFeeError,
    error: feeError,
    refetch: refetchFee,
    isFetching,
  } = useQuery({
    queryKey: ['adminHookupFee', accessToken],
    queryFn: () => fetchAdminHookupFee(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (fee: number) => updateHookupFee(accessToken, fee),
    onSuccess: () => {
      toast.success('Hookup fee updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['adminHookupFee'] });
      refetchFee();
    },
    onError: (error: Error) => {
      toast.error('Failed to update hookup fee', {
        description: error.message || 'Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // Set form value when data loads
  useEffect(() => {
    if (feeData?.data?.hookup_fee !== undefined) {
      setHookupFee(feeData.data.hookup_fee.toString());
    }
  }, [feeData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const feeValue = parseFloat(hookupFee);
    
    if (isNaN(feeValue) || feeValue < 0) {
      toast.error('Invalid fee amount', {
        description: 'Please enter a valid positive number.',
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    const loadingToast = toast.loading('Updating hookup fee...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    updateMutation.mutate(feeValue, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const handleCancel = () => {
    if (feeData?.data?.hookup_fee !== undefined) {
      setHookupFee(feeData.data.hookup_fee.toString());
    } else {
      setHookupFee('');
    }
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchFee();
    if (feeData?.data?.hookup_fee !== undefined) {
      setHookupFee(feeData.data.hookup_fee.toString());
    }
    setIsRefreshing(false);
    
    toast.info('Hookup fee data refreshed', {
      duration: 2000,
      icon: '🔄',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });
  };

  const handleClose = () => {
    if (updateMutation.isPending) return;
    if (onClose) onClose();
  };

  // Loading state
  if (isLoadingFee) {
    return (
      <div className="hfs-main-wrapper">
        <div className="hfs-loading-container">
          <div className="hfs-loading-spinner"></div>
          <p>Loading hookup fee...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isFeeError) {
    const errorMessage = feeError instanceof Error ? feeError.message : 'Failed to load hookup fee';
    
    return (
      <div className="hfs-main-wrapper">
        <div className="hfs-error-container">
          <div className="hfs-error-icon">😅</div>
          <p className="hfs-error-text">{errorMessage}</p>
          <button 
            onClick={() => refetchFee()}
            className="hfs-retry-btn"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const currentFee = feeData?.data?.hookup_fee || 0;
  const currency = feeData?.data?.currency || 'KES';
  const adminName = feeData?.data?.admin?.name || '';
  const adminRole = feeData?.data?.admin?.role || '';
  const isNew = feeData?.data?.is_new || false;

  return (
    <div className="hfs-main-wrapper">
      {/* Header Section */}
      <div className="hfs-header-section">
        <div className="hfs-header-left">
          <div className="hfs-title-wrapper">
            <h2 className="hfs-page-title">Hookup Fee Settings</h2>
            <p className="hfs-page-subtitle">Configure the fee users pay for connections</p>
          </div>
        </div>
        <div className="hfs-header-right">
          {/* Refresh Button */}
          <button 
            className="hfs-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isFetching}
            title="Refresh fee data"
          >
            <FiRefreshCw className={`hfs-refresh-icon ${isRefreshing || isFetching ? 'hfs-spinning' : ''}`} />
          </button>

          {!isEditing && (
            <button 
              className="hfs-edit-btn"
              onClick={handleEdit}
            >
              <FiEdit2 className="hfs-btn-icon" /> Edit Fee
            </button>
          )}
          {onClose && (
            <IoMdClose 
              onClick={handleClose} 
              className={`hfs-close-icon ${updateMutation.isPending ? 'hfs-disabled' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Fee Display */}
      <div className="hfs-fee-display">
        <div className="hfs-fee-label">Current Hookup Fee</div>
        <div className="hfs-fee-amount">
          <span className="hfs-currency">{currency}</span>
          <span className="hfs-amount">{currentFee.toFixed(2)}</span>
        </div>
        {adminName && (
          <div className="hfs-admin-info">
            <span className="hfs-admin-label">Configured by:</span>
            <span className="hfs-admin-name">{adminName} {adminRole && `(${adminRole})`}</span>
          </div>
        )}
        {isNew && (
          <div className="hfs-default-badge">Default fee set</div>
        )}
      </div>

      {/* Form Section */}
      <div className="hfs-form-container">
        <form className="hfs-form" onSubmit={handleSubmit}>
          <div className="hfs-form-group">
            <label className="hfs-form-label">
              <FiDollarSign className="hfs-label-icon" /> Hookup Fee ({currency}) <span className="hfs-required">*</span>
            </label>
            <div className="hfs-input-wrapper">
              <span className="hfs-input-prefix">{currency}</span>
              <input
                type="number"
                className="hfs-form-input"
                placeholder="Enter fee amount"
                value={hookupFee}
                onChange={(e) => setHookupFee(e.target.value)}
                disabled={!isEditing || updateMutation.isPending}
                step="0.01"
                min="0"
                required
              />
            </div>
            <span className="hfs-input-hint">Set the amount users will pay for each connection request</span>
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="hfs-form-actions">
              <button 
                type="submit" 
                className="hfs-save-btn"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="hfs-spinner-small"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="hfs-btn-icon" /> Save Changes
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="hfs-cancel-btn"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <FiXCircle className="hfs-btn-icon" /> Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Info Note */}
      <div className="hfs-info-note">
        <FiInfo className="hfs-info-icon" />
        <span className="hfs-info-text">
          This fee will be charged to users when they request a connection through the platform.
        </span>
      </div>
    </div>
  )
}

export default Hookupfeesettings;