import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Cropper from 'react-easy-crop';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import { toast } from '../../store/Toaststore';
import './uploadclientimg.css';

interface UploadResponse {
  success: boolean;
  filename: string;
  size_bytes: number;
  cloudinary_url: string;
  cloudinary_public_id: string;
  message: string;
  previous_image_deleted?: boolean;
}

interface BioResponse {
  success: boolean;
  bio: {
    uploaded_img: string | null;
    uploaded_img_public_id: string | null;
    first_name: string;
    last_name: string;
    [key: string]: any;
  } | null;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const Uploadclientimg: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasExistingImage, setHasExistingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch current user's bio to check for existing image
  const { 
    data: bioData, 
    isLoading: bioLoading,
    refetch: refetchBio
  } = useQuery<BioResponse>({
    queryKey: ['clientBio'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/client-img/client-bio/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bio');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Set existing image if available
  useEffect(() => {
    if (bioData?.bio?.uploaded_img) {
      setSelectedImage(bioData.bio.uploaded_img);
      setHasExistingImage(true);
    } else {
      setSelectedImage(null);
      setHasExistingImage(false);
    }
  }, [bioData]);

  // Upload image mutation
  const uploadMutation = useMutation<UploadResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`${apiUrl}/client-img/client-upload-image/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    },
    onMutate: () => {
      setIsUploading(true);
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setShowCropper(false);
      setSelectedImage(data.cloudinary_url);
      setHasExistingImage(true);
      
      toast.success('Image uploaded successfully!', {
        duration: 5000,
        title: '✨ Perfect!'
      });
      
      // If previous image was deleted, show additional info
      if (data.previous_image_deleted) {
        toast.info('Previous image was replaced', {
          duration: 4000,
          title: '🔄 Updated'
        });
      }
      
      // Refetch bio to update with new image
      refetchBio();
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast.error(error.message || 'Failed to upload image', {
        duration: 6000,
        title: '❌ Upload Failed'
      });
    },
  });

  // Delete image mutation (for remove photo)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/client-img/client-image/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      return response.json();
    },
    onSuccess: () => {
      setSelectedImage(null);
      setOriginalFile(null);
      setHasExistingImage(false);
      setShowDeleteConfirm(false);
      setShowRemoveConfirm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      toast.success('Photo removed successfully', {
        duration: 5000,
        title: '🗑️ Removed'
      });
      
      refetchBio();
    },
    onError: (error: Error) => {
      setShowDeleteConfirm(false);
      setShowRemoveConfirm(false);
      toast.error(error.message || 'Failed to remove photo', {
        duration: 6000,
        title: '❌ Remove Failed'
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      // Check file size (max 10MB for full body images)
      if (file.size > 10 * 1024 * 1024) {
        toast.warning('File size must be less than 10MB', {
          duration: 5000,
          title: '⚠️ Too Large'
        });
        return;
      }

      setOriginalFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    } else {
      toast.warning('Please select a valid image file', {
        duration: 5000,
        title: '⚠️ Invalid File'
      });
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // File input change
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Crop complete
  const onCropComplete = useCallback((_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Create cropped image
  const createCroppedImage = useCallback(async (): Promise<Blob | null> => {
    if (!selectedImage || !croppedAreaPixels || !originalFile) return null;

    try {
      const image = new Image();
      image.src = selectedImage;
      
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, originalFile.type, 0.95);
      });
    } catch (error) {
      console.error('Error creating cropped image:', error);
      return null;
    }
  }, [selectedImage, croppedAreaPixels, originalFile]);

  // Handle save with cropping
  const handleSave = async () => {
    if (!selectedImage) return;

    if (showCropper && originalFile && croppedAreaPixels) {
      // Create cropped image
      const croppedBlob = await createCroppedImage();
      
      if (croppedBlob) {
        // Create form data with cropped image
        const formData = new FormData();
        const croppedFile = new File([croppedBlob], originalFile.name, {
          type: originalFile.type,
        });
        formData.append('image', croppedFile);
        
        // Upload cropped image
        uploadMutation.mutate(formData);
      } else {
        toast.error('Failed to crop image', {
          duration: 5000,
          title: '❌ Crop Failed'
        });
      }
    } else if (originalFile) {
      // Upload original image without cropping
      const formData = new FormData();
      formData.append('image', originalFile);
      uploadMutation.mutate(formData);
    }
  };

  // Handle delete with confirmation (for delete button)
  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Handle remove with confirmation (for remove photo button)
  const handleRemove = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemove = () => {
    deleteMutation.mutate();
  };

  const cancelRemove = () => {
    setShowRemoveConfirm(false);
  };

  // Cancel cropping
  const handleCancelCrop = () => {
    if (hasExistingImage && bioData?.bio?.uploaded_img) {
      setSelectedImage(bioData.bio.uploaded_img);
    } else {
      setSelectedImage(null);
      setOriginalFile(null);
    }
    setShowCropper(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle change image
  const handleChangeImage = () => {
    fileInputRef.current?.click();
  };

  if (bioLoading) {
    return (
      <div className="uci-loading-container">
        <Spinner size="medium" color="#c41e3a" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="uci-container">
      <div className="uci-header">
        <h3 className="uci-title">
          <span className="uci-title-icon">📸</span>
          Profile Photo
        </h3>
        <span className="uci-subtitle">
          {hasExistingImage ? '✨ Update your photo' : '✨ Upload your best full-body photo'}
        </span>
      </div>

      <div className="uci-content">
        {/* Image Upload/Crop Area */}
        {showCropper ? (
          <div className="uci-cropper-container">
            <div className="uci-cropper-header">
              <span className="uci-cropper-title">✂️ Crop Your Full Body Image</span>
              <span className="uci-cropper-hint">Drag to adjust · Pinch to zoom · Show your full body</span>
            </div>
            <div className="uci-cropper-wrapper uci-fullbody-cropper">
              <Cropper
                image={selectedImage || ''}
                crop={crop}
                zoom={zoom}
                aspect={2/3} // Portrait aspect ratio for full body
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid={true}
              />
            </div>
            <div className="uci-cropper-controls">
              <div className="uci-zoom-control">
                <span className="uci-zoom-icon">🔍</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="uci-zoom-slider"
                />
                <span className="uci-zoom-value">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className={`uci-upload-area ${isDragging ? 'uci-dragging' : ''} ${selectedImage ? 'uci-has-image' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !selectedImage && !hasExistingImage && fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <>
                <img src={selectedImage} alt="Preview" className="uci-preview uci-fullbody-preview" />
                <div className="uci-image-badges">
                  {hasExistingImage && <span className="uci-current-badge">Current</span>}
                </div>
                {!showCropper && (
                  <div className="uci-image-actions-overlay">
                    <button 
                      className="uci-action-btn uci-change-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeImage();
                      }}
                    >
                      <span className="uci-btn-icon">📸</span>
                      Change
                    </button>
                    {hasExistingImage && (
                      <button 
                        className="uci-action-btn uci-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                      >
                        <span className="uci-btn-icon">🗑️</span>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="uci-placeholder">
                <div className="uci-upload-icon">📸</div>
                <div className="uci-upload-text">
                  <span className="uci-click-text">Click to upload</span>
                  <span className="uci-drag-text">or drag and drop</span>
                </div>
                <div className="uci-format-badge">
                  <span className="uci-format-text">PNG, JPG · Max 10MB</span>
                </div>
              </div>
            )}
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              className="uci-file-input"
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Delete Confirmation (for delete button in overlay) */}
        {showDeleteConfirm && (
          <div className="uci-confirm-overlay">
            <div className="uci-confirm-dialog">
              <div className="uci-confirm-icon">🗑️</div>
              <h4 className="uci-confirm-title">Delete This Photo?</h4>
              <p className="uci-confirm-message">
                This will remove this specific photo. You can upload a new one anytime.
              </p>
              <div className="uci-confirm-actions">
                <button 
                  className="uci-confirm-btn uci-confirm-cancel"
                  onClick={cancelDelete}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </button>
                <button 
                  className="uci-confirm-btn uci-confirm-delete"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Photo Confirmation (for remove photo button) */}
        {showRemoveConfirm && (
          <div className="uci-confirm-overlay">
            <div className="uci-confirm-dialog">
              <div className="uci-confirm-icon">📸</div>
              <h4 className="uci-confirm-title">Remove Profile Photo?</h4>
              <p className="uci-confirm-message">
                Your profile will show no photo. You can upload a new one anytime.
              </p>
              <div className="uci-confirm-actions">
                <button 
                  className="uci-confirm-btn uci-confirm-cancel"
                  onClick={cancelRemove}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </button>
                <button 
                  className="uci-confirm-btn uci-confirm-remove"
                  onClick={confirmRemove}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="uci-actions">
          {isUploading || deleteMutation.isPending ? (
            <div className="uci-loading-wrapper">
              <Spinner size="small" color="#c41e3a" message="Processing..." />
            </div>
          ) : (
            <>
              {showCropper ? (
                <div className="uci-crop-actions">
                  <button 
                    className="uci-crop-save-btn"
                    onClick={handleSave}
                    disabled={isUploading}
                  >
                    <span className="uci-btn-icon">✓</span>
                    Apply Crop & Save
                  </button>
                  <button 
                    className="uci-crop-cancel-btn"
                    onClick={handleCancelCrop}
                    disabled={isUploading}
                  >
                    <span className="uci-btn-icon">↩</span>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="uci-main-actions">
                  {selectedImage && !hasExistingImage && (
                    <button 
                      className="uci-save-btn uci-active"
                      onClick={handleSave}
                      disabled={isUploading}
                    >
                      <span className="uci-btn-icon">💾</span>
                      Save Photo
                    </button>
                  )}
                  
                  {/* Remove Photo Button - Always visible when there's an existing image */}
                  {hasExistingImage && !showCropper && (
                    <button 
                      className="uci-remove-btn"
                      onClick={handleRemove}
                      disabled={deleteMutation.isPending}
                    >
                      <span className="uci-btn-icon">📸</span>
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Hint Text */}
        {!selectedImage && !showCropper && (
          <div className="uci-hint">
            <span className="uci-hint-icon">💡</span>
            <span className="uci-hint-text">
              Upload a clear full-body photo so others can see your style and appearance!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Uploadclientimg;