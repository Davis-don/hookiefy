import './fetchallusers.css'
import Usertablefetch from './Usertablefetch'
import { useState } from 'react'
import { FiSearch, FiFilter } from 'react-icons/fi'

function FetchallUsers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [searchType, setSearchType] = useState('all')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRole(e.target.value)
  }

  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchType(e.target.value)
  }

  return (
    <div className="fau-main-container">
      <div className="fau-header-container">
        <div className="fau-header-left">
          <h2>Users</h2>
        </div>
        <div className="fau-header-right">
          <div className="fau-search-filter-container">
            <div className="fau-search-wrapper">
              <FiSearch className="fau-search-icon" />
              <input
                type="text"
                placeholder="What are you looking for?"
                value={searchTerm}
                onChange={handleSearch}
                className="fau-search-input"
              />
            </div>
            <div className="fau-filter-wrapper">
              <select
                className="fau-filter-select"
                value={searchType}
                onChange={handleSearchTypeChange}
              >
                <option value="all">Search All</option>
                <option value="name">Search by Name</option>
                <option value="email">Search by Email</option>
                <option value="phone">Search by Phone</option>
                <option value="role">Search by Role</option>
              </select>
            </div>
            <div className="fau-filter-wrapper">
              <FiFilter className="fau-filter-icon" />
              <select
                className="fau-role-filter"
                value={selectedRole}
                onChange={handleRoleChange}
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="fau-table-body">
        <Usertablefetch 
          searchTerm={searchTerm}
          selectedRole={selectedRole}
          searchType={searchType}
        />
      </div>
    </div>
  )
}

export default FetchallUsers