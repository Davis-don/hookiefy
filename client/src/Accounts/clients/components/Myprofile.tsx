import './myprofile.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { IoMdClose } from "react-icons/io";
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'

interface ProfileData {
  bio: string;
  country: string;
  county: string;
  city: string;
  date_of_birth: string;
}

interface MyprofileProps {
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

// Bio placeholders
const bioPlaceholders = [
  "Looking for fun and exciting hookups. Let's keep it casual and see where things go! 🔥",
  "I'm here for good vibes and great connections. Not looking for anything serious, just fun! 💕",
  "Life's too short for boring moments. I'm looking for someone adventurous and fun to vibe with! ✨",
  "I know what I want and I'm not afraid to go after it. Looking for someone who's equally confident and fun! 😈",
  "Night owl looking for someone to share late night conversations and spontaneous adventures. 🌙",
  "I believe in living in the moment. Looking for someone who's down for anything and everything! 💫",
  "Just a fun-loving person looking for someone to vibe with. Let's get to know each other and see where it goes! 🌟",
  "I'm looking for a real connection — someone who's honest, fun, and ready to create amazing memories together! 🎯",
  "Looking for someone who can handle my energy and keep up with me. Let's make some unforgettable moments! 💋",
  "I'm all about that spark — looking for someone who makes my heart race and keeps me on my toes! 🔥",
  "Here for a good time, not a long time. Let's make the most of every moment and enjoy the ride! 🎉",
  "Looking for something real, something fun, something unforgettable. Let's see where this takes us! 💞"
];

// Helper function to generate days
const getDays = (): number[] => {
  return Array.from({ length: 31 }, (_, i) => i + 1);
};

// Helper function to generate months
const getMonths = (): { value: number; label: string }[] => {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
};

// Helper function to generate years (from 1900 to current year)
const getYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 100; year <= currentYear; year++) {
    years.push(year);
  }
  return years.reverse();
};

// Format date to YYYY-MM-DD
const formatDate = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return '';
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

// Parse date string to day, month, year
const parseDate = (dateStr: string): { day: number; month: number; year: number } => {
  if (!dateStr) return { day: 0, month: 0, year: 0 };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { day: 0, month: 0, year: 0 };
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]),
    day: parseInt(parts[2])
  };
};

// Get random bio placeholder
const getRandomBioPlaceholder = (): string => {
  return bioPlaceholders[Math.floor(Math.random() * bioPlaceholders.length)];
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
      return null; // No profile exists yet
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

function Myprofile({ onComplete, onCancel }: MyprofileProps) {
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
  
  // Date of birth separate fields
  const [dobDay, setDobDay] = useState<number>(0);
  const [dobMonth, setDobMonth] = useState<number>(0);
  const [dobYear, setDobYear] = useState<number>(0);

  const days = getDays();
  const months = getMonths();
  const years = getYears();

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
          // Set counties based on existing country
          if (profile.country && countriesData[profile.country]) {
            setAvailableCounties(countriesData[profile.country]);
          }
          // Parse date of birth
          if (profile.date_of_birth) {
            const parsed = parseDate(profile.date_of_birth);
            setDobDay(parsed.day);
            setDobMonth(parsed.month);
            setDobYear(parsed.year);
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
      // Reset county if it's not in the new country's counties
      if (!countriesData[formData.country].includes(formData.county)) {
        setFormData(prev => ({ ...prev, county: '' }));
      }
    } else {
      setAvailableCounties([]);
      setFormData(prev => ({ ...prev, county: '' }));
    }
  }, [formData.country]);

  // Update formData.date_of_birth when DOB fields change
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      const formattedDate = formatDate(dobDay, dobMonth, dobYear);
      setFormData(prev => ({ ...prev, date_of_birth: formattedDate }));
    }
  }, [dobDay, dobMonth, dobYear]);

  const mutation = useMutation({
    mutationFn: (data: ProfileData) => createOrUpdateProfile(data, accessToken),
    onSuccess: () => {
      toast.success(isExistingProfile ? 'Profile updated successfully!' : 'Profile created successfully!', {
        description: isExistingProfile ? 'Your profile has been updated.' : 'Your profile has been created.',
        duration: 4000,
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
        description: error.message || 'Please check your input and try again.',
        duration: 5000,
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

  const handleDobChange = (type: 'day' | 'month' | 'year', value: string) => {
    const numValue = parseInt(value);
    if (type === 'day') setDobDay(numValue);
    else if (type === 'month') setDobMonth(numValue);
    else if (type === 'year') setDobYear(numValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.bio.trim()) {
      toast.error('Bio is required', {
        description: 'Please tell us a little about yourself.',
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
      description: 'Please wait while we save your information.',
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
      <div className="mpf-overlay">
        <div className="mpf-modal-content">
          <div className="mpf-loading-container">
            <div className="mpf-loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mpf-overlay">
      <div className="mpf-modal-content">
        <div className="mpf-header">
          <div className="mpf-header-left">
            <h3>{isExistingProfile ? 'Edit Profile' : 'Complete Profile'}</h3>
          </div>
          <div className="mpf-header-right">
            {onCancel && (
              <IoMdClose onClick={onCancel} className="mpf-close-icon" />
            )}
          </div>
        </div>

        <div className="mpf-form-container">
          <form className="mpf-form" onSubmit={handleSubmit}>
            {/* Bio Section */}
            <div className="mpf-form-group">
              <label className="mpf-label">Bio</label>
              <div className="mpf-bio-wrapper">
                <textarea
                  name="bio"
                  placeholder={bioPlaceholder}
                  className="mpf-textarea"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  required
                />
              </div>
              <span className="mpf-bio-hint">Write your own bio or use the placeholder as inspiration 😊</span>
            </div>

            <div className="mpf-form-row">
              <div className="mpf-form-group">
                <label className="mpf-label">Country</label>
                <select
                  name="country"
                  className="mpf-select"
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

              <div className="mpf-form-group">
                <label className="mpf-label">County/State</label>
                <select
                  name="county"
                  className="mpf-select"
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

            <div className="mpf-form-row">
              <div className="mpf-form-group">
                <label className="mpf-label">City</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Enter your city"
                  className="mpf-input"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mpf-form-group">
                <label className="mpf-label">Date of Birth</label>
                <div className="mpf-dob-wrapper">
                  <select
                    className="mpf-dob-select"
                    value={dobDay || ''}
                    onChange={(e) => handleDobChange('day', e.target.value)}
                    required
                  >
                    <option value="">Day</option>
                    {days.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    className="mpf-dob-select"
                    value={dobMonth || ''}
                    onChange={(e) => handleDobChange('month', e.target.value)}
                    required
                  >
                    <option value="">Month</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                  <select
                    className="mpf-dob-select"
                    value={dobYear || ''}
                    onChange={(e) => handleDobChange('year', e.target.value)}
                    required
                  >
                    <option value="">Year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <span className="mpf-dob-hint">Select your date of birth (You must be 18+)</span>
              </div>
            </div>

            <div className="mpf-form-actions">
              <button 
                type="submit" 
                className="mpf-submit-btn"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : isExistingProfile ? 'Update Profile' : 'Create Profile'}
              </button>
              {onCancel && (
                <button 
                  type="button" 
                  className="mpf-cancel-btn"
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

export default Myprofile