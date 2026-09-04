// Systemconfig.tsx
// ============================================================
// System Configuration Component
// ============================================================

import './systemconfig.css'
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import { FiShield, FiUserPlus, FiLoader, FiCheck, FiAlertCircle, FiAward, FiUsers, FiServer } from 'react-icons/fi';

// ============================================================
// TYPES
// ============================================================

interface CreateSystemAdminResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    email: string;
    role: string;
    full_name: string;
  } | null;
  commission: {
    id: number;
    admin_id: number;
    admin_email: string;
    percentage: number;
    platform_percentage: number;
  } | null;
  user_created: boolean;
  user_updated: boolean;
  commission_created: boolean;
  commission_updated: boolean;
  commission_already_exists: boolean;
}

// ============================================================
// API HELPERS
// ============================================================

const createSystemAdmin = async (accessToken: string | null): Promise<CreateSystemAdminResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/system-config/create/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force: false }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to configure system admin');
  }

  return response.json();
};

// ============================================================
// SYSTEM CONFIG COMPONENT
// ============================================================

function Systemconfig() {
  const { access: accessToken } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => createSystemAdmin(accessToken),
    onSuccess: (data) => {
      toast.success('System Admin Configured', {
        description: data.message || 'Admin account and commission setup complete.',
        duration: 5000,
        icon: '🔐',
        style: {
          background: '#0a0a0a',
          border: '1px solid #d4af37',
          color: '#ffffff',
        },
      });
    },
    onError: (error: Error) => {
      toast.error('Configuration Failed', {
        description: error.message || 'Please check your permissions.',
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#0a0a0a',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  const handleConfigure = () => {
    toast.loading('Configuring system...', {
      description: 'Setting up admin account and commission.',
      style: {
        background: '#0a0a0a',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });
    mutation.mutate();
  };

  return (
    <div className="sc-wrapper">
      <div className="sc-header">
        <div className="sc-header-left">
          <div className="sc-icon-wrap">
            <FiShield className="sc-shield-icon" />
          </div>
          <div>
            <h2 className="sc-heading">System Configuration</h2>
            <p className="sc-heading-sub">Manage system admin and commission settings</p>
          </div>
        </div>
      </div>

      <div className="sc-content">
        {/* Main Card */}
        <div className="sc-card">
          <div className="sc-card-header">
            <div className="sc-card-icon">
              <FiUserPlus />
            </div>
            <div>
              <h3 className="sc-card-title">System Admin Setup</h3>
              <p className="sc-card-sub">Create or update system admin account with 100% commission</p>
            </div>
          </div>

          {/* Feature Points */}
          <div className="sc-features">
            <div className="sc-feature">
              <FiUsers className="sc-feature-icon" />
              <span>Creates system admin user from environment variables</span>
            </div>
            <div className="sc-feature">
              <FiAward className="sc-feature-icon" />
              <span>Sets admin commission to <strong>100%</strong></span>
            </div>
            <div className="sc-feature">
              <FiServer className="sc-feature-icon" />
              <span>Platform commission set to <strong>0%</strong></span>
            </div>
          </div>

          {/* Action Button */}
          <button
            className="sc-button"
            onClick={handleConfigure}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <FiLoader className="sc-spinner" />
                Configuring...
              </>
            ) : (
              <>
                <FiUserPlus className="sc-btn-icon" />
                Configure System Admin
              </>
            )}
          </button>

          {/* Success/Error States */}
          {mutation.isSuccess && mutation.data && (
            <div className="sc-result sc-result-success">
              <FiCheck className="sc-result-icon" />
              <div>
                <p className="sc-result-title">Configuration Successful</p>
                <p className="sc-result-message">{mutation.data.message}</p>
                {mutation.data.user && (
                  <div className="sc-result-details">
                    <span>👤 {mutation.data.user.full_name}</span>
                    <span>📧 {mutation.data.user.email}</span>
                    {mutation.data.commission && (
                      <span>💰 {mutation.data.commission.percentage}% Commission</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {mutation.isError && (
            <div className="sc-result sc-result-error">
              <FiAlertCircle className="sc-result-icon" />
              <div>
                <p className="sc-result-title">Configuration Failed</p>
                <p className="sc-result-message">
                  {mutation.error instanceof Error ? mutation.error.message : 'Unknown error occurred'}
                </p>
                <button 
                  className="sc-retry-btn"
                  onClick={handleConfigure}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="sc-footer">
          <span className="sc-footer-text">🔒 Superadmin access required • Changes applied immediately</span>
        </div>
      </div>
    </div>
  );
}

export default Systemconfig;