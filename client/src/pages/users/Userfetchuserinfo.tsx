// ============================================================
// 3.  Userfetchuserinfo.tsx  (display user metadata)
//     import './userprofile.css'
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import {  FiPhone, FiUser, FiGlobe } from 'react-icons/fi';

// ============================================================
// TYPES
// ============================================================

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
// API HELPER
// ============================================================

const fetchCurrentUser = async (accessToken: string | null): Promise<UserData> => {
  if (!accessToken) throw new Error('No access token found.');
  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/current-user/`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired.');
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  return response.json();
};

// ============================================================
// COMPONENT
// ============================================================

function Userfetchuserinfo() {
  const { access: accessToken } = useAuthStore();

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="up-user-info">
        <div className="up-user-fullname" style={{ color: '#c7c7c7' }}>Loading...</div>
        <div className="up-user-username" style={{ color: '#c7c7c7' }}>Fetching profile...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="up-user-info">
        <div className="up-user-fullname" style={{ color: '#ed4956', fontSize: '16px' }}>
          ⚠️ {error instanceof Error ? error.message : 'Failed to load'}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="up-user-info">
        <div className="up-user-fullname" style={{ color: '#8e8e8e', fontSize: '16px' }}>
          No user data available
        </div>
      </div>
    );
  }

  // Build display name
  const displayName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  const username = user.email?.split('@')[0] || 'user';
  const genderDisplay = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set';

  return (
    <div className="up-user-info">
      <h2 className="up-user-fullname">{displayName}</h2>
      <p className="up-user-username">@{username}</p>
      <p className="up-user-email">{user.email}</p>

      <div className="up-user-meta-row">
        {user.phone_number && (
          <span className="up-user-meta-item">
            <FiPhone size={14} /> <span>{user.phone_number}</span>
          </span>
        )}
        <span className="up-user-meta-item">
          <FiUser size={14} /> <span>{genderDisplay}</span>
        </span>
        <span className="up-user-meta-item">
          <FiGlobe size={14} /> <span>{user.role || 'Member'}</span>
        </span>
      </div>

      <div style={{ marginTop: 6, fontSize: '13px', color: '#8e8e8e' }}>
        Member since {new Date().getFullYear()}
      </div>
    </div>
  );
}

export default Userfetchuserinfo;