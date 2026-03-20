import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import Spinner from '../../components/protected/protectedspinner/Spinner';
import type { FormEvent, ChangeEvent } from 'react';
import './clientbioupload.css';

interface BioData {
  first_name: string;
  last_name: string;
  email: string;
  age: number;
  gender: string;
  country: string;
  county: string;
  location_desc: string;
  info: string;
  phone_number: string;
  occupation: string;
  interests: string;
  uploaded_img: string | null;
  uploaded_img_public_id: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface BioResponse {
  success: boolean;
  bio: BioData | null;
  message?: string;
}

interface UpdateBioData {
  age?: number;
  gender?: string;
  country?: string;
  county?: string;
  location_desc?: string;
  info?: string;
  phone_number?: string;
  occupation?: string;
  interests?: string;
}

interface ApiError {
  error?: string;
  age?: string[];
  gender?: string[];
  country?: string[];
  county?: string[];
  location_desc?: string[];
  info?: string[];
  phone_number?: string[];
  occupation?: string[];
  interests?: string[];
  non_field_errors?: string[];
}

// List of all countries
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South",
  "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// All counties in Kenya
const kenyaCounties = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta", "Garissa", "Wajir", "Mandera", "Marsabit",
  "Isiolo", "Meru", "Tharaka Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga",
  "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo Marakwet", "Nandi",
  "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia",
  "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
];

function Clientbioupload() {
  const queryClient = useQueryClient();
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('token');
  
  const [formData, setFormData] = useState<UpdateBioData>({});
  const [originalData, setOriginalData] = useState<UpdateBioData>({});
  const [errors, setErrors] = useState<Partial<Record<keyof UpdateBioData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch bio data
  const { 
    data: bioData, 
    isLoading: isLoadingBio, 
    error: bioError,
    refetch: refetchBio
  } = useQuery<BioResponse>({
    queryKey: ['clientBio'],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/client-img/client-bio/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    retry: false,
  });

  // Initialize form data when bio is loaded
  useEffect(() => {
    if (bioData?.bio) {
      const bio = bioData.bio;
      const initialData = {
        age: bio.age || undefined,
        gender: bio.gender || '',
        country: bio.country || 'Kenya',
        county: bio.county || '',
        location_desc: bio.location_desc || '',
        info: bio.info || '',
        phone_number: bio.phone_number || '',
        occupation: bio.occupation || '',
        interests: bio.interests || '',
      };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [bioData]);

  // Check for changes
  useEffect(() => {
    const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(hasUnsavedChanges);
  }, [formData, originalData]);

  // Update bio mutation
  const updateBioMutation = useMutation<BioResponse, ApiError, UpdateBioData>({
    mutationFn: async (updateData: UpdateBioData) => {
      const response = await fetch(`${apiUrl}/client-img/client-bio/update/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      return data;
    },
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      setHasChanges(false);
      setOriginalData({ ...formData });
      
      toast.success(data.message || 'Profile updated successfully! ✨', {
        duration: 5000,
      });
      
      // Refetch bio data
      queryClient.invalidateQueries({ queryKey: ['clientBio'] });
    },
    onError: (error: ApiError) => {
      setIsSubmitting(false);
      
      // Clear previous errors
      setErrors({});
      
      // Handle field-specific errors from server
      const fieldErrors: Partial<Record<keyof UpdateBioData, string>> = {};
      
      if (error.age) {
        const errorMsg = Array.isArray(error.age) ? error.age[0] : error.age;
        fieldErrors.age = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.gender) {
        const errorMsg = Array.isArray(error.gender) ? error.gender[0] : error.gender;
        fieldErrors.gender = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.country) {
        const errorMsg = Array.isArray(error.country) ? error.country[0] : error.country;
        fieldErrors.country = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.county) {
        const errorMsg = Array.isArray(error.county) ? error.county[0] : error.county;
        fieldErrors.county = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.location_desc) {
        const errorMsg = Array.isArray(error.location_desc) ? error.location_desc[0] : error.location_desc;
        fieldErrors.location_desc = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.info) {
        const errorMsg = Array.isArray(error.info) ? error.info[0] : error.info;
        fieldErrors.info = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.phone_number) {
        const errorMsg = Array.isArray(error.phone_number) ? error.phone_number[0] : error.phone_number;
        fieldErrors.phone_number = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.occupation) {
        const errorMsg = Array.isArray(error.occupation) ? error.occupation[0] : error.occupation;
        fieldErrors.occupation = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.interests) {
        const errorMsg = Array.isArray(error.interests) ? error.interests[0] : error.interests;
        fieldErrors.interests = errorMsg;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.non_field_errors) {
        const errorMsg = Array.isArray(error.non_field_errors) 
          ? error.non_field_errors[0] 
          : error.non_field_errors;
        toast.error(errorMsg, { duration: 6000 });
      }
      
      if (error.error) {
        toast.error(error.error, { duration: 6000 });
      }
      
      setErrors(fieldErrors);
    },
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof UpdateBioData;
    
    setFormData(prev => ({ ...prev, [key]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateBioData, string>> = {};
    
    // Age validation
    if (formData.age !== undefined && formData.age !== null) {
      if (formData.age < 18) {
        newErrors.age = 'Age must be at least 18 years';
      } else if (formData.age > 120) {
        newErrors.age = 'Age must be less than 120 years';
      }
    } else {
      newErrors.age = 'Age is required';
    }
    
    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }
    
    // Country validation
    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required';
    }
    
    // County validation
    if (!formData.county?.trim()) {
      newErrors.county = 'County/State is required';
    }
    
    // Location description validation
    if (!formData.location_desc?.trim()) {
      newErrors.location_desc = 'Location description is required';
    } else if (formData.location_desc.length > 500) {
      newErrors.location_desc = 'Location description must be less than 500 characters';
    }
    
    // Bio info validation
    if (!formData.info?.trim()) {
      newErrors.info = 'Bio information is required';
    } else if (formData.info.length > 1000) {
      newErrors.info = 'Bio must be less than 1000 characters';
    }
    
    // Phone number validation (optional)
    if (formData.phone_number && !/^[\d\s\+\-\(\)]{8,20}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number (e.g., +254 712 345 678)';
    }
    
    setErrors(newErrors);
    
    // Show first error as toast
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.warning(firstError, { duration: 5000 });
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Only send fields that have changed
    const changedData: UpdateBioData = {};
    Object.keys(formData).forEach((key) => {
      const typedKey = key as keyof UpdateBioData;
      if (formData[typedKey] !== originalData[typedKey]) {
        const value = formData[typedKey];
        (changedData as any)[typedKey] = value;
      }
    });
    
    if (Object.keys(changedData).length === 0) {
      toast.info('No changes to save', { duration: 3000 });
      return;
    }
    
    updateBioMutation.mutate(changedData);
  };

  if (isLoadingBio) {
    return (
      <div className="hcb-spinner-wrapper">
        <Spinner size="large" color="#c41e3a" message="Loading your profile..." />
      </div>
    );
  }

  if (bioError) {
    return (
      <div className="hcb-error-wrapper">
        <div className="hcb-error-icon">⚠️</div>
        <h3 className="hcb-error-title">Unable to Load Profile</h3>
        <p className="hcb-error-message">Please try refreshing the page</p>
        <button className="hcb-retry-button" onClick={() => refetchBio()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="hcb-main-container">
      {isSubmitting ? (
        <div className="hcb-spinner-wrapper">
          <Spinner size="large" color="#c41e3a" message="Saving changes..." />
        </div>
      ) : (
        <>
          <div className="hcb-header-section">
            <h2 className="hcb-page-title">💖 Manage Your Profile</h2>
            <p className="hcb-page-subtitle">Tell your story and find your perfect match ❤️</p>
          </div>
          
          <form onSubmit={handleSubmit} className="hcb-profile-form">
            <div className="hcb-two-column-layout">
              <div className="hcb-left-panel">
                {/* Age Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-age">
                    Age <span className="hcb-required-star">*</span>
                  </label>
                  <input 
                    type="number" 
                    id="hcb-age" 
                    name="age"
                    value={formData.age || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-input ${errors.age ? 'hcb-field-error' : ''}`} 
                    placeholder="e.g., 25, 30, 35"
                    min="18"
                    max="120"
                  />
                  <small className="hcb-field-hint">Must be 18 or older</small>
                  {errors.age && <div className="hcb-error-message">{errors.age}</div>}
                </div>

                {/* Gender Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-gender">
                    Gender <span className="hcb-required-star">*</span>
                  </label>
                  <select 
                    id="hcb-gender" 
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-select ${errors.gender ? 'hcb-field-error' : ''}`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="prefer_not_say">Prefer not to say</option>
                  </select>
                  {errors.gender && <div className="hcb-error-message">{errors.gender}</div>}
                </div>

                {/* Country Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-country">
                    Country <span className="hcb-required-star">*</span>
                  </label>
                  <select 
                    id="hcb-country" 
                    name="country"
                    value={formData.country || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-select ${errors.country ? 'hcb-field-error' : ''}`}
                  >
                    <option value="">Select country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && <div className="hcb-error-message">{errors.country}</div>}
                </div>

                {/* County Field - Only shows when Kenya is selected */}
                {formData.country === 'Kenya' && (
                  <div className="hcb-input-group">
                    <label className="hcb-field-label" htmlFor="hcb-county">
                      County <span className="hcb-required-star">*</span>
                    </label>
                    <select 
                      id="hcb-county" 
                      name="county"
                      value={formData.county || ''}
                      onChange={handleInputChange}
                      className={`hcb-field-select ${errors.county ? 'hcb-field-error' : ''}`}
                    >
                      <option value="">Select county</option>
                      {kenyaCounties.map(county => (
                        <option key={county} value={county}>{county}</option>
                      ))}
                    </select>
                    {errors.county && <div className="hcb-error-message">{errors.county}</div>}
                  </div>
                )}

                {/* County Input Field - For other countries */}
                {formData.country && formData.country !== 'Kenya' && (
                  <div className="hcb-input-group">
                    <label className="hcb-field-label" htmlFor="hcb-county">
                      County/State/Province <span className="hcb-required-star">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="hcb-county" 
                      name="county"
                      value={formData.county || ''}
                      onChange={handleInputChange}
                      className={`hcb-field-input ${errors.county ? 'hcb-field-error' : ''}`} 
                      placeholder="e.g., California, Ontario, Tokyo"
                    />
                    {errors.county && <div className="hcb-error-message">{errors.county}</div>}
                  </div>
                )}

                {/* Location Description Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-location">
                    Location Description <span className="hcb-required-star">*</span>
                  </label>
                  <textarea 
                    id="hcb-location" 
                    name="location_desc"
                    value={formData.location_desc || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-textarea ${errors.location_desc ? 'hcb-field-error' : ''}`} 
                    placeholder="e.g., Near JKIA Airport, Westlands area, 5 mins from City Mall"
                    rows={3}
                  />
                  <small className="hcb-char-count">
                    {formData.location_desc?.length || 0}/500 characters
                  </small>
                  {errors.location_desc && <div className="hcb-error-message">{errors.location_desc}</div>}
                </div>

                {/* Phone Number Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-phone">
                    Phone Number
                  </label>
                  <input 
                    type="tel" 
                    id="hcb-phone" 
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-input ${errors.phone_number ? 'hcb-field-error' : ''}`} 
                    placeholder="e.g., +254 712 345 678 or 0712 345 678"
                  />
                  <small className="hcb-field-hint">Format: +254 XXX XXX XXX or 07XX XXX XXX</small>
                  {errors.phone_number && <div className="hcb-error-message">{errors.phone_number}</div>}
                </div>
              </div>

              <div className="hcb-right-panel">
                {/* Occupation Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-occupation">
                    Occupation <span className="hcb-optional-badge">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    id="hcb-occupation" 
                    name="occupation"
                    value={formData.occupation || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-input ${errors.occupation ? 'hcb-field-error' : ''}`} 
                    placeholder="e.g., Software Engineer, Doctor, Entrepreneur"
                  />
                  {errors.occupation && <div className="hcb-error-message">{errors.occupation}</div>}
                </div>

                {/* Interests Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-interests">
                    Interests <span className="hcb-optional-badge">(Optional)</span>
                  </label>
                  <textarea 
                    id="hcb-interests" 
                    name="interests"
                    value={formData.interests || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-textarea ${errors.interests ? 'hcb-field-error' : ''}`} 
                    placeholder="e.g., Travel, Cooking, Hiking, Movies, Music, Fitness"
                    rows={3}
                  />
                  <small className="hcb-char-count">
                    {formData.interests?.length || 0}/1000 characters
                  </small>
                  {errors.interests && <div className="hcb-error-message">{errors.interests}</div>}
                </div>

                {/* Bio Info Field */}
                <div className="hcb-input-group">
                  <label className="hcb-field-label" htmlFor="hcb-bio">
                    What I want <span className="hcb-required-star">*</span>
                  </label>
                  <textarea 
                    id="hcb-bio" 
                    name="info"
                    value={formData.info || ''}
                    onChange={handleInputChange}
                    className={`hcb-field-textarea ${errors.info ? 'hcb-field-error' : ''}`} 
                    placeholder={`Example:
✨ Looking for someone special to share adventures with!
💕 Hoping to find a genuine connection - whether it's casual fun or something serious.
🎵 Love late-night conversations, spontaneous road trips, and good music.
😊 I'm easy-going, love to laugh, and believe in being real.
Let's see where this journey takes us!`}
                    rows={6}
                  />
                  <small className="hcb-char-count">
                    {formData.info?.length || 0}/1000 characters
                  </small>
                  <small className="hcb-field-hint">💡 Tip: Be authentic and specific about what you're looking for</small>
                  {errors.info && <div className="hcb-error-message">{errors.info}</div>}
                </div>

                {/* Submit Button */}
                <div className="hcb-button-wrapper">
                  <button 
                    type="submit" 
                    className={`hcb-submit-button ${hasChanges ? 'hcb-submit-active' : ''}`}
                    disabled={!hasChanges}
                  >
                    {hasChanges ? '💖 Save My Profile' : '✨ Profile Updated'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default Clientbioupload;