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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'

interface ProfileimgProps {
  onClose?: () => void;
}

interface UserData {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  gender: string;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  has_profile_image: boolean;
}

// Fetch current user
const fetchCurrentUser = async (accessToken: string | null): Promise<UserData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/current-user/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  return response.json();
};

// Upload profile image
const uploadProfileImage = async (
  accessToken: string | null,
  file: File
): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/upload-profile-image/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload image');
  }

  return response.json();
};

function Profileimg({ onClose }: ProfileimgProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current user data
  const { 
    data: user, 
    isLoading,
    isError,
    error: fetchError,
    refetch
  } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(accessToken, file),
    onSuccess: () => {
      toast.success('Profile image uploaded successfully!', {
        duration: 3000,
        icon: '📸',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      refetch();
      
      // Close modal after delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error('Failed to upload image', {
        description: error.message || 'Please try again.',
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)')
      toast.error('Invalid file type', {
        description: 'Please select JPEG, PNG, GIF, or WEBP image.',
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      toast.error('File too large', {
        description: 'Image must be less than 5MB.',
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
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

    const loadingToast = toast.loading('Uploading profile image...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    uploadMutation.mutate(selectedFile, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError('')
    setShowFullPreview(false)
    setPreviewImageUrl(null)
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
    setPreviewImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  // Open preview for current image
  const handlePreviewCurrentImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentProfileImage) {
      setPreviewImageUrl(currentProfileImage)
      setShowFullPreview(true)
    }
  }

  // Open preview for uploaded image
  const handlePreviewUploadedImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (previewUrl) {
      setPreviewImageUrl(previewUrl)
      setShowFullPreview(true)
    }
  }

  const handleClosePreview = () => {
    setShowFullPreview(false)
    setPreviewImageUrl(null)
  }

  // Get initials for placeholder
  const getInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.full_name.substring(0, 2).toUpperCase();
    }
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return 'U';
  }

  // Current profile image URL
  const currentProfileImage = user?.profile_image_url || null;

  // Loading state
  if (isLoading) {
    return (
      <div className="pimg-main-wrapper">
        <div className="pimg-loading-container">
          <div className="pimg-loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="pimg-main-wrapper">
        <div className="pimg-error-container">
          <div className="pimg-error-icon">😅</div>
          <p className="pimg-error-text">
            {fetchError instanceof Error ? fetchError.message : 'Failed to load profile'}
          </p>
          <button className="pimg-retry-btn" onClick={() => refetch()}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
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
            <IoMdClose 
              onClick={handleCancel} 
              className={`pimg-close-icon ${uploadMutation.isPending ? 'pimg-disabled' : ''}`}
            />
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

            {/* Preview Buttons */}
            <div className="pimg-preview-buttons">
              {currentProfileImage && !previewUrl && (
                <button 
                  className="pimg-preview-btn"
                  onClick={handlePreviewCurrentImage}
                >
                  <FiEye className="pimg-preview-icon" />
                  Preview Current
                </button>
              )}
              {previewUrl && !uploadMutation.isPending && (
                <button 
                  className="pimg-preview-btn"
                  onClick={handlePreviewUploadedImage}
                >
                  <FiEye className="pimg-preview-icon" />
                  Preview New
                </button>
              )}
            </div>

            {uploadMutation.isPending && (
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
            disabled={uploadMutation.isPending}
          />

          {/* Selected File Info */}
          {selectedFile && !uploadMutation.isPending && (
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
                disabled={uploadMutation.isPending}
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
          {selectedFile && !uploadMutation.isPending && (
            <div className="pimg-action-buttons">
              <button 
                className="pimg-upload-btn"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
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
                onClick={handleRemove}
                disabled={uploadMutation.isPending}
              >
                <FiXCircle className="pimg-btn-icon" />
                Remove
              </button>
            </div>
          )}

          {/* No Selection State */}
          {!selectedFile && !uploadMutation.isPending && (
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
      {showFullPreview && previewImageUrl && (
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
                src={previewImageUrl} 
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