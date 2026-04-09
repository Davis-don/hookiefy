import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../protected/protectedspinner/Spinner';
import type { FormEvent, ChangeEvent } from 'react';
import { FaSave, FaEdit, FaHeart, FaCog, FaLock } from 'react-icons/fa';
import { MdAdminPanelSettings, MdUpdate, MdAccessTime } from 'react-icons/md';
import { GiCrown, GiMoneyStack } from 'react-icons/gi';
import './adminsettings.css';

interface ClientConfig {
  id: number;
  hookup_fee: string;
  updated_by: number;
  updated_by_email: string;
  updated_at: string;
}

interface ConfigFormData {
  hookup_fee: string;
}

interface ApiError {
  hookup_fee?: string[];
  non_field_errors?: string[];
  error?: string;
}

function AddAdminSettings() {
  const [formData, setFormData] = useState<ConfigFormData>({ hookup_fee: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ConfigFormData, string>>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<ClientConfig>({
    queryKey: ['client-config'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/adminconfig/get/`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch config');
      }
      return response.json();
    }
  });

  const createConfigMutation = useMutation<ClientConfig, ApiError, ConfigFormData>({
    mutationFn: async (data: ConfigFormData) => {
      const response = await fetch(`${apiUrl}/adminconfig/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hookup_fee: parseFloat(data.hookup_fee) }),
      });
      const responseData = await response.json();
      if (!response.ok) throw responseData;
      return responseData;
    },
    onMutate: () => setIsSubmitting(true),
    onSuccess: () => {
      setIsSubmitting(false);
      setIsEditing(false);
      toast.success('Configuration created successfully!', { duration: 5000 });
      setFormData({ hookup_fee: '' });
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['client-config'] });
    },
    onError: (error: ApiError) => {
      setIsSubmitting(false);
      if (error.hookup_fee) {
        const errorMsg = Array.isArray(error.hookup_fee) ? error.hookup_fee[0] : error.hookup_fee;
        setErrors(prev => ({ ...prev, hookup_fee: errorMsg }));
        toast.error(errorMsg, { duration: 5000 });
      }
      if (error.error) toast.error(error.error, { duration: 5000 });
    },
  });

  const updateConfigMutation = useMutation<ClientConfig, ApiError, ConfigFormData>({
    mutationFn: async (data: ConfigFormData) => {
      const response = await fetch(`${apiUrl}/adminconfig/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hookup_fee: parseFloat(data.hookup_fee) }),
      });
      const responseData = await response.json();
      if (!response.ok) throw responseData;
      return responseData;
    },
    onMutate: () => setIsSubmitting(true),
    onSuccess: () => {
      setIsSubmitting(false);
      setIsEditing(false);
      toast.success('Configuration updated successfully!', { duration: 5000 });
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['client-config'] });
    },
    onError: (error: ApiError) => {
      setIsSubmitting(false);
      if (error.hookup_fee) {
        const errorMsg = Array.isArray(error.hookup_fee) ? error.hookup_fee[0] : error.hookup_fee;
        setErrors(prev => ({ ...prev, hookup_fee: errorMsg }));
        toast.error(errorMsg, { duration: 5000 });
      }
      if (error.error) toast.error(error.error, { duration: 5000 });
    },
  });

  useEffect(() => {
    if (config) setFormData({ hookup_fee: config.hookup_fee });
  }, [config]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof ConfigFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ConfigFormData, string>> = {};
    if (!formData.hookup_fee) {
      newErrors.hookup_fee = 'Hookup fee is required';
    } else {
      const fee = parseFloat(formData.hookup_fee);
      if (isNaN(fee) || fee < 0) {
        newErrors.hookup_fee = 'Please enter a valid positive number';
      } else if (fee > 100000) {
        newErrors.hookup_fee = 'Fee cannot exceed KSh 100,000';
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.warning(Object.values(newErrors)[0], { duration: 5000 });
      return false;
    }
    return true;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (config) {
      updateConfigMutation.mutate(formData);
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatKSH = (amount: string) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  if (isLoading) {
    return (
      <div className="admin-config-container">
        <Spinner size="large" color="#dc143c" message="Loading configuration..." />
      </div>
    );
  }

  return (
    <div className="admin-config-container">
      <div className="config-header">
        <h2 className="config-title">
          <GiCrown className="title-icon" />
          Client Configuration
        </h2>
        <div className="config-header-stats">
          <span className="stat-badge">
            <MdAdminPanelSettings />
            Admin Settings
          </span>
        </div>
      </div>

      {config && !isEditing ? (
        <div className="current-config-card">
          <div className="current-config-header">
            <div className="current-config-icon">
              <GiMoneyStack />
            </div>
            <h3>Current Configuration</h3>
            <div className="config-actions-buttons">
              <button className="action-btn edit" onClick={() => setIsEditing(true)}>
                <FaEdit /> Edit
              </button>
            </div>
          </div>
          <div className="current-config-body">
            <div className="config-detail">
              <div className="config-detail-label">Hookup Fee</div>
              <div className="config-detail-value">
                {formatKSH(config.hookup_fee)}
              </div>
            </div>
            <div className="config-meta">
              <div className="meta-item">
                <MdUpdate className="meta-icon" />
                <span>Last updated by: <strong>{config.updated_by_email}</strong></span>
              </div>
              <div className="meta-item">
                <MdAccessTime className="meta-icon" />
                <span>Updated at: <strong>{formatDate(config.updated_at)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      ) : (isEditing || !config) ? (
        <div className="config-form-card">
          <div className="form-card-header">
            <div className="form-card-icon">
              {config ? <FaEdit /> : <FaCog />}
            </div>
            <h3>{config ? 'Edit Configuration' : 'Create Configuration'}</h3>
            {config && (
              <button className="cancel-btn" onClick={() => {
                setIsEditing(false);
                if (config) setFormData({ hookup_fee: config.hookup_fee });
                else setFormData({ hookup_fee: '' });
                setErrors({});
              }}>
                Cancel
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="config-form-group">
              <label className="form-label">
                <GiMoneyStack className="label-icon" />
                Hookup Fee (KSh) <span className="required">*</span>
              </label>
              <div className="fee-input-wrapper">
                <span className="currency-symbol">KSh</span>
                <input
                  type="number"
                  name="hookup_fee"
                  value={formData.hookup_fee}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={errors.hookup_fee ? 'is-invalid' : ''}
                />
              </div>
              {errors.hookup_fee && (
                <div className="config-error-message">
                  <FaHeart /> {errors.hookup_fee}
                </div>
              )}
              <div className="input-hint">
                <small>This fee will be charged to clients for each successful hookup connection in Kenyan Shillings (KSh).</small>
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="small" color="#ffffff" />
              ) : (
                <>
                  <FaSave className="btn-icon" />
                  {config ? 'Update Configuration' : 'Create Configuration'}
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="empty-config-state">
          <div className="empty-icon"><FaCog /></div>
          <h3>No Configuration Found</h3>
          <p>Click the button below to create your first configuration.</p>
          <button className="create-config-btn" onClick={() => setIsEditing(true)}>
            <FaCog /> Create Configuration
          </button>
        </div>
      )}

      <div className="security-note">
        <FaLock className="security-icon" />
        <div className="security-content">
          <strong>Security Notice</strong>
          <p>Only administrators can modify these settings. All changes are logged with user information.</p>
        </div>
      </div>
    </div>
  );
}

export default AddAdminSettings;