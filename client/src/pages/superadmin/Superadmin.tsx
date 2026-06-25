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
import Superadmindash from '../../components/superadmin/Superadmindash';
import Superadminusers from './Superadminusers';
import Superadminsettings from './Superadminsettings';
import Superadminfinances from './Superadminfinances';
import Profile from './Profile';

function Superadmin() {
  const [mount, ismounted] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [dash,isdashmount]=useState(true)
  const [users,isusersmount]=useState(false)
  const [settings,isSettings]=useState(false)
  const [finances,isFinances]=useState(false)
  const [profile,isprofile]=useState(false)

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth > 1020);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const sidebarVisible = isLargeScreen ? true : mount;

  return (
    <div className="overall-superadmin-container">

      {/* Sidebar */}
      <div
        style={{ visibility: sidebarVisible ? "visible" : "hidden" }}
        className="left-side-dashboard-sidebar"
      >
        <div className="sidebar-header-container-dashboard">
          <div className="brandname-container">
            <h3 style={{cursor:"pointer"}} onClick={()=>{isdashmount(true);isusersmount(false);isSettings(false);isFinances(false);ismounted(!mount)}}>Hookiefy</h3>
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
            <div onClick={()=>{isdashmount(true);isusersmount(false);isSettings(false);isFinances(false);isprofile(false);ismounted(!mount)}} className={dash?"sidebar_link active-sidebar":"sidebar_link"}><MdOutlineSpaceDashboard /> Dashboard</div>
            <div onClick={()=>{isdashmount(false);isusersmount(true);isSettings(false);isFinances(false);isprofile(false);ismounted(!mount)}}className={users?"sidebar_link active-sidebar":"sidebar_link"}><FaUsers /> Users</div>
            <div onClick={()=>{isdashmount(false);isusersmount(false);isSettings(false);isFinances(true);isprofile(false);ismounted(!mount)}}className={finances?"sidebar_link active-sidebar":"sidebar_link"}><FcMoneyTransfer /> Finances</div>
            <div onClick={()=>{isdashmount(false);isusersmount(false);isSettings(true);isFinances(false);isprofile(false);ismounted(!mount)}}className={settings?"sidebar_link active-sidebar":"sidebar_link"}><CiSettings /> Settings</div>
            <div onClick={()=>{isdashmount(false);isusersmount(false);isSettings(false);isFinances(false);isprofile(true);ismounted(!mount)}}className={profile?"sidebar_link active-sidebar":"sidebar_link"}><ImProfile /> profile</div>
            
          </ul>

          {/* 👇 ONLY IMPROVED FOOTER */}
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
            {users && <h3 style={{cursor:"pointer"}}><span onClick={()=>{isdashmount(true);isusersmount(false);isSettings(false);isFinances(false);ismounted(!mount)}}>Dashboard/</span>users</h3>}
            {settings && <h3 style={{cursor:"pointer"}}><span onClick={()=>{isdashmount(true);isusersmount(false);isSettings(false);isFinances(false);ismounted(!mount)}}>Dashboard/</span>settings</h3>}
            {finances && <h3 style={{cursor:"pointer"}}><span onClick={()=>{isdashmount(true);isusersmount(false);isSettings(false);isFinances(false);ismounted(!mount)}}>Dashboard/</span>finances</h3>}
          </div>

          <div className="right-side-header-body-container">
            <ul>
              <li><FaRegMessage /></li>
              <li><MdNotificationsNone className='fs-1' /></li>

              <li className="current-user">
                <div className="icon-image-holder rounded-circle"></div>
                <h5>Davis Ikou</h5>

                <div className="user-dropdown">
                  <button className="dropdown-btn">▼</button>

                  <div className="dropdown-menu-custom">
                    <button className="dropdown-item-custom">Profile</button>
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
          {settings && <Superadminsettings/>}
          {finances && <Superadminfinances/>}
          {profile && <Profile/>}
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