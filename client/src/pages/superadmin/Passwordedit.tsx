import './passwordedit.css'
import { useState } from 'react'
import { IoMdClose } from "react-icons/io";
import { 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiSave,
  FiXCircle,
  FiShield
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'

interface PasswordeditProps {
  onClose?: () => void;
}

function Passwordedit({ onClose }: PasswordeditProps) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    if (passwordError) setPasswordError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirm password do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long')
      return
    }

    // Here you would typically send the data to an API
    console.log('Password update data:', {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    })
    
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
    
    // Reset form
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    alert('Password updated successfully!')
  }

  const handleCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setPasswordError('')
    setIsEditing(false)
    if (onClose) onClose()
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
          {!isEditing && (
            <button 
              className="pep-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <FiLock className="pep-btn-icon" /> Change Password
            </button>
          )}
          {onClose && (
            <IoMdClose onClick={onClose} className="pep-close-icon" />
          )}
        </div>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <div className="pep-success-alert">
          <span className="pep-success-icon">✅</span>
          Password updated successfully!
        </div>
      )}

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
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handleInputChange}
                  className="pep-form-input"
                  disabled={!isEditing}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={!isEditing}
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
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handleInputChange}
                  className="pep-form-input"
                  disabled={!isEditing}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={!isEditing}
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
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handleInputChange}
                  className="pep-form-input"
                  disabled={!isEditing}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="pep-password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={!isEditing}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator (Optional) */}
            {isEditing && passwordData.newPassword && (
              <div className="pep-form-group full-width">
                <div className="pep-password-strength">
                  <span className="pep-strength-label">Password Strength:</span>
                  <div className="pep-strength-bar">
                    <div 
                      className={`pep-strength-fill ${
                        passwordData.newPassword.length >= 8 ? 'pep-strength-strong' :
                        passwordData.newPassword.length >= 5 ? 'pep-strength-medium' :
                        'pep-strength-weak'
                      }`}
                      style={{ 
                        width: `${Math.min((passwordData.newPassword.length / 8) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="pep-strength-text">
                    {passwordData.newPassword.length >= 8 ? 'Strong' :
                     passwordData.newPassword.length >= 5 ? 'Medium' :
                     'Weak'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="pep-form-actions">
              <button type="submit" className="pep-save-btn">
                <FiSave className="pep-btn-icon" /> Update Password
              </button>
              <button 
                type="button" 
                className="pep-cancel-btn"
                onClick={handleCancel}
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