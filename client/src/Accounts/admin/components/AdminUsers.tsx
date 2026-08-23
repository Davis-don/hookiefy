// AdminUsers.tsx
// ============================================================
// AdminUsers.tsx - Admin Users Management
// ============================================================

import './AdminUsers.css'
import { IoMdAdd } from "react-icons/io";
import { FaUsersLine } from "react-icons/fa6";
import { useState } from 'react';
import Addadminuserform from './Addadminuserform';
import Fetchalladminusers from './Fetchalladminusers';

function AdminUsers() {
  const [showAddUser, setShowAddUser] = useState(false);

  const toggleView = () => {
    setShowAddUser(!showAddUser);
  };

  return (
    <div className="overall-admin-users-container">
      {/* Header with Title and Toggle Button */}
      <div className="admin-users-header">
        <div className="admin-users-header-left">
          <h2 className="admin-users-title">User Management</h2>
        </div>
        <div className="admin-users-header-right">
          <button 
            className="admin-users-toggle-btn" 
            onClick={toggleView}
            title={showAddUser ? 'View Users' : 'Add User'}
          >
            {showAddUser ? (
              <FaUsersLine className="admin-users-toggle-icon" />
            ) : (
              <IoMdAdd className="admin-users-toggle-icon" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-users-content">
        {showAddUser ? (
          <Addadminuserform />
        ) : (
          <Fetchalladminusers />
        )}
      </div>
    </div>
  );
}

export default AdminUsers;