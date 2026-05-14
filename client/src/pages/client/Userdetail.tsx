import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaHeart, FaPaperPlane, FaTimes, FaRegHeart, FaUserPlus, FaMapMarkerAlt,  FaBriefcase, FaStar, FaCommentDots } from 'react-icons/fa';
import { useMutation } from '@tanstack/react-query';
import { toast } from '../../store/Toaststore';
import './userdetail.css'

interface UserDetailProps {
  profile: {
    id: string;
    name: string;
    age: number | null;
    gender: string | null;
    country: string | null;
    county: string | null;
    location: string | null;
    occupation: string | null;
    interests: string | null;
    image: string | null;
    info: string | null;
    hasImage: boolean;
    hasBio: boolean;
    completionPercentage: number;
  };
  onBack: () => void;
}

interface HookupResponse {
  message: string;
  data: {
    id: number;
    message: string;
    location: string;
    scheduled_time: string | null;
    approval_status: string;
  };
}

interface HookupError {
  error?: string;
  message?: string;
  non_field_errors?: string[];
}

interface HookupFormData {
  receiver_id: string;
  message: string;
  location: string;
  scheduled_time?: string;
}

const UserDetail: React.FC<UserDetailProps> = ({ profile, onBack }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHookupModal, setShowHookupModal] = useState(false);
  const [hookupMessage, setHookupMessage] = useState('');
  const [hookupLocation, setHookupLocation] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (showConfirmModal || showHookupModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showConfirmModal, showHookupModal]);

  const createHookupMutation = useMutation<HookupResponse, HookupError, HookupFormData>({
    mutationFn: async (data) => {
      const response = await fetch(`${apiUrl}/hookup/create-hookup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw responseData;
      }

      return responseData;
    },
    onSuccess: (data) => {
      toast.success(data.message || `Connection request sent to ${profile.name}!`, {
        title: '💕 Request Sent!',
        icon: '💌',
        duration: 5000,
      });
      setShowHookupModal(false);
      setShowConfirmModal(false);
      resetForm();
    },
    onError: (error: HookupError) => {
      if (error.error === 'You cannot hookup with yourself') {
        toast.warning(`You can't send a request to yourself!`, {
          title: '😳 Oops!',
          duration: 4000,
        });
      } 
      else if (error.message === 'A pending hookup already exists') {
        toast.info(`You've already sent a request to ${profile.name}!`, {
          title: '💌 Request Pending',
          duration: 5000,
        });
      }
      else if (error.error === 'Receiver not found') {
        toast.error(`${profile.name} is unavailable right now.`, {
          title: '😢 Oh no!',
          duration: 4000,
        });
      }
      else if (error.error) {
        toast.error(error.error, {
          title: '❌ Request Failed',
          duration: 5000,
        });
      }
      else if (error.non_field_errors && error.non_field_errors.length > 0) {
        toast.error(error.non_field_errors[0], {
          title: '❌ Request Failed',
          duration: 5000,
        });
      }
      else {
        toast.error('Something went wrong. Please try again!', {
          title: '😅 Oops!',
          duration: 5000,
        });
      }
    },
  });

  const resetForm = () => {
    setHookupMessage('');
    setHookupLocation('');
    setScheduledTime('');
  };

  const handleConnectClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmConnect = () => {
    setShowConfirmModal(false);
    setShowHookupModal(true);
  };

  const handleSendRequest = () => {
    if (!hookupMessage.trim()) {
      toast.warning('Please write a sweet message!', {
        title: '💬 Message Needed',
        duration: 3000,
      });
      return;
    }

    const formData: HookupFormData = {
      receiver_id: profile.id,
      message: hookupMessage.trim(),
      location: hookupLocation.trim(),
    };

    if (scheduledTime) {
      formData.scheduled_time = scheduledTime;
    }

    createHookupMutation.mutate(formData);
  };

  const getInitials = () => {
    return profile.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format location string
  const getLocationString = () => {
    if (profile.country && profile.county) {
      return `${profile.country}, ${profile.county}`;
    }
    if (profile.location) {
      return profile.location;
    }
    return 'Location not specified';
  };

  return (
    <div className="ud-page">
      {/* Header with Back Button Only */}
      <div className="ud-header">
        <button className="ud-back-btn" onClick={onBack}>
          <FaArrowLeft />
          <span>Back</span>
        </button>
        <div className="ud-header-info">
          <div className="ud-header-name">{profile.name}</div>
          <div className="ud-header-status">
            <span className="ud-status-dot"></span>
            Online
          </div>
        </div>
        <div className="ud-header-placeholder"></div>
      </div>

      {/* Profile Image Section - Telegram Style */}
      <div className="ud-profile-section">
        <div className="ud-profile-image-wrapper">
          {profile.hasImage && profile.image ? (
            <img 
              src={profile.image} 
              alt={profile.name} 
              className="ud-profile-image"
            />
          ) : (
            <div className="ud-profile-placeholder">
              <span className="ud-profile-initials">{getInitials()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Info Cards - Telegram Style */}
      <div className="ud-info-container">
        {/* Name & Basic Info Card */}
        <div className="ud-info-card">
          <div className="ud-info-name-section">
            <h1 className="ud-info-name">{profile.name}</h1>
            {profile.age && (
              <span className="ud-info-age">{profile.age} years</span>
            )}
          </div>
          
          {profile.gender && (
            <div className="ud-info-row">
              <span className="ud-info-icon">⚥</span>
              <span className="ud-info-text">{profile.gender}</span>
            </div>
          )}
          
          {getLocationString() !== 'Location not specified' && (
            <div className="ud-info-row">
              <FaMapMarkerAlt className="ud-info-icon" />
              <span className="ud-info-text">{getLocationString()}</span>
            </div>
          )}
        </div>

        {/* Occupation Card */}
        {profile.occupation && (
          <div className="ud-info-card">
            <div className="ud-info-row">
              <FaBriefcase className="ud-info-icon" />
              <div>
                <div className="ud-info-label">Occupation</div>
                <div className="ud-info-text-bold">{profile.occupation}</div>
              </div>
            </div>
          </div>
        )}

        {/* Interests Card */}
        {profile.interests && (
          <div className="ud-info-card">
            <div className="ud-info-row ud-interests-row">
              <FaStar className="ud-info-icon" />
              <div>
                <div className="ud-info-label">Interests</div>
                <div className="ud-info-tags">
                  {profile.interests.split(',').map((interest, index) => (
                    <span key={index} className="ud-interest-tag">
                      {interest.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bio Card */}
        <div className="ud-info-card ud-bio-card">
          <div className="ud-info-row">
            <FaCommentDots className="ud-info-icon" />
            <div>
              <div className="ud-info-label">About {profile.name.split(' ')[0]}</div>
              <div className="ud-bio-text">
                {profile.info || "✨ Still working on my bio! ✨"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Button - Fixed at Bottom */}
      <div className="ud-connect-footer">
        <button className="ud-connect-btn" onClick={handleConnectClick}>
          <FaUserPlus />
          <span>Send Connection Request</span>
          <FaHeart className="ud-connect-heart" />
        </button>
      </div>

      {/* Cute Confirmation Modal */}
      {showConfirmModal && (
        <>
          <div className="ud-modal-overlay" onClick={() => setShowConfirmModal(false)} />
          <div className="ud-modal ud-confirm-modal">
            <div className="ud-modal-content">
              <div className="ud-modal-emoji">😊💕</div>
              <div className="ud-modal-title">Ready to Connect?</div>
              <div className="ud-modal-message">
                <p>A connection request will be sent to <strong>{profile.name}</strong></p>
                <p className="ud-modal-blush">They'll be notified about your interest! 💕</p>
              </div>
              <div className="ud-modal-buttons">
                <button 
                  className="ud-modal-btn ud-modal-btn-cancel"
                  onClick={() => setShowConfirmModal(false)}
                >
                  <FaTimes />
                  Maybe Later
                </button>
                <button 
                  className="ud-modal-btn ud-modal-btn-confirm"
                  onClick={handleConfirmConnect}
                >
                  <FaRegHeart />
                  Yes, Connect!
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hookup Modal */}
      {showHookupModal && (
        <>
          <div className="ud-modal-overlay" onClick={() => setShowHookupModal(false)} />
          <div className="ud-modal ud-hookup-modal">
            <div className="ud-modal-header">
              <h3>Send a Message</h3>
              <button className="ud-modal-close" onClick={() => setShowHookupModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="ud-modal-recipient">
              <div className="ud-modal-avatar">
                {profile.hasImage && profile.image ? (
                  <img src={profile.image} alt={profile.name} />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </div>
              <span>To: <strong>{profile.name}</strong></span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSendRequest(); }}>
              <div className="ud-modal-field">
                <textarea
                  placeholder="Write a sweet message... 💕"
                  value={hookupMessage}
                  onChange={(e) => setHookupMessage(e.target.value)}
                  rows={4}
                  autoFocus
                />
              </div>

              <div className="ud-modal-field">
                <input
                  type="text"
                  placeholder="Where would you like to meet? (optional)"
                  value={hookupLocation}
                  onChange={(e) => setHookupLocation(e.target.value)}
                />
              </div>

              <div className="ud-modal-field">
                <input
                  type="datetime-local"
                  placeholder="Suggest a time (optional)"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="ud-modal-send"
                disabled={createHookupMutation.isPending || !hookupMessage.trim()}
              >
                {createHookupMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <FaPaperPlane />
                    Send Connection Request
                  </>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default UserDetail;