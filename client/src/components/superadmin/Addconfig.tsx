import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../protected/protectedspinner/Spinner';
import type { FormEvent, ChangeEvent } from 'react';
import { FaHeart, FaPercentage, FaUser, FaSearch, FaFilter, FaTimes, FaCheckCircle, FaUserCircle } from 'react-icons/fa';
import { MdAdminPanelSettings, MdEmail, MdAccessTime } from 'react-icons/md';
import { GiCrown } from 'react-icons/gi';
import './addconfig.css';

interface Admin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  gender: string;
  is_active: boolean;
  date_joined: string;
}

interface ApiResponse {
  message: string;
  total_admins: number;
  admins: Admin[];
}

interface ConfigFormData {
  admin: string;
  commission_percentage: string;
}

interface ConfigResponse {
  id: number;
  admin: number;
  admin_email: string;
  commission_percentage: string;
  created_at: string;
  updated_at: string;
}

interface ApiError {
  admin?: string[];
  commission_percentage?: string[];
  non_field_errors?: string[];
  error?: string;
}

function AddConfig() {
  const [formData, setFormData] = useState<ConfigFormData>({
    admin: '',
    commission_percentage: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ConfigFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const apiUrl = import.meta.env.VITE_API_URL;
  const queryClient = useQueryClient();

  // Fetch admins from API - FIXED: Handle the nested response structure
  const { 
    data: responseData, 
    isLoading: isLoadingAdmins,
    error: adminsError 
  } = useQuery<ApiResponse>({
    queryKey: ['admins'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/accounts/admins/fetch/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }
      
      return response.json();
    }
  });

  // Extract admins array from response
  const admins = responseData?.admins || [];

  // Filter admins based on search and gender
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      admin.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = filterGender === 'all' || admin.gender === filterGender;
    
    return matchesSearch && matchesGender;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle admin selection
  const handleAdminSelect = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData(prev => ({ ...prev, admin: admin.id.toString() }));
    setShowDropdown(false);
    setSearchTerm('');
    if (errors.admin) {
      setErrors(prev => ({ ...prev, admin: undefined }));
    }
  };

  // Clear selected admin
  const clearSelectedAdmin = () => {
    setSelectedAdmin(null);
    setFormData(prev => ({ ...prev, admin: '' }));
    setSearchTerm('');
  };

  const addConfigMutation = useMutation<ConfigResponse, ApiError, ConfigFormData>({
    mutationFn: async (configData: ConfigFormData) => {
      const response = await fetch(`${apiUrl}/superconfig/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          admin: parseInt(configData.admin),
          commission_percentage: parseFloat(configData.commission_percentage)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      setIsSubmitting(false);
      
      toast.success(`Commission configuration created successfully!`, {
        duration: 6000,
      });
      
      setFormData({
        admin: '',
        commission_percentage: ''
      });
      setSelectedAdmin(null);
      setErrors({});
      
      queryClient.invalidateQueries({ queryKey: ['adminConfigs'] });
    },
    onError: (error: ApiError) => {
      setIsSubmitting(false);
      
      setErrors({});
      
      if (error.admin) {
        const errorMsg = Array.isArray(error.admin) ? error.admin[0] : error.admin;
        setErrors(prev => ({ ...prev, admin: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.commission_percentage) {
        const errorMsg = Array.isArray(error.commission_percentage) ? error.commission_percentage[0] : error.commission_percentage;
        setErrors(prev => ({ ...prev, commission_percentage: errorMsg }));
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.non_field_errors) {
        const errorMsg = Array.isArray(error.non_field_errors) 
          ? error.non_field_errors[0] 
          : error.non_field_errors;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.error) {
        toast.error(error.error, { duration: 6000 });
      }
    },
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const key = name as keyof ConfigFormData;
    
    setFormData(prev => ({ ...prev, [key]: value }));
    
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ConfigFormData, string>> = {};
    
    if (!formData.admin) {
      newErrors.admin = 'Please select an admin';
    }
    
    if (!formData.commission_percentage) {
      newErrors.commission_percentage = 'Commission percentage is required';
    } else {
      const percentage = parseFloat(formData.commission_percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        newErrors.commission_percentage = 'Commission must be between 0 and 100';
      }
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.warning(firstError, { duration: 5000 });
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    addConfigMutation.mutate(formData);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading state
  if (isLoadingAdmins) {
    return (
      <div className="add-config-container">
        <div className="config-spinner-wrapper">
          <Spinner 
            size="large" 
            color="#dc143c" 
            message="Loading admins..." 
          />
        </div>
      </div>
    );
  }

  // Error state
  if (adminsError) {
    return (
      <div className="add-config-container">
        <div className="config-error-state">
          <FaHeart className="error-icon" />
          <h3>Failed to load admins</h3>
          <p>Please try again later</p>
          <button 
            className="retry-btn"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admins'] })}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="add-config-container">
      {isSubmitting ? (
        <div className="config-spinner-wrapper">
          <Spinner 
            size="large" 
            color="#dc143c" 
            message="Creating configuration..." 
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="config-header">
            <h2 className="config-form-title">
              <GiCrown className="title-icon" />
              Create Admin Commission
            </h2>
            <div className="config-header-stats">
              <span className="stat-badge">
                <MdAdminPanelSettings />
                {admins.length} Admin{admins.length !== 1 ? 's' : ''} Available
              </span>
            </div>
          </div>

          <div className="config-form-container">
            <div className="config-left-section">
              <div className="config-form-group admin-select-group">
                <label className='form-label' htmlFor="admin-search">
                  <FaUser className="config-form-label-icon" /> Select Admin
                </label>
                
                {!selectedAdmin ? (
                  <div className="admin-search-container" ref={dropdownRef}>
                    <div className="search-input-wrapper">
                      <FaSearch className="search-icon" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        id="admin-search"
                        className={`admin-search-input ${errors.admin ? 'is-invalid' : ''}`}
                        placeholder="Search admin by name or email..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={() => setSearchTerm('')}
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>

                    {showDropdown && (
                      <div className="admin-dropdown">
                        <div className="dropdown-header">
                          <div className="filter-tabs">
                            <button
                              type="button"
                              className={`filter-tab ${filterGender === 'all' ? 'active' : ''}`}
                              onClick={() => setFilterGender('all')}
                            >
                              <FaFilter /> All
                            </button>
                            <button
                              type="button"
                              className={`filter-tab ${filterGender === 'male' ? 'active' : ''}`}
                              onClick={() => setFilterGender('male')}
                            >
                              <FaUser /> Male
                            </button>
                            <button
                              type="button"
                              className={`filter-tab ${filterGender === 'female' ? 'active' : ''}`}
                              onClick={() => setFilterGender('female')}
                            >
                              <FaUser /> Female
                            </button>
                          </div>
                        </div>

                        <div className="dropdown-content">
                          {filteredAdmins.length > 0 ? (
                            filteredAdmins.map((admin) => (
                              <div
                                key={admin.id}
                                className="admin-option"
                                onClick={() => handleAdminSelect(admin)}
                              >
                                <div className="admin-option-avatar">
                                  <FaUserCircle />
                                </div>
                                <div className="admin-option-info">
                                  <div className="admin-option-name">
                                    {admin.first_name} {admin.last_name}
                                    {admin.gender === 'male' ? ' 👨' : admin.gender === 'female' ? ' 👩' : ''}
                                  </div>
                                  <div className="admin-option-email">
                                    <MdEmail /> {admin.email}
                                  </div>
                                  <div className="admin-option-meta">
                                    <span className="admin-role">
                                      <MdAdminPanelSettings /> {admin.role}
                                    </span>
                                    <span className="admin-date">
                                      <MdAccessTime /> Joined {formatDate(admin.date_joined)}
                                    </span>
                                    {admin.is_active && (
                                      <span className="admin-active">
                                        <FaCheckCircle /> Active
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="dropdown-empty">
                              <FaUser className="empty-icon" />
                              <p>No admins found</p>
                              <span>Try adjusting your search or filters</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="selected-admin-card">
                    <div className="selected-admin-content">
                      <div className="selected-admin-avatar">
                        <FaUserCircle />
                      </div>
                      <div className="selected-admin-details">
                        <div className="selected-admin-name">
                          {selectedAdmin.first_name} {selectedAdmin.last_name}
                          {selectedAdmin.gender === 'male' ? ' 👨' : selectedAdmin.gender === 'female' ? ' 👩' : ''}
                        </div>
                        <div className="selected-admin-email">
                          <MdEmail /> {selectedAdmin.email}
                        </div>
                        <div className="selected-admin-badges">
                          <span className="badge role-badge">
                            <MdAdminPanelSettings /> {selectedAdmin.role}
                          </span>
                          <span className="badge date-badge">
                            <MdAccessTime /> Joined {formatDate(selectedAdmin.date_joined)}
                          </span>
                          {selectedAdmin.is_active && (
                            <span className="badge active-badge">
                              <FaCheckCircle /> Active
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="change-admin-btn"
                        onClick={clearSelectedAdmin}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
                
                {errors.admin && (
                  <div className="config-error-message">
                    <FaHeart /> {errors.admin}
                  </div>
                )}
              </div>
            </div>

            <div className="config-right-section">
              <div className="config-form-group">
                <label className='form-label' htmlFor="commission_percentage">
                  <FaPercentage className="config-form-label-icon" /> Commission Percentage
                </label>
                <div className="percentage-input-wrapper">
                  <input
                    type="number"
                    id="commission_percentage"
                    name="commission_percentage"
                    value={formData.commission_percentage}
                    onChange={handleInputChange}
                    placeholder="Enter commission percentage"
                    step="0.01"
                    min="0"
                    max="100"
                    className={`percentage-input ${errors.commission_percentage ? 'is-invalid' : ''}`}
                  />
                  <span className="percentage-symbol">%</span>
                </div>
                {errors.commission_percentage && (
                  <div className="config-error-message">
                    <FaHeart /> {errors.commission_percentage}
                  </div>
                )}
                {formData.commission_percentage && !errors.commission_percentage && (
                  <div className="percentage-hint">
                    <div 
                      className="percentage-preview"
                      style={{ width: `${Math.min(parseFloat(formData.commission_percentage) || 0, 100)}%` }}
                    />
                    <span>{formData.commission_percentage}% commission rate</span>
                  </div>
                )}
              </div>

              <div className="config-submit-btn-container">
                <button 
                  type="submit" 
                  className="config-submit-btn"
                  disabled={isSubmitting || !formData.admin || !formData.commission_percentage}
                >
                  <GiCrown className="btn-icon" />
                  Create Configuration
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddConfig;