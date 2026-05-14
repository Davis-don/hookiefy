import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Clientdatacard from './Clientdatacard';
import UserDetail from './Userdetail';
import './clientdatacards.css';

// Types based on API response
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Bio {
  age: number | null;
  gender: string | null;
  country: string | null;
  county: string | null;
  location_desc: string | null;
  info: string | null;
  phone_number: string | null;
  occupation: string | null;
  interests: string | null;
  uploaded_img: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: number;
  user: User;
  bio: Bio | null;
  full_name: string;
  has_image: boolean;
  has_bio: boolean;
  profile_completion_percentage: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Profile[];
}

interface ClientdatacardsProps {
  isBlurred?: boolean;
  isClickable?: boolean;
}

const Clientdatacards: React.FC<ClientdatacardsProps> = ({ 
  isBlurred = false, 
  isClickable = true 
}) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Fetch profiles data
  const { data, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/profiles/all-profiles/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profiles');
      }

      return response.json();
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
    retry: 1,
  });

  // Auto-refetch when coming back to page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const handleCardClick = (profile: Profile) => {
    if (isClickable) {
      setSelectedProfile(profile);
    }
  };

  const handleBack = () => {
    setSelectedProfile(null);
  };

  // If a profile is selected, show UserDetail
  if (selectedProfile) {
    return (
      <UserDetail
        profile={{
          id: selectedProfile.id.toString(),
          name: selectedProfile.full_name,
          age: selectedProfile.bio?.age || null,
          gender: selectedProfile.bio?.gender || null,
          country: selectedProfile.bio?.country || null,
          county: selectedProfile.bio?.county || null,
          location: selectedProfile.bio?.location_desc || null,
          occupation: selectedProfile.bio?.occupation || null,
          interests: selectedProfile.bio?.interests || null,
          image: selectedProfile.bio?.uploaded_img || null,
          info: selectedProfile.bio?.info || null,
          hasImage: selectedProfile.has_image,
          hasBio: selectedProfile.has_bio,
          completionPercentage: selectedProfile.profile_completion_percentage,
        }}
        onBack={handleBack}
      />
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="cds-cards-container">
        <div className="cds-skeleton-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="cds-skeleton-card">
              <div className="cds-skeleton-image"></div>
              <div className="cds-skeleton-content"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cds-cards-container">
        <div className="cds-error-state">
          <div className="cds-error-card">
            <span className="cds-error-icon">💔</span>
            <h3>Unable to Load Profiles</h3>
            <p>There was an error loading profiles. Please try again.</p>
            <button className="cds-retry-btn" onClick={() => refetch()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const profiles = data?.results || [];

  return (
    <div className="cds-cards-container">
      {/* Blur Overlay */}
      {isBlurred && (
        <div className="cds-blur-overlay">
          <div className="cds-blur-message">
            <span className="cds-blur-icon">🔒</span>
            <h3>Complete Your Profile First</h3>
            <p>Please complete your bio information to view and interact with other profiles</p>
          </div>
        </div>
      )}
      
      {/* Cards Grid */}
      {profiles.length === 0 ? (
        <div className="cds-empty-state">
          <div className="cds-empty-content">
            <span className="cds-empty-icon">👥</span>
            <h3>No Profiles Available</h3>
            <p>There are no profiles to display at the moment.</p>
          </div>
        </div>
      ) : (
        <div className={`cds-grid ${isBlurred ? 'cds-grid-blurred' : ''}`}>
          {profiles.map((profile) => (
            <Clientdatacard
              key={profile.id}
              id={profile.id.toString()}
              name={profile.full_name}
              age={profile.bio?.age || null}
              gender={profile.bio?.gender || null}
              country={profile.bio?.country || null}
              county={profile.bio?.county || null}
              location={profile.bio?.location_desc || null}
              occupation={profile.bio?.occupation || null}
              interests={profile.bio?.interests || null}
              image={profile.bio?.uploaded_img || null}
              info={profile.bio?.info || null}
              hasImage={profile.has_image}
              hasBio={profile.has_bio}
              completionPercentage={profile.profile_completion_percentage}
              isClickable={isClickable}
              onClick={() => handleCardClick(profile)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Clientdatacards;