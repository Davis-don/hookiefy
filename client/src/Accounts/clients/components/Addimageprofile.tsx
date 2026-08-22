import './addimgprofile.css'
import 'bootstrap/dist/css/bootstrap-grid.min.css'
import image1 from '../../../assets/images/stefzn-pFW7o43y-FM-unsplash.jpg'
import { FaPlus } from "react-icons/fa6";
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'
import Loadingcomponent from '../../common/components/Loading/Loadingcomponent';

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

function Addimageprofile() {
  const { access: accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  // Fetch current user
  const { 
    data: user, 
    isLoading,
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
    onSuccess: async () => {
      toast.success('Profile image updated!', {
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
      setShowUploadOptions(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Invalidate and refetch immediately
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await refetch();
      
      // Force a second refetch to ensure we get the latest data
      setTimeout(async () => {
        await refetch();
      }, 100);
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

  const handleClick = () => {
    if (!uploadMutation.isPending) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
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

    setSelectedFile(file);
    setShowUploadOptions(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowUploadOptions(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentProfileImage = user?.profile_image_url || image1;

  // Show loading component when fetching user data
  if (isLoading) {
    return <Loadingcomponent />;
  }

  return (
    <div className="overall-add-img-profile-container">
      <div className="image-circular-card rounded-circle">
        <img 
          src={previewUrl || currentProfileImage} 
          alt="Profile" 
          className='rounded-circle' 
        />
        
        {/* Instagram-style plus button */}
        {!showUploadOptions && !uploadMutation.isPending && (
          <div className="addimg-button" onClick={handleClick}>
            <FaPlus />
          </div>
        )}

        {/* Upload options - Instagram style */}
        {showUploadOptions && !uploadMutation.isPending && (
          <div className="addimg-upload-options">
            <div className="addimg-upload-buttons">
              <button 
                className="addimg-upload-btn"
                onClick={handleUpload}
              >
                <span>✓</span> Upload
              </button>
              <button 
                className="addimg-cancel-btn"
                onClick={handleCancel}
              >
                <span>✕</span> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Uploading state */}
        {uploadMutation.isPending && (
          <div className="addimg-uploading-overlay">
            <div className="addimg-uploading-spinner"></div>
            <span>Uploading...</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="addimg-file-input"
        disabled={uploadMutation.isPending}
      />
    </div>
  )
}

export default Addimageprofile