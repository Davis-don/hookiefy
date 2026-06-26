import './passwordedit.css'
import { useState, useEffect } from 'react'
import { IoMdClose } from "react-icons/io";
import { 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiSave,
  FiXCircle,
  FiShield,
  FiRefreshCw
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'

interface PasswordeditProps {
  onClose?: () => void;
}

interface PasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Update password function
const updatePassword = async (
  accessToken: string | null,
  passwordData: PasswordData
): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/update-password/`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      current_password: passwordData.current_password,
      new_password: passwordData.new_password,
      confirm_password: passwordData.confirm_password,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to update password';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.detail || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

function Passwordedit({ onClose }: PasswordeditProps) {
  const { access: accessToken } = useAuthStore();
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Debug: Log token status on mount
  useEffect(() => {
    console.log('🔐 PasswordEdit - Token available:', !!accessToken);
    if (accessToken) {
      console.log('🔐 PasswordEdit - Token starts with:', accessToken.substring(0, 20) + '...');
    }
  }, [accessToken]);

  // Update password mutation
  const updateMutation = useMutation({
    mutationFn: (data: PasswordData) => {
      // Check token before making request
      if (!accessToken) {
        throw new Error('You must be logged in to change your password.');
      }
      return updatePassword(accessToken, data);
    },
    onSuccess: () => {
      toast.success('Password updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      setIsEditing(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      if (onClose) {
        setTimeout(onClose, 1500);
      }
    },
    onError: (error: Error) => {
      // Check if it's an auth error
      if (error.message.includes('token') || error.message.includes('login') || error.message.includes('401')) {
        toast.error('Session expired', {
          description: 'Please login again to continue.',
          duration: 5000,
          icon: '🔒',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
        // Optionally clear tokens and redirect to login
        // useAuthStore.getState().clearTokens();
        // window.location.href = '/login';
      } else {
        toast.error('Failed to update password', {
          description: error.message,
          duration: 4000,
          icon: '⚠️',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
      }
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    if (passwordError) setPasswordError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check token first
    if (!accessToken) {
      toast.error('Not authenticated', {
        description: 'Please login to change your password.',
        duration: 4000,
        icon: '🔒',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    // Validate passwords
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New password and confirm password do not match')
      toast.error('Passwords do not match!', {
        description: 'Please make sure both passwords are identical.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters long')
      toast.error('Password too short!', {
        description: 'Password must be at least 8 characters long.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return
    }

    if (!passwordData.current_password) {
      setPasswordError('Current password is required')
      toast.error('Current password required', {
        description: 'Please enter your current password.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return
    }

    const loadingToast = toast.loading('Updating password...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    updateMutation.mutate(passwordData, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  }

  const handleCancel = () => {
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    })
    setPasswordError('')
    setIsEditing(false)
  }

  const handleClose = () => {
    if (updateMutation.isPending) return;
    if (onClose) onClose();
  }

  const togglePasswordVisibility = (field: string) => {
    switch(field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword)
        break
      case 'new':
        setShowNewPassword(!showNewPassword)
        break
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword)
        break
      default:
        break
    }
  }

  return (
    <div className="pep-main-wrapper">
      {/* Header Section */}
      <div className="pep-header-section">
        <div className="pep-header-left">
          <div className="pep-title-wrapper">
            <div className="pep-title-icon">
              <FiShield />
            </div>
            <div>
              <h2 className="pep-page-title">Edit Password</h2>
              <p className="pep-page-subtitle">Update your password to keep your account secure</p>
            </div>
          </div>
        </div>
        <div className="pep-header-right">
          {/* Refresh Button */}
          <button 
            className="pep-refresh-btn"
            onClick={() => {
              setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
              });
              setPasswordError('');
              toast.info('Form reset', {
                duration: 2000,
                icon: '🔄',
                style: {
                  background: '#1a1a2e',
                  border: '1px solid #3b82f6',
                  color: '#ffffff',
                },
              });
            }}
            title="Reset form"
          >
            <FiRefreshCw className="pep-refresh-icon" />
          </button>

          {!isEditing && (
            <button 
              className="pep-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <FiLock className="pep-btn-icon" /> Change Password
            </button>
          )}
          {onClose && (
            <IoMdClose 
              onClick={handleClose} 
              className={`pep-close-icon ${updateMutation.isPending ? 'pep-disabled' : ''}`}
            />
          )}
        </div>
      </div>

      {/* Error Alert */}
      {passwordError && (
        <div className="pep-error-alert">
          <span className="pep-error-icon">❌</span>
          {passwordError}
        </div>
      )}

      {/* Form Section */}
      <div className="pep-form-container">
        <form className="pep-form" onSubmit={handleSubmit}>
          <div className="pep-form-grid">
            {/* Current Password */}
            <div className="pep-form-group">
              <label className="pep-form-label">
                <FiLock className="pep-label-icon" /> Current Password
              </label>
              <div className="pep-password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handleInputChange}
                  className="pep-form-input"
                  disabled={!isEditing || updateMutation.isPending}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={!isEditing || updateMutation.isPending}
                >
                  {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="pep-form-group">
              <label className="pep-form-label">
                <FiLock className="pep-label-icon" /> New Password
              </label>
              <div className="pep-password-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handleInputChange}
                  className="pep-form-input"
                  disabled={!isEditing || updateMutation.isPending}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={!isEditing || updateMutation.isPending}
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <small className="pep-field-hint">Password must be at least 8 characters</small>
            </div>

            {/* Confirm Password */}
            <div className="pep-form-group">
              <label className="pep-form-label">
                <FiLock className="pep-label-icon" /> Confirm New Password
              </label>
              <div className="pep-password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handleInputChange}
                  className="pep-form-input"
                  disabled={!isEditing || updateMutation.isPending}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={!isEditing || updateMutation.isPending}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {isEditing && passwordData.new_password && (
              <div className="pep-form-group full-width">
                <div className="pep-password-strength">
                  <span className="pep-strength-label">Password Strength:</span>
                  <div className="pep-strength-bar">
                    <div 
                      className={`pep-strength-fill ${
                        passwordData.new_password.length >= 8 ? 'pep-strength-strong' :
                        passwordData.new_password.length >= 5 ? 'pep-strength-medium' :
                        'pep-strength-weak'
                      }`}
                      style={{ 
                        width: `${Math.min((passwordData.new_password.length / 8) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="pep-strength-text">
                    {passwordData.new_password.length >= 8 ? 'Strong' :
                     passwordData.new_password.length >= 5 ? 'Medium' :
                     'Weak'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="pep-form-actions">
              <button 
                type="submit" 
                className="pep-save-btn"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="pep-spinner-small"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave className="pep-btn-icon" /> Update Password
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="pep-cancel-btn"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <FiXCircle className="pep-btn-icon" /> Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Passwordedit