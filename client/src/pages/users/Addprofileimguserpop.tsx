import './addprofileuserpop.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { FiCamera, FiUpload, FiXCircle, FiEye, FiX, FiCheck } from 'react-icons/fi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import { useState, useRef } from 'react'

interface AddprofileimguserpopProps {
  onComplete?: () => void;
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

function Addprofileimguserpop({ onComplete }: AddprofileimguserpopProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(250); // Bigger default crop size
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, size: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
      setShowCrop(false);
      setCropImageUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      refetch();
      
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
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
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
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
      return;
    }

    setError('');
    setSelectedFile(file);
    setCropSize(250); // Reset crop size when new image is selected
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setPreviewUrl(imageUrl);
      setCropImageUrl(imageUrl);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropImage = () => {
    if (!cropImageUrl || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const containerRect = cropContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const cropSizePx = cropSize;
    const imageNaturalWidth = img.naturalWidth;
    const imageNaturalHeight = img.naturalHeight;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate crop coordinates
    const cropX = (cropPosition.x / containerWidth) * imageNaturalWidth;
    const cropY = (cropPosition.y / containerHeight) * imageNaturalHeight;
    const cropWidth = (cropSizePx / containerWidth) * imageNaturalWidth;
    const cropHeight = (cropSizePx / containerHeight) * imageNaturalHeight;

    // Set canvas size to crop size
    canvas.width = cropSizePx;
    canvas.height = cropSizePx;

    // Draw cropped image
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropSizePx,
      cropSizePx
    );

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], selectedFile?.name || 'cropped-image.jpg', {
          type: 'image/jpeg',
        });
        setSelectedFile(croppedFile);
        const croppedUrl = URL.createObjectURL(blob);
        setPreviewUrl(croppedUrl);
        setShowCrop(false);
        setCropImageUrl(null);
        toast.success('Image cropped successfully!', {
          duration: 2000,
          icon: '✂️',
          style: {
            background: '#1a1a2e',
            border: '1px solid #22c55e',
            color: '#ffffff',
          },
        });
      }
    }, 'image/jpeg', 0.95);
  };

  const handleCancelCrop = () => {
    setShowCrop(false);
    setCropImageUrl(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropPosition.x, y: e.clientY - cropPosition.y });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, size: cropSize });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cropContainerRef.current) return;
    
    const containerRect = cropContainerRef.current.getBoundingClientRect();
    
    // Handle dragging
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxX = containerRect.width - cropSize;
      const maxY = containerRect.height - cropSize;
      
      setCropPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
    
    // Handle resizing
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const delta = Math.max(deltaX, deltaY);
      const newSize = Math.max(100, Math.min(400, resizeStart.size + delta));
      
      // Adjust position to keep crop box centered on the same area
      const sizeDiff = newSize - cropSize;
      setCropSize(newSize);
      setCropPosition(prev => ({
        x: Math.max(0, Math.min(containerRect.width - newSize, prev.x - sizeDiff / 2)),
        y: Math.max(0, Math.min(containerRect.height - newSize, prev.y - sizeDiff / 2)),
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

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
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
    setShowFullPreview(false);
    setPreviewImageUrl(null);
    setShowCrop(false);
    setCropImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUpload = () => {
    if (!showCrop) {
      fileInputRef.current?.click();
    }
  };

  // Open preview for current image
  const handlePreviewCurrentImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentProfileImage) {
      setPreviewImageUrl(currentProfileImage);
      setShowFullPreview(true);
    }
  };

  // Open preview for uploaded image
  const handlePreviewUploadedImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      setPreviewImageUrl(previewUrl);
      setShowFullPreview(true);
    }
  };

  const handleClosePreview = () => {
    setShowFullPreview(false);
    setPreviewImageUrl(null);
  };

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
  };

  // Current profile image URL
  const currentProfileImage = user?.profile_image_url || null;

  // Loading state
  if (isLoading) {
    return (
      <div className="apip-overlay">
        <div className="apip-modal-content">
          <div className="apip-loading-container">
            <div className="apip-loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="apip-overlay">
        <div className="apip-modal-content">
          <div className="apip-error-container">
            <div className="apip-error-icon">😅</div>
            <p className="apip-error-text">
              {fetchError instanceof Error ? fetchError.message : 'Failed to load profile'}
            </p>
            <button className="apip-retry-btn" onClick={() => refetch()}>
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Crop UI
  if (showCrop && cropImageUrl) {
    return (
      <div className="apip-overlay">
        <div className="apip-modal-content">
          <div className="apip-header">
            <div className="apip-header-left">
              <h3>Crop Image</h3>
              <p className="apip-header-subtitle">Drag to move • Drag corner to resize</p>
            </div>
          </div>

          <div className="apip-content-container">
            <div className="apip-crop-container">
              <div 
                className="apip-crop-wrapper"
                ref={cropContainerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img 
                  ref={imageRef}
                  src={cropImageUrl} 
                  alt="Crop preview" 
                  className="apip-crop-image"
                  draggable="false"
                  onLoad={() => {
                    if (cropContainerRef.current && imageRef.current) {
                      const containerRect = cropContainerRef.current.getBoundingClientRect();
                      // Center the crop area
                      const centeredX = (containerRect.width - cropSize) / 2;
                      const centeredY = (containerRect.height - cropSize) / 2;
                      setCropPosition({
                        x: Math.max(0, centeredX),
                        y: Math.max(0, centeredY),
                      });
                    }
                  }}
                />
                <div 
                  className="apip-crop-box"
                  style={{
                    left: cropPosition.x,
                    top: cropPosition.y,
                    width: cropSize,
                    height: cropSize,
                  }}
                >
                  <div 
                    className="apip-crop-drag-area"
                    onMouseDown={handleMouseDown}
                  />
                  <div className="apip-crop-grid">
                    <div className="apip-crop-grid-line apip-crop-grid-horizontal" style={{ top: '33.33%' }}></div>
                    <div className="apip-crop-grid-line apip-crop-grid-horizontal" style={{ top: '66.66%' }}></div>
                    <div className="apip-crop-grid-line apip-crop-grid-vertical" style={{ left: '33.33%' }}></div>
                    <div className="apip-crop-grid-line apip-crop-grid-vertical" style={{ left: '66.66%' }}></div>
                  </div>
                  <div 
                    className="apip-crop-resize-handle"
                    onMouseDown={handleResizeStart}
                  />
                </div>
              </div>

              <div className="apip-crop-controls">
                <div className="apip-crop-size-control">
                  <span className="apip-crop-size-label">Crop Size: {cropSize}px</span>
                  <input
                    type="range"
                    min="100"
                    max="400"
                    value={cropSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setCropSize(newSize);
                      if (cropContainerRef.current) {
                        const containerRect = cropContainerRef.current.getBoundingClientRect();
                        setCropPosition(prev => ({
                          x: Math.max(0, Math.min(containerRect.width - newSize, prev.x)),
                          y: Math.max(0, Math.min(containerRect.height - newSize, prev.y)),
                        }));
                      }
                    }}
                    className="apip-crop-slider"
                  />
                </div>
              </div>

              <div className="apip-crop-actions">
                <button className="apip-crop-cancel-btn" onClick={handleCancelCrop}>
                  <FiX /> Cancel
                </button>
                <button className="apip-crop-confirm-btn" onClick={handleCropImage}>
                  <FiCheck /> Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apip-overlay">
      <div className="apip-modal-content">
        <div className="apip-header">
          <div className="apip-header-left">
            <h3>Profile Image</h3>
            <p className="apip-header-subtitle">Add a photo to help others recognize you</p>
          </div>
        </div>

        <div className="apip-content-container">
          <div className="apip-friendly-message">
            <div className="apip-message-icon">✨</div>
            <div className="apip-message-text">
              <p className="apip-message-title">Make your profile stand out!</p>
              <p className="apip-message-description">
                A profile picture helps others connect with you better. 
                Choose a photo that shows your personality — it makes the experience more personal and fun!
              </p>
            </div>
          </div>

          <div className="apip-upload-area">
            <div className="apip-avatar-wrapper">
              <div 
                className="apip-avatar-circle"
                onClick={handleClickUpload}
                style={{ cursor: 'pointer' }}
              >
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Profile preview" 
                    className="apip-avatar-image"
                  />
                ) : currentProfileImage ? (
                  <img 
                    src={currentProfileImage} 
                    alt="Current profile" 
                    className="apip-avatar-image"
                  />
                ) : (
                  <span className="apip-avatar-initials">
                    {getInitials()}
                  </span>
                )}
                
                <div className="apip-avatar-overlay">
                  <FiCamera className="apip-camera-icon" />
                  <span className="apip-overlay-text">Change Photo</span>
                </div>
              </div>

              <div className="apip-preview-buttons">
                {currentProfileImage && !previewUrl && (
                  <button 
                    className="apip-preview-btn"
                    onClick={handlePreviewCurrentImage}
                  >
                    <FiEye className="apip-preview-icon" />
                    Preview Current
                  </button>
                )}
                {previewUrl && !uploadMutation.isPending && (
                  <button 
                    className="apip-preview-btn"
                    onClick={handlePreviewUploadedImage}
                  >
                    <FiEye className="apip-preview-icon" />
                    Preview New
                  </button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="apip-uploading">
                  <span className="apip-spinner"></span>
                  <span>Uploading...</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="apip-file-input"
              disabled={uploadMutation.isPending}
            />

            {selectedFile && !uploadMutation.isPending && (
              <div className="apip-file-info">
                <div className="apip-file-details">
                  <FiUpload className="apip-file-icon" />
                  <div>
                    <p className="apip-file-name">{selectedFile.name}</p>
                    <p className="apip-file-size">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button 
                  className="apip-remove-file-btn"
                  onClick={handleRemove}
                  disabled={uploadMutation.isPending}
                >
                  <FiXCircle />
                </button>
              </div>
            )}

            {error && (
              <div className="apip-error-message">
                <span className="apip-error-icon">❌</span>
                {error}
              </div>
            )}

            {selectedFile && !uploadMutation.isPending && (
              <div className="apip-action-buttons">
                <button 
                  className="apip-upload-btn"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <span className="apip-spinner-small"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiUpload className="apip-btn-icon" />
                      Upload Photo
                    </>
                  )}
                </button>
                <button 
                  className="apip-cancel-btn"
                  onClick={handleRemove}
                  disabled={uploadMutation.isPending}
                >
                  <FiXCircle className="apip-btn-icon" />
                  Remove
                </button>
              </div>
            )}

            {!selectedFile && !uploadMutation.isPending && (
              <div className="apip-upload-instructions">
                <FiCamera className="apip-instructions-icon" />
                <p>Click on the avatar to upload a new photo</p>
                <span className="apip-instructions-hint">
                  Supported formats: JPEG, PNG, GIF, WEBP
                </span>
              </div>
            )}
          </div>
        </div>

        {showFullPreview && previewImageUrl && (
          <div className="apip-preview-modal" onClick={handleClosePreview}>
            <div className="apip-preview-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="apip-preview-modal-header">
                <h3 className="apip-preview-title">Image Preview</h3>
                <button 
                  className="apip-preview-close-btn"
                  onClick={handleClosePreview}
                >
                  <FiX />
                </button>
              </div>
              <div className="apip-preview-image-wrapper">
                <img 
                  src={previewImageUrl} 
                  alt="Full preview" 
                  className="apip-preview-image"
                />
              </div>
              <div className="apip-preview-modal-footer">
                <button 
                  className="apip-preview-use-btn"
                  onClick={handleClosePreview}
                >
                  <FiCheck className="apip-btn-icon" />
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Addprofileimguserpop