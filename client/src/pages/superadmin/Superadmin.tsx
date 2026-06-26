import './superadmin.css'
import { FaRegMessage } from "react-icons/fa6";
import { MdNotificationsNone } from "react-icons/md";
import "bootstrap/dist/css/bootstrap.min.css";
import { IoMdClose } from "react-icons/io";
import { IoMdMenu } from "react-icons/io";
import { useState, useEffect } from 'react';
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { FaUsers } from "react-icons/fa";
import { CiSettings } from "react-icons/ci";
import { FcMoneyTransfer } from "react-icons/fc";
import { ImProfile } from "react-icons/im";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import Superadmindash from '../../components/superadmin/Superadmindash';
import Superadminusers from './Superadminusers';
import Superadminfinances from './Superadminfinances';
import Admincommissions from './Admincommissions';
import Profile from './Profile';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import Loadingcomponent from '../../components/superadmin/Loadingcomponent';

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

function Superadmin() {
  const { access: accessToken } = useAuthStore();
  
  const { 
    data: user, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const [mount, ismounted] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [dash, isdashmount] = useState(true)
  const [users, isusersmount] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [finances, isFinances] = useState(false)
  const [profile, isprofile] = useState(false)
  const [adminCommissions, setAdminCommissions] = useState(false)

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth > 1020);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const sidebarVisible = isLargeScreen ? true : mount;

  const clearAllStates = () => {
    isdashmount(false)
    isusersmount(false)
    isFinances(false)
    isprofile(false)
    setAdminCommissions(false)
  }

  const handleSettingsClick = () => {
    if (settingsOpen) {
      setSettingsOpen(false)
      if (adminCommissions) {
        setAdminCommissions(false)
        isdashmount(true)
      }
    } else {
      clearAllStates()
      setSettingsOpen(true)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="overall-superadmin-container">
        <div className="right-side-dashboard-body loading-container">
          <Loadingcomponent />
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="overall-superadmin-container">
        <div className="right-side-dashboard-body error-container">
          <div className="error-content">
            <div className="error-emoji">😅</div>
            <p className="error-message">
              {error instanceof Error ? error.message : 'Failed to load user data'}
            </p>
            <button className="error-retry-btn" onClick={() => refetch()}>
              🔄 Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No token available
  if (!accessToken) {
    return (
      <div className="overall-superadmin-container">
        <div className="right-side-dashboard-body no-token-container">
          <div className="no-token-content">
            <div className="no-token-emoji">🔒</div>
            <p className="no-token-message">Please login to continue</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'User';
  const profileImage = user?.profile_image_url || null;

  return (
    <div className="overall-superadmin-container">

      {/* Sidebar */}
      <div
        style={{ visibility: sidebarVisible ? "visible" : "hidden" }}
        className="left-side-dashboard-sidebar"
      >
        <div className="sidebar-header-container-dashboard">
          <div className="brandname-container">
            <h3 style={{cursor:"pointer"}} onClick={()=>{clearAllStates(); isdashmount(true); setSettingsOpen(false); ismounted(!mount)}}>Hookiefy</h3>
          </div>

          <div
            className="close-sidebar-btn"
            onClick={() => ismounted(!mount)}
          >
            <IoMdClose className='fs-1 text-light' />
          </div>
        </div>

        <div className="sidebar-body-container">

          <ul>
            <div onClick={()=>{clearAllStates(); setSettingsOpen(false); isdashmount(true); ismounted(!mount)}} className={dash?"sidebar_link active-sidebar":"sidebar_link"}>
              <MdOutlineSpaceDashboard /> Dashboard
            </div>
            
            <div onClick={()=>{clearAllStates(); setSettingsOpen(false); isusersmount(true); ismounted(!mount)}} className={users?"sidebar_link active-sidebar":"sidebar_link"}>
              <FaUsers /> Users
            </div>
            
            <div onClick={()=>{clearAllStates(); setSettingsOpen(false); isFinances(true); ismounted(!mount)}} className={finances?"sidebar_link active-sidebar":"sidebar_link"}>
              <FcMoneyTransfer /> Finances
            </div>
            
            <div onClick={()=>{clearAllStates(); setSettingsOpen(false); isprofile(true); ismounted(!mount)}} className={profile?"sidebar_link active-sidebar":"sidebar_link"}>
              <ImProfile /> Profile
            </div>

            {/* Settings with Sub-links */}
            <div className="settings-group">
              <div 
                onClick={handleSettingsClick}
                className={`sidebar_link ${settingsOpen || adminCommissions ? 'active-sidebar' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <CiSettings /> Settings
                <span className="settings-arrow">
                  {settingsOpen ? <IoIosArrowDown /> : <IoIosArrowForward />}
                </span>
              </div>
              
              {settingsOpen && (
                <div className="settings-sub-links">
                  <div 
                    onClick={() => {clearAllStates(); setAdminCommissions(true); ismounted(!mount)}}
                    className={`sidebar_sub_link ${adminCommissions ? 'active-sidebar-sub' : ''}`}
                  >
                    <span className="sub-link-dot"></span>
                    Commissions
                  </div>
                </div>
              )}
            </div>
          </ul>

          {/* Footer */}
          <div className="sidebar-body-footer">
            <div className="footer-content">
              <span className="footer-title">System</span>
              <span className="footer-sub">by Kinstry Systems</span>
            </div>
          </div>

        </div>
      </div>

      {/* Body */}
      <div className="right-side-dashboard-body">

        <div className="body-header-container">
          <div className="left-side-header-body-container">
            <h3
              onClick={() => ismounted(!mount)}
              className='menu-icon-dash'
            >
              <IoMdMenu className='fs-1' />
            </h3>

            {dash && <h3 style={{cursor:"pointer"}}>Dashboard</h3>}
            {users && <h3 style={{cursor:"pointer"}}><span onClick={()=>{clearAllStates(); setSettingsOpen(false); isdashmount(true); ismounted(!mount)}}>Dashboard/</span>Users</h3>}
            {finances && <h3 style={{cursor:"pointer"}}><span onClick={()=>{clearAllStates(); setSettingsOpen(false); isdashmount(true); ismounted(!mount)}}>Dashboard/</span>Finances</h3>}
            {profile && <h3 style={{cursor:"pointer"}}><span onClick={()=>{clearAllStates(); setSettingsOpen(false); isdashmount(true); ismounted(!mount)}}>Dashboard/</span>Profile</h3>}
            {adminCommissions && <h3 style={{cursor:"pointer"}}><span onClick={()=>{clearAllStates(); setSettingsOpen(false); isdashmount(true); ismounted(!mount)}}>Dashboard/</span>Commissions</h3>}
          </div>

          <div className="right-side-header-body-container">
            <ul>
              <li><FaRegMessage /></li>
              <li><MdNotificationsNone className='fs-1' /></li>

              <li className="current-user">
                <div className="icon-image-holder rounded-circle">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={displayName}
                      className="profile-avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h5>{displayName}</h5>

                <div className="user-dropdown">
                  <button className="dropdown-btn">▼</button>

                  <div className="dropdown-menu-custom">
                    <button onClick={()=>{clearAllStates(); setSettingsOpen(false); isprofile(true); ismounted(!mount)}} className="dropdown-item-custom">Profile</button>
                    <button className="dropdown-item-custom logout-btn">Logout</button>
                  </div>
                </div>
              </li>

            </ul>
          </div>
        </div>

        {/* Body content */}
        <div className="dashboard-body-content">
          {dash && <Superadmindash/>}
          {users && <Superadminusers/>}
          {finances && <Superadminfinances/>}
          {profile && <Profile/>}
          {adminCommissions && <Admincommissions/>}
        </div>

        {/* Footer */}
        <div className="dashboard-footer">
          <div className="footer-divider"></div>
          <div className="footer-content-bottom">
            <span className="footer-text">
              Developed by <span className="footer-highlight">Kinstry Systems</span>
            </span>
            <span className="footer-year">© {new Date().getFullYear()}</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Superadmin