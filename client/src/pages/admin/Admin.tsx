import { FaRegMessage } from "react-icons/fa6";
import { MdNotificationsNone } from "react-icons/md";
import "bootstrap/dist/css/bootstrap.min.css";
import { IoMdClose } from "react-icons/io";
import { IoMdMenu } from "react-icons/io";
import { useState, useEffect } from 'react';

function Admin() {
  const [mount, ismounted] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth > 1020); // 63.75em ≈ 1020px
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // final computed visibility
  const sidebarVisible = isLargeScreen ? true : mount;

  return (
    <div className="overall-superadmin-container">
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
      </div>

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
                    <button className="dropdown-item-custom">
                      Profile
                    </button>

                    <button className="dropdown-item-custom logout-btn">
                      Logout
                    </button>
                  </div>
                </div>
              </li>

            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin