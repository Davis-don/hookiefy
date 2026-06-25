import './serachadmin.css'
import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

interface SearchadminProps {
  onSearch: (searchTerm: string, searchType: string) => void
}

function Searchadmin({ onSearch }: SearchadminProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('name')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    onSearch(value, searchType)
  }

  const handleSearchTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSearchType(value)
    onSearch(searchTerm, value)
  }

  const handleClear = () => {
    setSearchTerm('')
    onSearch('', searchType)
  }

  return (
    <div className="overall-serch-admin-container">
      <div className="search-admin-wrapper">
        <div className="search-admin-input-group">
          <div className="search-admin-icon-wrapper">
            <FiSearch className="search-admin-icon" />
          </div>
          <input
            type="text"
            className="search-admin-input"
            placeholder={`Search admins by ${searchType}...`}
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button 
              className="search-admin-clear-btn"
              onClick={handleClear}
            >
              ×
            </button>
          )}
        </div>
        
        <div className="search-admin-select-wrapper">
          <select 
            className="search-admin-select"
            value={searchType}
            onChange={handleSearchTypeChange}
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="adminId">Admin ID</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default Searchadmin