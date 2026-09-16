// Passwordedit.tsx
import './passwordedit.css'
import { useState, useEffect } from 'react'
import { IoMdClose } from 'react-icons/io'
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiXCircle,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'

interface PasswordeditProps {
  onClose?: () => void
}

interface PasswordData {
  current_password: string
  new_password: string
  confirm_password: string
}

interface FieldErrors {
  current_password?: string
  new_password?: string
  confirm_password?: string
}

/* ────────────────────────────────────────────────────────
   Update password
   ──────────────────────────────────────────────────────── */
const updatePassword = async (
  accessToken: string | null,
  passwordData: PasswordData
): Promise<{ message: string }> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.')
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/update-password/`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passwordData),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const err = new Error(
      (data && data.message) || 'Failed to update password'
    ) as Error & { fieldErrors?: FieldErrors }

    if (data?.errors && typeof data.errors === 'object') {
      const flat: FieldErrors = {}
      for (const [field, val] of Object.entries(data.errors)) {
        flat[field as keyof FieldErrors] = Array.isArray(val)
          ? val.join(', ')
          : String(val)
      }
      err.fieldErrors = flat

      // Prefer showing the specific field error in the toast
      const firstMsg = Object.values(flat)[0]
      if (firstMsg) err.message = firstMsg
    }

    throw err
  }

  return data as { message: string }
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */
function Passwordedit({ onClose }: PasswordeditProps) {
  const { access: accessToken } = useAuthStore()

  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  /* ── Debug token on mount ─────────────────────────── */
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔐 PasswordEdit - Token available:', !!accessToken)
    }
  }, [accessToken])

  /* ── Mutation ─────────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: (data: PasswordData) => {
      if (!accessToken) {
        throw new Error('You must be logged in to change your password.')
      }
      return updatePassword(accessToken, data)
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
      })

      setIsEditing(false)
      setFieldErrors({})
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })

      if (onClose) {
        setTimeout(onClose, 1500)
      }
    },
    onError: (error: Error) => {
      const errWithFields = error as Error & {
        fieldErrors?: FieldErrors
      }

      if (errWithFields.fieldErrors) {
        setFieldErrors(errWithFields.fieldErrors)
      }

      if (
        error.message.includes('token') ||
        error.message.includes('login') ||
        error.message.includes('401') ||
        error.message.includes('Session')
      ) {
        toast.error('Session expired', {
          description: 'Please login again to continue.',
          duration: 5000,
          icon: '🔒',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        })
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
        })
      }
    },
  })

  /* ── Handlers ─────────────────────────────────────── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))

    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

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
      })
      return
    }

    // Client-side quick checks before hitting the server
    const localErrors: FieldErrors = {}

    if (!passwordData.current_password) {
      localErrors.current_password = 'Current password is required.'
    }

    if (!passwordData.new_password) {
      localErrors.new_password = 'New password is required.'
    } else if (passwordData.new_password.length < 8) {
      localErrors.new_password = 'Password must be at least 8 characters.'
    }

    if (!passwordData.confirm_password) {
      localErrors.confirm_password = 'Please confirm your new password.'
    } else if (
      passwordData.new_password !== passwordData.confirm_password
    ) {
      localErrors.confirm_password = 'Passwords do not match.'
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      toast.error('Please fix the highlighted fields', {
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      return
    }

    const loadingToast = toast.loading('Updating password...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    })

    updateMutation.mutate(passwordData, {
      onSettled: () => toast.dismiss(loadingToast),
    })
  }

  const handleCancel = () => {
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    })
    setFieldErrors({})
    setIsEditing(false)
  }

  const handleReset = () => {
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    })
    setFieldErrors({})
    toast.info('Form reset', {
      duration: 2000,
      icon: '🔄',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    })
  }

  const handleClose = () => {
    if (updateMutation.isPending) return
    onClose?.()
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    if (field === 'current') setShowCurrentPassword((v) => !v)
    if (field === 'new') setShowNewPassword((v) => !v)
    if (field === 'confirm') setShowConfirmPassword((v) => !v)
  }

  /* ── Password strength ────────────────────────────── */
  const getStrength = (pwd: string) => {
    if (pwd.length >= 10) return 'strong'
    if (pwd.length >= 8) return 'medium'
    return 'weak'
  }

  const strength = getStrength(passwordData.new_password)

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="pep-main-wrapper">
      {/* Header */}
      <div className="pep-header-section">
        <div className="pep-header-left">
          <div className="pep-title-wrapper">
            <div className="pep-title-icon">
              <FiShield />
            </div>
            <div>
              <h2 className="pep-page-title">Edit Password</h2>
              <p className="pep-page-subtitle">
                Update your password to keep your account secure
              </p>
            </div>
          </div>
        </div>

        <div className="pep-header-right">
          <button
            className="pep-refresh-btn"
            onClick={handleReset}
            title="Reset form"
            type="button"
          >
            <FiRefreshCw className="pep-refresh-icon" />
          </button>

          {!isEditing && (
            <button
              className="pep-edit-btn"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <FiLock className="pep-btn-icon" /> Change Password
            </button>
          )}

          {onClose && (
            <IoMdClose
              onClick={handleClose}
              className={`pep-close-icon ${
                updateMutation.isPending ? 'pep-disabled' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Form */}
      <div className="pep-form-container">
        <form className="pep-form" onSubmit={handleSubmit} noValidate>
          <div className="pep-form-grid">
            {/* Current Password */}
            <div className="pep-form-group">
              <label className="pep-form-label" htmlFor="current_password">
                <FiLock className="pep-label-icon" /> Current Password
              </label>
              <div className="pep-password-input-wrapper">
                <input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handleInputChange}
                  className={`pep-form-input ${
                    fieldErrors.current_password ? 'pep-input-error' : ''
                  }`}
                  disabled={!isEditing || updateMutation.isPending}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={!isEditing || updateMutation.isPending}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.current_password && (
                <span className="pep-field-error">
                  {fieldErrors.current_password}
                </span>
              )}
            </div>

            {/* New Password */}
            <div className="pep-form-group">
              <label className="pep-form-label" htmlFor="new_password">
                <FiLock className="pep-label-icon" /> New Password
              </label>
              <div className="pep-password-input-wrapper">
                <input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handleInputChange}
                  className={`pep-form-input ${
                    fieldErrors.new_password ? 'pep-input-error' : ''
                  }`}
                  disabled={!isEditing || updateMutation.isPending}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={!isEditing || updateMutation.isPending}
                  tabIndex={-1}
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.new_password ? (
                <span className="pep-field-error">
                  {fieldErrors.new_password}
                </span>
              ) : (
                <small className="pep-field-hint">
                  At least 8 characters with uppercase, lowercase & a number.
                </small>
              )}
            </div>

            {/* Confirm Password */}
            <div className="pep-form-group">
              <label className="pep-form-label" htmlFor="confirm_password">
                <FiLock className="pep-label-icon" /> Confirm New Password
              </label>
              <div className="pep-password-input-wrapper">
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handleInputChange}
                  className={`pep-form-input ${
                    fieldErrors.confirm_password ? 'pep-input-error' : ''
                  }`}
                  disabled={!isEditing || updateMutation.isPending}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={!isEditing || updateMutation.isPending}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {fieldErrors.confirm_password && (
                <span className="pep-field-error">
                  {fieldErrors.confirm_password}
                </span>
              )}
            </div>

            {/* Strength Indicator */}
            {isEditing && passwordData.new_password && (
              <div className="pep-form-group full-width">
                <div className="pep-password-strength">
                  <span className="pep-strength-label">
                    Password Strength:
                  </span>
                  <div className="pep-strength-bar">
                    <div
                      className={`pep-strength-fill pep-strength-${strength}`}
                      style={{
                        width: `${Math.min(
                          (passwordData.new_password.length / 10) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="pep-strength-text">
                    {strength === 'strong'
                      ? 'Strong'
                      : strength === 'medium'
                      ? 'Medium'
                      : 'Weak'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
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