import './generalinfoedit.css'
import { useState } from 'react'
import { currentUser } from '../../data/currentuserdata'
import type  { CurrentUser } from '../../data/currentuserdata';
import { IoMdClose } from "react-icons/io";
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiSave, 
  FiEdit2,
  FiXCircle
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'

interface GeneralinfoeditProps {
  onClose?: () => void;
}

function Generalinfoedit({ onClose }: GeneralinfoeditProps) {
  const [userData, setUserData] = useState<CurrentUser>(currentUser)
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUserData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to an API
    console.log('Updated user data:', userData)
    setIsEditing(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
    alert('Profile updated successfully!')
  }

  const handleCancel = () => {
    setUserData(currentUser)
    setIsEditing(false)
    if (onClose) onClose()
  }

  const fullName = `${userData.first_name} ${userData.last_name}`.trim()

  return (
    <div className="gei-main-wrapper">
      {/* Header Section */}
      <div className="gei-header-section">
        <div className="gei-header-left">
          <div className="gei-title-wrapper">
            <h2 className="gei-page-title">General Details</h2>
            <p className="gei-page-subtitle">Update your personal information</p>
          </div>
        </div>
        <div className="gei-header-right">
          {!isEditing && (
            <button 
              className="gei-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <FiEdit2 className="gei-btn-icon" /> Edit Profile
            </button>
          )}
          {onClose && (
            <IoMdClose onClick={onClose} className="gei-close-icon" />
          )}
        </div>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <div className="gei-success-alert">
          <span className="gei-success-icon">✅</span>
          Profile updated successfully!
        </div>
      )}

      {/* Form Section */}
      <div className="gei-form-container">
        <form className="gei-form" onSubmit={handleSubmit}>
          <div className="gei-form-grid">
            {/* First Name */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiUser className="gei-label-icon" /> First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={userData.first_name}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing}
                placeholder="Enter first name"
                required
              />
            </div>

            {/* Last Name */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiUser className="gei-label-icon" /> Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={userData.last_name}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing}
                placeholder="Enter last name"
                required
              />
            </div>

            {/* Email - Now Editable */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiMail className="gei-label-icon" /> Email Address
              </label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing}
                placeholder="Enter email address"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiPhone className="gei-label-icon" /> Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={userData.phone_number || ''}
                onChange={handleInputChange}
                className="gei-form-input"
                disabled={!isEditing}
                placeholder="Enter phone number"
              />
            </div>

            {/* Gender */}
            <div className="gei-form-group">
              <label className="gei-form-label">
                <FiUser className="gei-label-icon" /> Gender
              </label>
              <select
                name="gender"
                value={userData.gender || ''}
                onChange={handleInputChange}
                className="gei-form-input gei-form-select"
                disabled={!isEditing}
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          {isEditing && (
            <div className="gei-form-actions">
              <button type="submit" className="gei-save-btn">
                <FiSave className="gei-btn-icon" /> Save Changes
              </button>
              <button 
                type="button" 
                className="gei-cancel-btn"
                onClick={handleCancel}
              >
                <FiXCircle className="gei-btn-icon" /> Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Generalinfoedit