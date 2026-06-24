import './usertablefetch.css'
import { useState } from 'react'
import { FiUser, FiUsers, FiShield, FiSearch } from 'react-icons/fi'
import { sampleUsers } from '../../data/allusers'
import type { User } from '../../data/allusers'

interface UsertablefetchProps {
  searchTerm: string
  selectedRole: string
  searchType: string
}

function Usertablefetch({ searchTerm, selectedRole, searchType }: UsertablefetchProps) {
  const [users, setUsers] = useState<User[]>(sampleUsers)

  // Filter users based on search term, role, and search type
  const filteredUsers = users.filter(user => {
    // Role filter
    if (selectedRole !== 'all' && user.role !== selectedRole) {
      return false
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      
      switch(searchType) {
        case 'name':
          return user.firstName.toLowerCase().includes(term) || 
                 user.lastName.toLowerCase().includes(term)
        case 'email':
          return user.email.toLowerCase().includes(term)
        case 'phone':
          return user.phone.includes(term)
        case 'role':
          return user.role.toLowerCase().includes(term)
        case 'all':
        default:
          return user.firstName.toLowerCase().includes(term) ||
                 user.lastName.toLowerCase().includes(term) ||
                 user.email.toLowerCase().includes(term) ||
                 user.phone.includes(term) ||
                 user.role.toLowerCase().includes(term)
      }
    }
    
    return true
  })

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin':
        return { color: '#00e5ff', icon: <FiShield />, label: 'Admin' }
      case 'superadmin':
        return { color: '#7b2ffc', icon: <FiShield />, label: 'Super Admin' }
      case 'user':
        return { color: '#00e676', icon: <FiUsers />, label: 'User' }
      default:
        return { color: '#b6f9ff', icon: <FiUser />, label: role }
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return 'fau-status-active'
      case 'inactive':
        return 'fau-status-inactive'
      default:
        return ''
    }
  }

  // Handle delete
  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== id))
    }
  }

  // Handle edit
  const handleEdit = (id: number) => {
    alert(`Edit user with ID: ${id}`)
  }

  // Get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  // Get avatar color
  const getAvatarColor = (role: string) => {
    switch(role) {
      case 'admin':
        return '#00e5ff'
      case 'superadmin':
        return '#7b2ffc'
      case 'user':
        return '#00e676'
      default:
        return '#b6f9ff'
    }
  }

  return (
    <div className="fau-table-wrapper">
      <table className="fau-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user) => {
            const roleBadge = getRoleBadge(user.role)
            return (
              <tr key={user.id}>
                <td>
                  <div className="fau-user-info">
                    <div 
                      className="fau-user-avatar"
                      style={{ background: getAvatarColor(user.role) }}
                    >
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    <div className="fau-user-name">
                      <span className="fau-full-name">{user.firstName} {user.lastName}</span>
                      <span className="fau-user-id">ID: {user.id}</span>
                    </div>
                  </div>
                </td>
                <td className="fau-email-cell">{user.email}</td>
                <td className="fau-phone-cell">{user.phone}</td>
                <td>
                  <span className="fau-role-badge" style={{ color: roleBadge.color }}>
                    {roleBadge.icon}
                    {roleBadge.label}
                  </span>
                </td>
                <td>
                  <span className={`fau-status-badge ${getStatusBadge(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td>
                  <div className="fau-action-buttons">
                    <button 
                      className="fau-action-btn fau-edit-btn"
                      onClick={() => handleEdit(user.id)}
                      title="Edit user"
                    >
                      E
                    </button>
                    <button 
                      className="fau-action-btn fau-delete-btn"
                      onClick={() => handleDelete(user.id)}
                      title="Delete user"
                    
                    >
                      D
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {filteredUsers.length === 0 && (
        <div className="fau-no-users-found">
          <FiSearch className="fau-no-users-icon" />
          <p>No users found matching your criteria</p>
        </div>
      )}
    </div>
  )
}

export default Usertablefetch