import './actualadmincomedit.css'
import { IoClose } from "react-icons/io5";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useEditComModalStore } from "./store/admninmodaeditcom";
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import { toast } from 'sonner';

interface CommissionData {
  id: number;
  admin_id: number;
  admin_email: string;
  admin_full_name: string;
  admin_role: string;
  percentage: number;
  platform_percentage: number;
  created_at: string;
  updated_at: string;
}

// Fetch single commission by ID
const fetchCommissionById = async (accessToken: string | null, commissionId: string): Promise<CommissionData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  // First get all commissions and find the one with matching ID
  const url = `${import.meta.env.VITE_API_URL}/commissions/get-all-commissions/`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch commission data');
  }

  const data = await response.json();
  const commission = data.data.find((c: CommissionData) => c.id === parseInt(commissionId));
  
  if (!commission) {
    throw new Error('Commission not found');
  }

  return commission;
};

// Update commission by commission ID (using admin_id from commission)
const updateCommission = async (
  accessToken: string | null,
  commissionId: string,
  percentage: number
): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  // First get the commission to get the admin_id
  const commission = await fetchCommissionById(accessToken, commissionId);
  const adminId = commission.admin_id;

  const url = `${import.meta.env.VITE_API_URL}/commissions/update-commission/${adminId}/`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ percentage }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update commission');
  }

  return response.json();
};

function Actualadminconedit() {
  const { mounted, id: commissionId, closeModal } = useEditComModalStore();
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [percentage, setPercentage] = useState<string>('');
  const [adminId, setAdminId] = useState<number | null>(null);
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [commissionError, setCommissionError] = useState<string | null>(null);

  // Fetch commission data using useQuery
  const { 
    data: commission, 
    isLoading, 
    error: fetchError,
    refetch 
  } = useQuery({
    queryKey: ['commission', commissionId, accessToken],
    queryFn: () => fetchCommissionById(accessToken, commissionId!),
    enabled: !!accessToken && !!commissionId && mounted,
    retry: 1,
    staleTime: 0,
    gcTime: 0,
  });

  // Set form data when commission is loaded
  useEffect(() => {
    if (commission) {
      setPercentage(commission.percentage.toString());
      setAdminId(commission.admin_id);
      setAdminName(commission.admin_full_name);
      setAdminEmail(commission.admin_email);
      setCommissionError(null);
    }
  }, [commission]);

  // Reset form when modal closes
  useEffect(() => {
    if (!mounted) {
      setPercentage('');
      setAdminId(null);
      setAdminName('');
      setAdminEmail('');
      setCommissionError(null);
    }
  }, [mounted]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ commissionId, percentage }: { commissionId: string; percentage: number }) =>
      updateCommission(accessToken, commissionId, percentage),
    onSuccess: () => {
      toast.success('Commission updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      // Invalidate and refetch commissions list
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      closeModal();
    },
    onError: (error: Error) => {
      toast.error('Failed to update commission', {
        description: error.message,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!percentage) {
      toast.error('Please enter a percentage', {
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

    const numPercentage = parseFloat(percentage);
    if (isNaN(numPercentage) || numPercentage < 0 || numPercentage > 100) {
      toast.error('Invalid percentage', {
        description: 'Percentage must be between 0 and 100',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    if (!commissionId) {
      toast.error('Commission ID not found', {
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

    updateMutation.mutate({ commissionId, percentage: numPercentage });
  };

  // Handle close modal
  const handleClose = () => {
    if (!updateMutation.isPending) {
      closeModal();
    }
  };

  // Don't render if not mounted
  if (!mounted) return null;

  // Check if user is authenticated
  if (!accessToken) {
    return (
      <div className="overall-actiual-admin-form-edit">
        <div className="form-actual-header-com-edit">
          <h2>Edit Commission</h2>
          <IoClose style={{ cursor: 'pointer' }} onClick={handleClose} />
        </div>
        <div className="form-actual-body-form">
          <div className="error-container">
            <p className="error-message">Please login to edit commissions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overall-actiual-admin-form-edit">
      <div className="form-actual-header-com-edit">
        <h2>Edit Commission</h2>
        <IoClose 
          style={{ cursor: updateMutation.isPending ? 'not-allowed' : 'pointer' }} 
          onClick={handleClose}
        />
      </div>
      <div className="form-actual-body-form">
        {isLoading ? (
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p>Loading commission data...</p>
          </div>
        ) : fetchError || commissionError ? (
          <div className="error-container">
            <p className="error-message">{fetchError?.message || commissionError || 'Failed to load commission data'}</p>
            <button 
              className="btn btn-outline-info mt-2"
              onClick={() => {
                setCommissionError(null);
                refetch();
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="admin-info-section">
              <h3>Admin Information</h3>
              <div className="admin-info-details">
                <p><strong>Name:</strong> {adminName}</p>
                <p><strong>Email:</strong> {adminEmail}</p>
                <p><strong>Admin ID:</strong> {adminId}</p>
                <p><strong>Commission ID:</strong> {commissionId}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='mt-3'>
              <div className="form-group">
                <label htmlFor="percentage" className="form-label">
                  Commission Percentage (%)
                </label>
                <input
                  id="percentage"
                  className='form-control p2 fs-3'
                  type="number"
                  placeholder='Enter percentage (0-100)'
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  disabled={updateMutation.isPending}
                />
                <small className="form-text text-muted">
                  Enter a value between 0 and 100. This is the percentage the admin receives.
                </small>
              </div>
              
              <div className="button-group">
                <button 
                  type="submit" 
                  className='btn fs-3 btn-outline-info mt-2'
                  disabled={updateMutation.isPending || !percentage}
                >
                  {updateMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button 
                  type="button" 
                  className='btn fs-3 btn-outline-secondary mt-2 ms-2'
                  onClick={handleClose}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Actualadminconedit;