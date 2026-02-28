import React, { useState, useEffect } from 'react';

// Types for admin data
interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status?: 'active' | 'inactive';
  lastActive?: string;
}

const AllAdmins: React.FC = () => {
  // Sample data - replace with actual data from your backend
  const [admins] = useState<Admin[]>([
    { id: 1, name: 'Sarah Johnson', email: 'sarah@hookey.com', role: 'Senior Admin', avatar: '👩‍💼', status: 'active', lastActive: '2 min ago' },
    { id: 2, name: 'Michael Chen', email: 'michael@hookey.com', role: 'Admin Manager', avatar: '👨‍💼', status: 'active', lastActive: '15 min ago' },
    { id: 3, name: 'Emily Rodriguez', email: 'emily@hookey.com', role: 'Content Admin', avatar: '👩‍💻', status: 'active', lastActive: '1 hour ago' },
    { id: 4, name: 'David Kim', email: 'david@hookey.com', role: 'User Admin', avatar: '👨‍💻', status: 'inactive', lastActive: '2 days ago' },
    { id: 5, name: 'Lisa Thompson', email: 'lisa@hookey.com', role: 'Support Admin', avatar: '👩‍🔧', status: 'active', lastActive: '5 min ago' },
    { id: 6, name: 'James Wilson', email: 'james@hookey.com', role: 'Technical Admin', avatar: '👨‍🔧', status: 'active', lastActive: '30 min ago' },
  ]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>(admins);

  // Filter admins based on search term
  useEffect(() => {
    const filtered = admins.filter(admin => 
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAdmins(filtered);
  }, [searchTerm, admins]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const getStatusClass = (status?: string): string => {
    return status === 'active' ? 'hookey-superadmin-admin-status-active' : 'hookey-superadmin-admin-status-inactive';
  };

  return (
    <div className="hookey-superadmin-all-admins">
      <div className="hookey-superadmin-all-admins-header">
        <h3>All Administrators</h3>
        <div className="hookey-superadmin-admin-search">
          <input 
            type="text" 
            placeholder="Search admins..." 
            value={searchTerm}
            onChange={handleSearch}
            className="hookey-superadmin-admin-search-input"
          />
          <span className="hookey-superadmin-admin-search-icon">🔍</span>
        </div>
      </div>
      
      <div className="hookey-superadmin-admins-stats">
        <div className="hookey-superadmin-admin-stat">
          <span className="hookey-superadmin-admin-stat-number">{admins.length}</span>
          <span className="hookey-superadmin-admin-stat-label">Total Admins</span>
        </div>
        <div className="hookey-superadmin-admin-stat">
          <span className="hookey-superadmin-admin-stat-number">{admins.filter(a => a.status === 'active').length}</span>
          <span className="hookey-superadmin-admin-stat-label">Active</span>
        </div>
        <div className="hookey-superadmin-admin-stat">
          <span className="hookey-superadmin-admin-stat-number">{admins.filter(a => a.status === 'inactive').length}</span>
          <span className="hookey-superadmin-admin-stat-label">Inactive</span>
        </div>
      </div>

      {filteredAdmins.length === 0 ? (
        <div className="hookey-superadmin-no-admins">
          <p>No admins found matching your search</p>
          <span>💔</span>
        </div>
      ) : (
        <div className="hookey-superadmin-admins-grid">
          {filteredAdmins.map((admin: Admin) => (
            <div key={admin.id} className="hookey-superadmin-admin-card">
              <div className="hookey-superadmin-admin-card-header">
                <div className={`hookey-superadmin-admin-status ${getStatusClass(admin.status)}`}>
                  {admin.status === 'active' ? '●' : '○'}
                </div>
                <div className="hookey-superadmin-admin-avatar">
                  {admin.avatar}
                </div>
                <div className="hookey-superadmin-admin-card-actions">
                  <button className="hookey-superadmin-admin-edit-btn" title="Edit Admin">✏️</button>
                  <button className="hookey-superadmin-admin-delete-btn" title="Delete Admin">🗑️</button>
                </div>
              </div>
              <div className="hookey-superadmin-admin-info">
                <h4>{admin.name}</h4>
                <p className="hookey-superadmin-admin-email">{admin.email}</p>
                <span className="hookey-superadmin-admin-role">{admin.role}</span>
                <p className="hookey-superadmin-admin-lastactive">
                  Last active: {admin.lastActive}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllAdmins;