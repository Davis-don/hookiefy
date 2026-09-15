import './addimgprofile.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import { FaPlus, FaCheck, FaXmark } from 'react-icons/fa6';
import { useState, useRef } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import { toast } from 'sonner';
import Loadingcomponent from './Loading/Loadingcomponent';

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

interface AuthCheckResponse {
  authenticated: boolean;
  user: UserData;
}

interface UploadResponse {
  message: string;
  profile_image_url: string;
  profile_image_public_id: string;
  replaced: boolean;
  old_public_id: string | null;
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://hookiefy-server-7d6d.onrender.com';

/* ── Fetch current user ─────────────────────────────────── */
const fetchCurrentUser = async (
  accessToken: string | null
): Promise<UserData> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${API_URL}/account/auth-check/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(`Failed to fetch user: ${response.status}`);
  }

  const data: AuthCheckResponse = await response.json();
  return data.user;
};

/* ── Upload profile image ──────────────────────────────── */
const uploadProfileImage = async (
  accessToken: string | null,
  file: File
): Promise<UploadResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_URL}/account/upload-profile-image/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
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
  const [imgLoaded, setImgLoaded] = useState(false);

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(accessToken, file),

    onSuccess: async () => {
      toast.success('Profile image updated!', {
        duration: 3000,
        icon: '📸',
        style: {
          background: '#0F172A',
          border: '1px solid #10B981',
          color: '#FFFFFF',
        },
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setShowUploadOptions(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-image'] });
      await refetch();
    },

    onError: (error: Error) => {
      toast.error('Failed to upload image', {
        description: error.message || 'Please try again.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#0F172A',
          border: '1px solid #EF4444',
          color: '#FFFFFF',
        },
      });
    },
  });

  const handleClick = () => {
    if (!uploadMutation.isPending) fileInputRef.current?.click();
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
          background: '#0F172A',
          border: '1px solid #EF4444',
          color: '#FFFFFF',
        },
      });
      return;
    }

    setSelectedFile(file);
    setShowUploadOptions(true);

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Derived avatar data ─────────────────────────────── */
  const realImageUrl = user?.profile_image_url || null;
  const displayImage = previewUrl || realImageUrl;

  const initials =
    ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')) ||
    user?.full_name?.[0] ||
    'SP';

  if (isLoading) return <Loadingcomponent />;

  return (
    <div className="yp-imgup-wrapper">
      {/* ── Avatar ─────────────────────────────────────── */}
      <div className="yp-imgup-avatar-shell">
        <div className="yp-imgup-ring" />
        <div className="yp-imgup-circle">
          {displayImage ? (
            <img
              key={displayImage}
              src={displayImage}
              alt="Profile"
              className={`yp-imgup-img ${
                imgLoaded ? 'yp-imgup-img-loaded' : 'yp-imgup-img-loading'
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
                t.parentElement?.classList.add('yp-imgup-fallback');
              }}
            />
          ) : (
            <div className="yp-imgup-initials">
              {initials.toUpperCase()}
            </div>
          )}

          {/* Uploading overlay */}
          {uploadMutation.isPending && (
            <div className="yp-imgup-uploading">
              <div className="yp-imgup-spinner" />
            </div>
          )}
        </div>

        {/* FAB + button (hidden while choosing / uploading) */}
        {!showUploadOptions && !uploadMutation.isPending && (
          <button
            type="button"
            className="yp-imgup-fab"
            onClick={handleClick}
            aria-label="Add profile image"
          >
            <FaPlus />
          </button>
        )}
      </div>

      {/* ── Status text ───────────────────────────────── */}
      <p className="yp-imgup-hint">
        {uploadMutation.isPending
          ? 'Uploading your photo…'
          : showUploadOptions
          ? 'Ready to upload?'
          : displayImage
          ? 'Tap + to change your photo'
          : 'Tap + to add a profile photo'}
      </p>

      {/* ── Action bar (only when a file is picked) ──── */}
      {showUploadOptions && !uploadMutation.isPending && (
        <div className="yp-imgup-actions">
          <button
            type="button"
            className="yp-imgup-btn yp-imgup-btn-cancel"
            onClick={handleCancel}
          >
            <FaXmark />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            className="yp-imgup-btn yp-imgup-btn-confirm"
            onClick={handleUpload}
          >
            <FaCheck />
            <span>Save photo</span>
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="yp-imgup-file"
        disabled={uploadMutation.isPending}
      />
    </div>
  );
}

export default Addimageprofile;