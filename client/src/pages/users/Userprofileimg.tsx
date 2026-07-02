// ============================================================
// userprofileimg.tsx  (Instagram-style profile image component)
// ============================================================

import React, { useState, useRef } from 'react';
import { FiCamera, FiUser, FiCheck, FiX, FiEye } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import { toast } from 'sonner';
import 'bootstrap/dist/css/bootstrap.min.css';
import './userprofileimg.css';

// ============================================================
// TYPES
// ============================================================

interface UserprofileimgProps {
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

// ============================================================
// API HELPERS
// ============================================================

const fetchCurrentUser = async (accessToken: string | null): Promise<UserData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }
  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/current-user/`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired. Please login again.');
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
};

const uploadProfileImage = async (accessToken: string | null, file: File): Promise<{ message: string; profile_image_url: string }> => {
  if (!accessToken) throw new Error('No access token found. Please login again.');
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/upload-profile-image/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload image');
  }
  return response.json();
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Userprofileimg({ onClose }: UserprofileimgProps) {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [showFullPreview, setShowFullPreview] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState<boolean>(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState<number>(250);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, size: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // ---- Fetch current user ----
  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery<UserData>({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // ---- Upload mutation ----
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(accessToken, file),
    onSuccess: () => {
      toast.success('Profile image updated!', {
        duration: 3000,
        icon: '📸',
        style: { background: '#1a1a2e', border: '1px solid #22c55e', color: '#ffffff' },
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
      if (onClose) setTimeout(() => onClose(), 1500);
    },
    onError: (error: Error) => {
      toast.error('Failed to upload image', {
        description: error.message || 'Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: { background: '#1a1a2e', border: '1px solid #ef4444', color: '#ffffff' },
      });
    },
  });

  // ---- Handlers ----
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select JPEG, PNG, GIF, or WEBP');
      toast.error('Invalid file type', {
        description: 'Please select JPEG, PNG, GIF, or WEBP image.',
        duration: 3000,
        icon: '⚠️',
        style: { background: '#1a1a2e', border: '1px solid #ef4444', color: '#ffffff' },
      });
      return;
    }

    setError('');
    setSelectedFile(file);
    setCropSize(250);
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

    const cropX = (cropPosition.x / containerWidth) * imageNaturalWidth;
    const cropY = (cropPosition.y / containerHeight) * imageNaturalHeight;
    const cropWidth = (cropSizePx / containerWidth) * imageNaturalWidth;
    const cropHeight = (cropSizePx / containerHeight) * imageNaturalHeight;

    canvas.width = cropSizePx;
    canvas.height = cropSizePx;

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
    
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const delta = Math.max(deltaX, deltaY);
      const newSize = Math.max(100, Math.min(400, resizeStart.size + delta));
      
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

  const handleSave = () => {
    if (!selectedFile) return;
    const loadingToast = toast.loading('Uploading...', {
      style: { background: '#1a1a2e', border: '1px solid #3b82f6', color: '#ffffff' },
    });
    uploadMutation.mutate(selectedFile, {
      onSettled: () => toast.dismiss(loadingToast),
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

  const handlePreviewNew = () => {
    if (previewUrl) {
      setPreviewImageUrl(previewUrl);
      setShowFullPreview(true);
    }
  };

  const handleClosePreview = () => {
    setShowFullPreview(false);
    setPreviewImageUrl(null);
  };

  // ---- Helpers ----
  const currentProfileImage: string | null = user?.profile_image_url || null;
  const hasImage: boolean = currentProfileImage !== null && currentProfileImage !== '';

  // ---- Render avatar content ----
  const renderAvatarContent = (): React.ReactElement => {
    if (previewUrl) {
      return <img src={previewUrl} alt="Preview" className="pimg-avatar-image" />;
    }
    if (hasImage && currentProfileImage) {
      return <img src={currentProfileImage} alt="Profile" className="pimg-avatar-image" />;
    }
    return <FiUser className="pimg-avatar-icon" />;
  };

  // ---- Loading / Error ----
  if (isLoading) {
    return (
      <div className="overall-user-image-container">
        <div className="image-avatar-user-container rounded-circle">
          <div className="pimg-loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="overall-user-image-container">
        <div className="image-avatar-user-container rounded-circle">
          <FiUser className="pimg-avatar-icon" />
        </div>
      </div>
    );
  }

  // ---- Crop UI ----
  if (showCrop && cropImageUrl) {
    return (
      <div className="pimg-crop-overlay">
        <div className="pimg-crop-modal">
          <div className="pimg-crop-header">
            <h3 className="pimg-crop-title">Crop Image</h3>
            <p className="pimg-crop-subtitle">Drag to move • Drag corner to resize</p>
          </div>

          <div className="pimg-crop-content">
            <div 
              className="pimg-crop-wrapper"
              ref={cropContainerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                ref={imageRef}
                src={cropImageUrl} 
                alt="Crop preview" 
                className="pimg-crop-image"
                draggable="false"
                onLoad={() => {
                  if (cropContainerRef.current && imageRef.current) {
                    const containerRect = cropContainerRef.current.getBoundingClientRect();
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
                className="pimg-crop-box"
                style={{
                  left: cropPosition.x,
                  top: cropPosition.y,
                  width: cropSize,
                  height: cropSize,
                }}
              >
                <div 
                  className="pimg-crop-drag-area"
                  onMouseDown={handleMouseDown}
                />
                <div className="pimg-crop-grid">
                  <div className="pimg-crop-grid-line pimg-crop-grid-horizontal" style={{ top: '33.33%' }}></div>
                  <div className="pimg-crop-grid-line pimg-crop-grid-horizontal" style={{ top: '66.66%' }}></div>
                  <div className="pimg-crop-grid-line pimg-crop-grid-vertical" style={{ left: '33.33%' }}></div>
                  <div className="pimg-crop-grid-line pimg-crop-grid-vertical" style={{ left: '66.66%' }}></div>
                </div>
                <div 
                  className="pimg-crop-resize-handle"
                  onMouseDown={handleResizeStart}
                />
              </div>
            </div>

            <div className="pimg-crop-controls">
              <div className="pimg-crop-size-control">
                <span className="pimg-crop-size-label">Crop Size: {cropSize}px</span>
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
                  className="pimg-crop-slider"
                />
              </div>
            </div>

            <div className="pimg-crop-actions">
              <button className="pimg-crop-cancel-btn" onClick={handleCancelCrop}>
                <FiX /> Cancel
              </button>
              <button className="pimg-crop-confirm-btn" onClick={handleCropImage}>
                <FiCheck /> Apply Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="overall-user-image-container">
      {/* Avatar Circle - clickable */}
      <div 
        className="image-avatar-user-container rounded-circle" 
        onClick={handleClickUpload}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClickUpload();
          }
        }}
      >
        {renderAvatarContent()}
        {/* Overlay - shows on hover */}
        <div className="pimg-avatar-overlay">
          <FiCamera className="pimg-camera-icon" />
          <span className="pimg-overlay-text">Change Profile Image</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="pimg-file-input"
        disabled={uploadMutation.isPending}
      />

      {/* Preview Button (only when preview is available) */}
      {previewUrl && !uploadMutation.isPending && (
        <div className="pimg-preview-wrapper">
          <button className="pimg-preview-btn" onClick={handlePreviewNew}>
            <FiEye className="pimg-preview-icon" />
            Preview
          </button>
        </div>
      )}

      {/* Uploading status */}
      {uploadMutation.isPending && (
        <div className="pimg-uploading">
          <span className="pimg-spinner"></span>
          <span>Uploading...</span>
        </div>
      )}

      {/* File Info - shows when file is selected */}
      {selectedFile && (
        <div className="pimg-file-info">
          <div className="pimg-file-details">
            <div className="pimg-file-thumbnail">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="pimg-file-thumb-img" />
              ) : (
                <FiCamera className="pimg-file-icon" />
              )}
            </div>
            <div>
              <p className="pimg-file-name">{selectedFile.name}</p>
              <p className="pimg-file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="pimg-error-message">
          <span className="pimg-error-icon">⚠️</span> {error}
        </div>
      )}

      {/* Action Buttons - ONLY appear when a file is selected */}
      {selectedFile && !uploadMutation.isPending && (
        <div className="image-handle-buttons">
          <button className="pimg-save-btn" onClick={handleSave}>
            <FiCheck className="pimg-btn-icon" />
            Save
          </button>
          <button className="pimg-cancel-btn" onClick={handleRemove}>
            <FiX className="pimg-btn-icon" />
            Cancel
          </button>
        </div>
      )}

      {/* Uploading state - shows during upload */}
      {uploadMutation.isPending && (
        <div className="image-handle-buttons">
          <button className="pimg-save-btn" disabled>
            <span className="pimg-spinner-small"></span>
            Saving...
          </button>
        </div>
      )}

      {/* Full Preview Modal */}
      {showFullPreview && previewImageUrl && (
        <div className="pimg-preview-modal" onClick={handleClosePreview}>
          <div className="pimg-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pimg-preview-modal-header">
              <h3 className="pimg-preview-title">Image Preview</h3>
              <button className="pimg-preview-close-btn" onClick={handleClosePreview}>
                <FiX />
              </button>
            </div>
            <div className="pimg-preview-image-wrapper">
              <img src={previewImageUrl} alt="Full preview" className="pimg-preview-image" />
            </div>
            <div className="pimg-preview-modal-footer">
              <button className="pimg-preview-use-btn" onClick={handleClosePreview}>
                <FiCheck className="pimg-btn-icon" />
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Userprofileimg;