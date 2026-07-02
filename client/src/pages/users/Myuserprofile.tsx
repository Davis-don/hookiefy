// ============================================================
// Myuserprofile.tsx  (Instagram-style profile edit - unique)
// ============================================================

import './myuserprofile.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { IoMdClose } from "react-icons/io";
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

interface ProfileData {
  bio: string;
  country: string;
  county: string;
  city: string;
  date_of_birth: string;
}

interface MyuserprofileProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface ProfileResponse {
  message: string;
  data: {
    id?: number;
    bio: string;
    country: string;
    county: string;
    city: string;
    date_of_birth: string;
    created_at?: string;
    updated_at?: string;
  };
}

// Country data with counties
const countriesData: Record<string, string[]> = {
  'Kenya': [
    'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 
    'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 
    'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 
    'Nyeri', 'Kirinyaga', 'Muranga', 'Kiambu', 'Turkana', 'West Pokot', 
    'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi', 
    'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 
    'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 
    'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'
  ],
  'Uganda': [
    'Central', 'Eastern', 'Northern', 'Western', 'Kampala', 'Entebbe'
  ],
  'Tanzania': [
    'Arusha', 'Dar es Salaam', 'Dodoma', 'Mwanza', 'Zanzibar', 'Tanganyika'
  ],
  'Rwanda': [
    'Kigali', 'Northern', 'Eastern', 'Western', 'Southern'
  ],
  'South Africa': [
    'Gauteng', 'Western Cape', 'Eastern Cape', 'KwaZulu-Natal', 'Mpumalanga', 
    'Limpopo', 'North West', 'Free State', 'Northern Cape'
  ],
  'Nigeria': [
    'Lagos', 'Abuja', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Borno', 'Enugu'
  ],
  'Ghana': [
    'Greater Accra', 'Ashanti', 'Central', 'Western', 'Eastern', 'Volta'
  ],
  'Egypt': [
    'Cairo', 'Alexandria', 'Giza', 'Port Said', 'Suez', 'Luxor'
  ],
  'Morocco': [
    'Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir'
  ],
  'United Kingdom': [
    'England', 'Scotland', 'Wales', 'Northern Ireland', 'London', 'Manchester'
  ],
  'United States': [
    'California', 'Texas', 'New York', 'Florida', 'Illinois', 'Pennsylvania', 
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 
    'Washington', 'Massachusetts', 'Arizona', 'Tennessee', 'Indiana', 'Missouri', 
    'Maryland', 'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina', 'Alabama'
  ],
  'India': [
    'Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'Karnataka', 'Gujarat', 
    'Rajasthan', 'Delhi', 'West Bengal', 'Bihar', 'Telangana'
  ],
  'Australia': [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
    'South Australia', 'Tasmania', 'Australian Capital Territory'
  ],
  'Canada': [
    'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 
    'Saskatchewan', 'Nova Scotia', 'Newfoundland and Labrador'
  ],
  'Germany': [
    'Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'North Rhine-Westphalia', 
    'Saxony', 'Baden-Wurttemberg'
  ],
  'France': [
    'Paris', 'Provence', 'French Riviera', 'Bordeaux', 'Lyon', 'Marseille'
  ],
  'Italy': [
    'Lombardy', 'Lazio', 'Campania', 'Veneto', 'Tuscany', 'Sicily'
  ],
  'Spain': [
    'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Malaga', 'Murcia'
  ],
  'Brazil': [
    'Sao Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Parana', 'Pernambuco'
  ],
  'China': [
    'Beijing', 'Shanghai', 'Guangdong', 'Zhejiang', 'Sichuan', 'Hubei'
  ],
  'Japan': [
    'Tokyo', 'Osaka', 'Nagoya', 'Fukuoka', 'Sapporo', 'Kyoto'
  ]
};

// Get random bio placeholder
const getRandomBioPlaceholder = (): string => {
  const placeholders = [
    "Hey there! I'm looking for fun and meaningful connections. Life's too short to be boring — let's make some memories together! 😉✨",
    "Looking for someone to share adventures with. I believe in living life to the fullest and enjoying every moment. Let's connect and see where it goes! 🌟",
    "I'm all about good vibes and great conversations. Looking for someone genuine to share laughs, fun times, and maybe something more... 😏",
    "Life is an adventure, and I'm looking for a partner in crime! Let's explore, laugh, and create unforgettable moments together. 🎉",
    "I'm looking for someone who's up for anything — from deep conversations to spontaneous fun. Let's see where this journey takes us! 💫",
    "Just a fun-loving person looking for someone to vibe with. Let's get to know each other and create our own story. ❤️",
    "I believe in living in the moment and making every second count. Looking for someone to share the good times with. Let's talk! 😊",
    "Looking for a spark — someone who can keep up with my energy and passion for life. Let's make magic happen! 🔥",
    "I'm a firm believer that the best things in life are shared. Looking for someone to share adventures, laughter, and good times with. 🌈",
    "Let's skip the small talk and get to the good stuff. I'm looking for real connections and unforgettable experiences. Who's with me? 🚀"
  ];
  return placeholders[Math.floor(Math.random() * placeholders.length)];
};

// Fetch profile
const fetchProfile = async (accessToken: string | null): Promise<ProfileResponse | null> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/fetch-profile/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch profile');
  }

  return response.json();
};

// Create/Update profile
const createOrUpdateProfile = async (profileData: ProfileData, accessToken: string | null): Promise<ProfileResponse> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/create-update/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save profile');
  }

  return response.json();
};

function Myuserprofile({ onComplete, onCancel }: MyuserprofileProps) {
  const { access: accessToken } = useAuthStore();
  const [formData, setFormData] = useState<ProfileData>({
    bio: '',
    country: '',
    county: '',
    city: '',
    date_of_birth: '',
  });
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [availableCounties, setAvailableCounties] = useState<string[]>([]);
  const [bioPlaceholder, setBioPlaceholder] = useState<string>('');

  // Set bio placeholder on mount
  useEffect(() => {
    setBioPlaceholder(getRandomBioPlaceholder());
  }, []);

  // Fetch existing profile data
  const { isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile', accessToken],
    queryFn: () => fetchProfile(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Use useEffect to handle the data from the query
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchProfile(accessToken);
        if (data && data.data) {
          const profile = data.data;
          setFormData({
            bio: profile.bio || '',
            country: profile.country || '',
            county: profile.county || '',
            city: profile.city || '',
            date_of_birth: profile.date_of_birth || '',
          });
          setIsExistingProfile(true);
          if (profile.country && countriesData[profile.country]) {
            setAvailableCounties(countriesData[profile.country]);
          }
        } else {
          setIsExistingProfile(false);
        }
      } catch (error) {
        setIsExistingProfile(false);
      }
    };

    if (accessToken) {
      fetchData();
    }
  }, [accessToken]);

  // Update counties when country changes
  useEffect(() => {
    if (formData.country && countriesData[formData.country]) {
      setAvailableCounties(countriesData[formData.country]);
      if (!countriesData[formData.country].includes(formData.county)) {
        setFormData(prev => ({ ...prev, county: '' }));
      }
    } else {
      setAvailableCounties([]);
      setFormData(prev => ({ ...prev, county: '' }));
    }
  }, [formData.country]);

  const mutation = useMutation({
    mutationFn: (data: ProfileData) => createOrUpdateProfile(data, accessToken),
    onSuccess: () => {
      toast.success(isExistingProfile ? 'Profile updated!' : 'Profile created!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to save profile', {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.bio.trim()) {
      toast.error('Bio is required', {
        description: 'Please tell us about yourself.',
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

    if (!formData.country) {
      toast.error('Country is required', {
        description: 'Please select your country.',
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

    if (!formData.county) {
      toast.error('County is required', {
        description: 'Please select your county/state.',
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

    if (!formData.city.trim()) {
      toast.error('City is required', {
        description: 'Please enter your city.',
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

    if (!formData.date_of_birth) {
      toast.error('Date of birth is required', {
        description: 'Please enter your date of birth.',
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

    // Check age (must be 18+)
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      toast.error('You must be at least 18 years old', {
        description: 'Please enter a valid date of birth.',
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

    const loadingToast = toast.loading(isExistingProfile ? 'Updating profile...' : 'Creating profile...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    mutation.mutate(formData, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  if (isLoadingProfile) {
    return (
      <div className="mup-overlay">
        <div className="mup-modal-content">
          <div className="mup-loading-container">
            <div className="mup-loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mup-overlay">
      <div className="mup-modal-content">
        <div className="mup-header">
          <div className="mup-header-left">
            <h3>{isExistingProfile ? 'Edit Profile' : 'Complete Profile'}</h3>
            <p className="mup-header-subtitle">Update your personal information</p>
          </div>
          <div className="mup-header-right">
            {onCancel && (
              <IoMdClose onClick={onCancel} className="mup-close-icon" />
            )}
          </div>
        </div>

        <div className="mup-form-container">
          <form className="mup-form" onSubmit={handleSubmit}>
            <div className="mup-form-group">
              <label className="mup-label">Bio</label>
              <textarea
                name="bio"
                placeholder={bioPlaceholder}
                className="mup-textarea"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                required
              />
              <span className="mup-bio-hint">Let others know who you are and what you're looking for 😊</span>
            </div>

            <div className="mup-form-row">
              <div className="mup-form-group">
                <label className="mup-label">Country</label>
                <select
                  name="country"
                  className="mup-select"
                  value={formData.country}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Country</option>
                  {Object.keys(countriesData).map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mup-form-group">
                <label className="mup-label">County/State</label>
                <select
                  name="county"
                  className="mup-select"
                  value={formData.county}
                  onChange={handleChange}
                  disabled={!formData.country}
                  required
                >
                  <option value="">
                    {!formData.country ? 'Select country first' : 'Select County/State'}
                  </option>
                  {availableCounties.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mup-form-row">
              <div className="mup-form-group">
                <label className="mup-label">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Enter your city"
                  className="mup-input"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mup-form-group">
                <label className="mup-label">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  className="mup-input"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="mup-form-actions">
              <button 
                type="submit" 
                className="mup-submit-btn"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : isExistingProfile ? 'Update Profile' : 'Create Profile'}
              </button>
              {onCancel && (
                <button 
                  type="button" 
                  className="mup-cancel-btn"
                  onClick={onCancel}
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Myuserprofile