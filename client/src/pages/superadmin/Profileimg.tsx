import './profileimg.css'
import { useState, useRef } from 'react'
import { IoMdClose } from "react-icons/io";
import { 
  FiCamera, 
  FiUpload, 
  FiXCircle,
  FiCheck,
  FiEye,
  FiX
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'

interface ProfileimgProps {
  onClose?: () => void;
}

function Profileimg({ onClose }: ProfileimgProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showFullPreview, setShowFullPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Current profile image (placeholder)
  const currentProfileImage = null // Set to null to show initials, or use a URL

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setError('')
    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError('')

    // Simulate upload
    setTimeout(() => {
      console.log('Uploading file:', selectedFile)
      setIsUploading(false)
      setUploadSuccess(true)
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)
      
      alert('Profile image updated successfully!')
    }, 2000)
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError('')
    setShowFullPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onClose) onClose()
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError('')
    setShowFullPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFullPreview = () => {
    if (previewUrl) {
      setShowFullPreview(true)
    }
  }

  const handleClosePreview = () => {
    setShowFullPreview(false)
  }

  // Get initials for placeholder
  const getInitials = () => {
    return 'DM' // Would be dynamic from user data
  }

  return (
    <div className="pimg-main-wrapper">
      {/* Header Section */}
      <div className="pimg-header-section">
        <div className="pimg-header-left">
          <div className="pimg-title-wrapper">
            <div className="pimg-title-icon">
              <FiCamera />
            </div>
            <div>
              <h2 className="pimg-page-title">Profile Image</h2>
              <p className="pimg-page-subtitle">Update your profile picture</p>
            </div>
          </div>
        </div>
        <div className="pimg-header-right">
          {onClose && (
            <IoMdClose onClick={onClose} className="pimg-close-icon" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pimg-content-container">
        {/* Avatar Upload Area */}
        <div className="pimg-upload-area">
          <div className="pimg-avatar-wrapper">
            <div 
              className="pimg-avatar-circle"
              onClick={handleClickUpload}
              style={{ cursor: 'pointer' }}
            >
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Profile preview" 
                  className="pimg-avatar-image"
                />
              ) : currentProfileImage ? (
                <img 
                  src={currentProfileImage} 
                  alt="Current profile" 
                  className="pimg-avatar-image"
                />
              ) : (
                <span className="pimg-avatar-initials">
                  {getInitials()}
                </span>
              )}
              
              {/* Overlay on hover */}
              <div className="pimg-avatar-overlay">
                <FiCamera className="pimg-camera-icon" />
                <span className="pimg-overlay-text">Change Photo</span>
              </div>
            </div>

            {/* Preview Button - Only show when image is selected */}
            {previewUrl && !uploadSuccess && (
              <button 
                className="pimg-preview-btn"
                onClick={handleFullPreview}
              >
                <FiEye className="pimg-preview-icon" />
                Preview Full Size
              </button>
            )}

            {/* Upload Status */}
            {uploadSuccess && (
              <div className="pimg-upload-success">
                <FiCheck className="pimg-success-icon" />
                <span>Upload successful!</span>
              </div>
            )}

            {isUploading && (
              <div className="pimg-uploading">
                <span className="pimg-spinner"></span>
                <span>Uploading...</span>
              </div>
            )}
          </div>

          {/* File Input (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="pimg-file-input"
          />

          {/* Selected File Info */}
          {selectedFile && !uploadSuccess && (
            <div className="pimg-file-info">
              <div className="pimg-file-details">
                <FiUpload className="pimg-file-icon" />
                <div>
                  <p className="pimg-file-name">{selectedFile.name}</p>
                  <p className="pimg-file-size">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button 
                className="pimg-remove-file-btn"
                onClick={handleRemove}
              >
                <FiXCircle />
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="pimg-error-message">
              <span className="pimg-error-icon">❌</span>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          {selectedFile && !uploadSuccess && (
            <div className="pimg-action-buttons">
              <button 
                className="pimg-upload-btn"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <span className="pimg-spinner-small"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <FiUpload className="pimg-btn-icon" />
                    Upload Photo
                  </>
                )}
              </button>
              <button 
                className="pimg-cancel-btn"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <FiXCircle className="pimg-btn-icon" />
                Cancel
              </button>
            </div>
          )}

          {/* No Selection State */}
          {!selectedFile && !uploadSuccess && (
            <div className="pimg-upload-instructions">
              <FiCamera className="pimg-instructions-icon" />
              <p>Click on the avatar to upload a new photo</p>
              <span className="pimg-instructions-hint">
                Supported formats: JPEG, PNG, GIF, WEBP (Max 5MB)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      {showFullPreview && previewUrl && (
        <div className="pimg-preview-modal" onClick={handleClosePreview}>
          <div className="pimg-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pimg-preview-modal-header">
              <h3 className="pimg-preview-title">Image Preview</h3>
              <button 
                className="pimg-preview-close-btn"
                onClick={handleClosePreview}
              >
                <FiX />
              </button>
            </div>
            <div className="pimg-preview-image-wrapper">
              <img 
                src={previewUrl} 
                alt="Full preview" 
                className="pimg-preview-image"
              />
            </div>
            <div className="pimg-preview-modal-footer">
              <button 
                className="pimg-preview-use-btn"
                onClick={handleClosePreview}
              >
                <FiCheck className="pimg-btn-icon" />
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profileimg