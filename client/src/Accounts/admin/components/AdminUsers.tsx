// components/AdminUsers.tsx
// ============================================================
// AdminUsers.tsx - User Management for Admin
// ============================================================

import React, { useState } from 'react';
import './AdminUsers.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joined: string;
}

const AdminUsers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'User', status: 'active', joined: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active', joined: '2024-02-20' },
    { id: 3, name: 'Admin User', email: 'admin@example.com', role: 'Admin', status: 'active', joined: '2023-12-01' },
    { id: 4, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive', joined: '2024-03-10' },
    { id: 5, name: 'Alice Brown', email: 'alice@example.com', role: 'User', status: 'pending', joined: '2024-04-05' },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role.toLowerCase() === filterRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  return (
    <div className="admin-users-container">
      <div className="admin-users-header">
        <h2>User Management</h2>
        <p className="admin-users-subtitle">Manage platform users</p>
      </div>

      <div className="admin-users-controls">
        <div className="admin-search-wrapper">
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <select 
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="admin-filter-select"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      <div className="admin-users-table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="admin-user-name">{user.name}</td>
                <td>{user.email}</td>
                <td><span className="admin-user-role">{user.role}</span></td>
                <td><span className={`admin-user-status ${getStatusColor(user.status)}`}>{user.status}</span></td>
                <td>{user.joined}</td>
                <td>
                  <button className="admin-action-btn edit">Edit</button>
                  <button className="admin-action-btn delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;