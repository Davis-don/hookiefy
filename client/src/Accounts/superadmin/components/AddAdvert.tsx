// components/adverts/AddAdvert.tsx
// Add Advert Component with URL and Cloudinary Upload Options
// ============================================================

import './addadvert.css'
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import {
  FiX,
  FiLink,
  FiUploadCloud,
  FiImage,
  FiVideo,
  FiCheckCircle,
  FiTrash2,
} from 'react-icons/fi';
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';

// ============================================================
// TYPES
// ============================================================

type MediaType = 'image' | 'video';
type UploadType = 'url' | 'cloudinary';

interface AddAdvertData {
  title: string;
  description: string;
  url: string;
  type: MediaType;
}

interface CloudinaryUploadData {
  title: string;
  description: string;
  image_file: File;
}

interface AddAdvertProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// ============================================================
// API HELPERS
// ============================================================

const createUrlAdvert = async (
  data: AddAdvertData,
  accessToken: string | null
): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/adverts/create/url/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create advert');
  }

  return response.json();
};

const uploadCloudinaryAdvert = async (
  data: CloudinaryUploadData,
  accessToken: string | null
): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('image_file', data.image_file);

  const response = await fetch(`${import.meta.env.VITE_API_URL}/adverts/create/cloudinary/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to upload to Cloudinary');
  }

  return response.json();
};

// ============================================================
// COMPONENT
// ============================================================

const AddAdvert = ({ onSuccess, onCancel }: AddAdvertProps) => {
  const { access: accessToken } = useAuthStore();

  // Form state
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [uploadType, setUploadType] = useState<UploadType>('url');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // URL Mutation
  const urlMutation = useMutation({
    mutationFn: (data: AddAdvertData) => createUrlAdvert(data, accessToken),
    onSuccess: () => {
      toast.success('Advert created successfully!', {
        description: `Your ${mediaType} advert has been added.`,
        duration: 5000,
        icon: '🎉',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      resetForm();
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to create advert', {
        description: error.message || 'Please check the form and try again.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  // Cloudinary Mutation
  const cloudinaryMutation = useMutation({
    mutationFn: (data: CloudinaryUploadData) => uploadCloudinaryAdvert(data, accessToken),
    onSuccess: () => {
      toast.success('Image uploaded successfully!', {
        description: 'Your image has been uploaded to Cloudinary.',
        duration: 5000,
        icon: '☁️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      resetForm();
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to upload image', {
        description: error.message || 'Please check the file and try again.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  const isPending = urlMutation.isPending || cloudinaryMutation.isPending;

  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType('image');
    setUploadType('url');
    setDragOver(false);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (only images)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type', {
          description: 'Only JPEG, PNG, GIF, and WEBP images are allowed.',
          duration: 4000,
          icon: '⚠️',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'Image must be under 10MB.',
          duration: 4000,
          icon: '⚠️',
          style: {
            background: '#1a1a2e',
            border: '1px solid #ef4444',
            color: '#ffffff',
          },
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type', {
          description: 'Only JPEG, PNG, GIF, and WEBP images are allowed.',
          duration: 4000,
          icon: '⚠️',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large', {
          description: 'Image must be under 10MB.',
          duration: 4000,
          icon: '⚠️',
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Handle URL form submit
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required', {
        description: 'Please enter a title for your advert.',
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    if (!url.trim()) {
      toast.error('URL is required', {
        description: 'Please enter a valid URL for your media.',
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      toast.error('Invalid URL', {
        description: 'Please enter a valid URL starting with http:// or https://',
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    urlMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      type: mediaType,
    });
  };

  // Handle Cloudinary form submit
  const handleCloudinarySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required', {
        description: 'Please enter a title for your advert.',
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    if (!selectedFile) {
      toast.error('No image selected', {
        description: 'Please select an image file to upload.',
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    cloudinaryMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      image_file: selectedFile,
    });
  };

  // Loading state
  if (isPending) {
    return (
      <div className="aa-loading-container">
        <Loadingcomponent />
        <p className="aa-loading-text">
          {urlMutation.isPending ? 'Creating advert...' : 'Uploading to Cloudinary...'}
        </p>
      </div>
    );
  }

  return (
    <div className="aa-container">
      {/* Header */}
      <div className="aa-header">
        <div className="aa-header-left">
          <h2 className="aa-title">Create New Advert</h2>
          <p className="aa-subtitle">Add an image or video advert to the system</p>
        </div>
        <button className="aa-close-btn" onClick={onCancel}>
          <FiX />
        </button>
      </div>

      {/* Media Type Selection */}
      <div className="aa-media-type-toggle">
        <button
          className={`aa-media-btn ${mediaType === 'image' ? 'active' : ''}`}
          onClick={() => {
            setMediaType('image');
            if (uploadType === 'cloudinary' && mediaType === 'video') {
              setUploadType('url');
            }
          }}
        >
          <FiImage /> Image
        </button>
        <button
          className={`aa-media-btn ${mediaType === 'video' ? 'active' : ''}`}
          onClick={() => {
            setMediaType('video');
            if (uploadType === 'cloudinary') {
              setUploadType('url');
            }
          }}
        >
          <FiVideo /> Video
        </button>
      </div>

      {/* Upload Type Selection - Only for Images */}
      {mediaType === 'image' && (
        <div className="aa-upload-type-toggle">
          <button
            className={`aa-upload-btn ${uploadType === 'url' ? 'active' : ''}`}
            onClick={() => setUploadType('url')}
          >
            <FiLink /> URL Link
          </button>
          <button
            className={`aa-upload-btn ${uploadType === 'cloudinary' ? 'active' : ''}`}
            onClick={() => setUploadType('cloudinary')}
          >
            <FiUploadCloud /> Upload Image
          </button>
        </div>
      )}

      {/* URL Form */}
      {uploadType === 'url' && (
        <form className="aa-form" onSubmit={handleUrlSubmit}>
          <div className="aa-form-group">
            <label className="aa-label">
              Title <span className="aa-required">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="aa-input"
              placeholder="Enter advert title"
              disabled={isPending}
            />
          </div>

          <div className="aa-form-group">
            <label className="aa-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="aa-input aa-textarea"
              placeholder="Enter advert description (optional)"
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="aa-form-group">
            <label className="aa-label">
              Media URL <span className="aa-required">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="aa-input"
              placeholder="https://example.com/image.jpg"
              disabled={isPending}
            />
            <p className="aa-hint">Enter a direct URL to your {mediaType}</p>
          </div>

          <div className="aa-actions">
            <button type="button" className="aa-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="aa-submit-btn" disabled={isPending}>
              <FiCheckCircle /> Create Advert
            </button>
          </div>
        </form>
      )}

      {/* Cloudinary Form - Images Only */}
      {uploadType === 'cloudinary' && mediaType === 'image' && (
        <form className="aa-form" onSubmit={handleCloudinarySubmit}>
          <div className="aa-form-group">
            <label className="aa-label">
              Title <span className="aa-required">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="aa-input"
              placeholder="Enter advert title"
              disabled={isPending}
            />
          </div>

          <div className="aa-form-group">
            <label className="aa-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="aa-input aa-textarea"
              placeholder="Enter advert description (optional)"
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="aa-form-group">
            <label className="aa-label">
              Image File <span className="aa-required">*</span>
            </label>
            <div
              className={`aa-file-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="aa-file-preview">
                  <img src={previewUrl} alt="Preview" />
                  <div className="aa-file-info">
                    <span className="aa-file-name">{selectedFile?.name}</span>
                    <span className="aa-file-size">
                      {selectedFile && (selectedFile.size / 1024 / 1024 < 1
                        ? `${Math.round(selectedFile.size / 1024)} KB`
                        : `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`)}
                    </span>
                    <button
                      type="button"
                      className="aa-remove-file"
                      onClick={removeFile}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aa-dropzone-content">
                  <FiUploadCloud className="aa-dropzone-icon" />
                  <p>Drag & drop an image here</p>
                  <p className="aa-dropzone-hint">or click to browse</p>
                  <p className="aa-dropzone-formats">JPEG, PNG, GIF, WEBP • Max 10MB</p>
                </div>
              )}
              <input
                type="file"
                className="aa-file-input"
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="aa-actions">
            <button type="button" className="aa-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="aa-submit-btn"
              disabled={isPending || !selectedFile}
            >
              <FiUploadCloud /> Upload to Cloudinary
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddAdvert;