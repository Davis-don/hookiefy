import './fetchallusers.css'
import Usertablefetch from './Usertablefetch'
import { useState, useRef, useEffect } from 'react'
import { FiSearch, FiFilter, FiX, FiChevronDown } from 'react-icons/fi'

function FetchallUsers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [searchType, setSearchType] = useState('all')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        if (!searchTerm) {
          setShowSearchInput(false)
        }
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false)
      }
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setShowSearchTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchTerm])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleRoleChange = (role: string) => {
    setSelectedRole(role)
    setShowRoleDropdown(false)
  }

  const handleSearchTypeChange = (type: string) => {
    setSearchType(type)
    setShowSearchTypeDropdown(false)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedRole('all')
    setSearchType('all')
    setShowSearchInput(false)
  }

  const toggleSearchInput = () => {
    setShowSearchInput(!showSearchInput)
    if (!showSearchInput) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }

  return (
    <div className="fau-main-container">
      <div className="fau-header-container">
        <div className="fau-header-left">
          <h2>Users</h2>
        </div>
        <div className="fau-header-right">
          {/* Filter bar - always in a row */}
          <div className="fau-search-filter-container">
            {/* Search Icon with popup input */}
            <div className="fau-icon-wrapper" ref={searchInputRef}>
              <button 
                className={`fau-icon-btn ${searchTerm ? 'fau-active' : ''}`}
                onClick={toggleSearchInput}
                title="Search"
              >
                <FiSearch />
              </button>
              {showSearchInput && (
                <div className="fau-popup-input">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="fau-search-input-popup"
                  />
                  {searchTerm && (
                    <FiX 
                      className="fau-popup-clear"
                      onClick={() => setSearchTerm('')}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Search Type Dropdown */}
            <div className="fau-icon-wrapper" ref={searchTypeDropdownRef}>
              <button 
                className={`fau-icon-btn ${searchType !== 'all' ? 'fau-active' : ''}`}
                onClick={() => setShowSearchTypeDropdown(!showSearchTypeDropdown)}
                title="Search by field"
              >
                <FiFilter />
                <FiChevronDown className="fau-dropdown-arrow" />
              </button>
              {showSearchTypeDropdown && (
                <div className="fau-dropdown-menu">
                  <button 
                    className={`fau-dropdown-item ${searchType === 'all' ? 'fau-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('all')}
                  >
                    All Fields
                  </button>
                  <button 
                    className={`fau-dropdown-item ${searchType === 'name' ? 'fau-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('name')}
                  >
                    Name
                  </button>
                  <button 
                    className={`fau-dropdown-item ${searchType === 'email' ? 'fau-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('email')}
                  >
                    Email
                  </button>
                  <button 
                    className={`fau-dropdown-item ${searchType === 'phone' ? 'fau-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('phone')}
                  >
                    Phone
                  </button>
                  <button 
                    className={`fau-dropdown-item ${searchType === 'role' ? 'fau-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('role')}
                  >
                    Role
                  </button>
                </div>
              )}
            </div>

            {/* Role Dropdown */}
            <div className="fau-icon-wrapper" ref={roleDropdownRef}>
              <button 
                className={`fau-icon-btn ${selectedRole !== 'all' ? 'fau-active' : ''}`}
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                title="Filter by role"
              >
                <FiFilter />
                <FiChevronDown className="fau-dropdown-arrow" />
              </button>
              {showRoleDropdown && (
                <div className="fau-dropdown-menu">
                  <button 
                    className={`fau-dropdown-item ${selectedRole === 'all' ? 'fau-selected' : ''}`}
                    onClick={() => handleRoleChange('all')}
                  >
                    All Roles
                  </button>
                  <button 
                    className={`fau-dropdown-item ${selectedRole === 'user' ? 'fau-selected' : ''}`}
                    onClick={() => handleRoleChange('user')}
                  >
                    User
                  </button>
                  <button 
                    className={`fau-dropdown-item ${selectedRole === 'admin' ? 'fau-selected' : ''}`}
                    onClick={() => handleRoleChange('admin')}
                  >
                    Admin
                  </button>
                  <button 
                    className={`fau-dropdown-item ${selectedRole === 'superadmin' ? 'fau-selected' : ''}`}
                    onClick={() => handleRoleChange('superadmin')}
                  >
                    Super Admin
                  </button>
                </div>
              )}
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || selectedRole !== 'all' || searchType !== 'all') && (
              <button 
                className="fau-clear-filters-btn"
                onClick={clearAllFilters}
                title="Clear all filters"
              >
                <FiX />
              </button>
            )}
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