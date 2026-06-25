import './dangerzone.css'
import { useState } from 'react'
import { IoMdClose } from "react-icons/io";
import { 
  FiAlertTriangle, 
  FiTrash2, 
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'

interface DangerzoneProps {
  onClose?: () => void;
}

function Dangerzone({ onClose }: DangerzoneProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => {
    setIsDeleting(true)
    // Simulate API call
    setTimeout(() => {
      console.log('Account deleted permanently')
      setIsDeleting(false)
      alert('Account deleted successfully!')
      if (onClose) onClose()
    }, 2000)
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setConfirmText('')
    if (onClose) onClose()
  }

  return (
    <div className="dz-main-wrapper">
      {/* Header Section */}
      <div className="dz-header-section">
        <div className="dz-header-left">
          <div className="dz-title-wrapper">
            <div className="dz-title-icon">
              <FiAlertTriangle />
            </div>
            <div>
              <h2 className="dz-page-title">Danger Zone</h2>
              <p className="dz-page-subtitle">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
          </div>
        </div>
        <div className="dz-header-right">
          {onClose && (
            <IoMdClose onClick={onClose} className="dz-close-icon" />
          )}
        </div>
      </div>

      {/* Danger Content */}
      <div className="dz-content-container">
        <div className="dz-danger-card">
          <div className="dz-danger-icon-wrapper">
            <FiAlertCircle className="dz-danger-icon" />
          </div>
          <div className="dz-danger-content">
            <h3 className="dz-danger-title">Delete Account</h3>
            <p className="dz-danger-description">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            
            {!showConfirm ? (
              <button 
                className="dz-delete-btn"
                onClick={() => setShowConfirm(true)}
              >
                <FiTrash2 className="dz-btn-icon" /> Delete Account
              </button>
            ) : (
              <div className="dz-confirm-section">
                <p className="dz-confirm-warning">
                  <FiAlertTriangle className="dz-warning-icon" />
                  Are you sure? Type <strong>"delete my account"</strong> to confirm.
                </p>
                <div className="dz-confirm-input-wrapper">
                  <input
                    type="text"
                    className="dz-confirm-input"
                    placeholder='Type "delete my account"'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  <div className="dz-confirm-actions">
                    <button 
                      className="dz-confirm-delete-btn"
                      onClick={handleDelete}
                      disabled={confirmText !== 'delete my account' || isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <span className="dz-spinner"></span> Deleting...
                        </>
                      ) : (
                        <>
                          <FiTrash2 className="dz-btn-icon" /> Yes, Delete My Account
                        </>
                      )}
                    </button>
                    <button 
                      className="dz-confirm-cancel-btn"
                      onClick={handleCancel}
                      disabled={isDeleting}
                    >
                      <FiXCircle className="dz-btn-icon" /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dangerzone