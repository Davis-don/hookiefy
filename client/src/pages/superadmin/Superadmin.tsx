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
import Superadmindash from '../../components/superadmin/Superadmindash';
import Superadminusers from './Superadminusers';
import Superadminsettings from './Superadminsettings';
import Superadminfinances from './Superadminfinances';

function Superadmin() {
  const [mount, ismounted] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [dash,isdashmount]=useState(true)
  const [users,isusersmount]=useState(false)
  const [settings,isSettings]=useState(false)
  const [finances,isFinances]=useState(false)

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
            <h3>Hookiefy</h3>
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
            <div onClick={()=>{isdashmount(true);isusersmount(false);isSettings(false);isFinances(false);ismounted(!mount)}} className={dash?"sidebar_link active-sidebar":"sidebar_link"}><MdOutlineSpaceDashboard /> Dashboard</div>
            <div onClick={()=>{isdashmount(false);isusersmount(true);isSettings(false);isFinances(false);ismounted(!mount)}}className={users?"sidebar_link active-sidebar":"sidebar_link"}><FaUsers /> Users</div>
            <div onClick={()=>{isdashmount(false);isusersmount(false);isSettings(true);isFinances(false);ismounted(!mount)}}className={settings?"sidebar_link active-sidebar":"sidebar_link"}><CiSettings /> Settings</div>
            <div onClick={()=>{isdashmount(false);isusersmount(false);isSettings(false);isFinances(true);ismounted(!mount)}}className={finances?"sidebar_link active-sidebar":"sidebar_link"}><FcMoneyTransfer /> Finances</div>
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

            <h3>Dashboard</h3>
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
        {dash && <Superadmindash/>}
        {users && <Superadminusers/>}
        {settings && <Superadminsettings/>}
        {finances && <Superadminfinances/>}

      </div>
    </div>
  )
}

export default Superadmin