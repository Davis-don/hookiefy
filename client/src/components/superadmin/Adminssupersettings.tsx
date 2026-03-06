/* Adminssupersettings.tsx - Main Component */
import './adminsupersettings.css';
import { IoMdAdd } from "react-icons/io";
import { FaCog } from "react-icons/fa";
import 'bootstrap/dist/css/bootstrap.min.css';
import AddConfig from './Addconfig';
import AllConfigs from './Allconfig';
import { useState } from 'react';

function Adminssupersettings() {
  const [showAddConfig, setShowAddConfig] = useState(false);

  return (
    <div className="overall-admins-supersettings-container">
      <div className="supersettings-header-section">
        <div className="left-side-supersettings-header">
          <h2>Admin Super Settings</h2>
          <p>Configure commission rates for your admins ❤️</p>
        </div>
        <div className="right-side-supersettings-header">
          {!showAddConfig ? (
            <button 
              onClick={() => setShowAddConfig(!showAddConfig)} 
              className="btn-romantic-primary"
            >
              <IoMdAdd /> Create Config
            </button>
          ) : (
            <button 
              onClick={() => setShowAddConfig(!showAddConfig)} 
              className="btn-romantic-secondary"
            >
              <FaCog /> All Configs
            </button>
          )}
        </div>
      </div>

      <div className="render-supersettings-data-container">
        {showAddConfig ? <AddConfig /> : <AllConfigs />}
      </div>
    </div>
  );
}

export default Adminssupersettings;