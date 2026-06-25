import './fetchalladminsclient.css'
import Adminclientfetch from './Adminclientfetch'
import { useState, useRef, useEffect } from 'react'
import { FiSearch, FiFilter, FiX, FiChevronDown } from 'react-icons/fi'

function Fetchalladminclients() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [showSearchTypeDropdown, setShowSearchTypeDropdown] = useState(false)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        if (!searchTerm) {
          setShowSearchInput(false)
        }
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

  const handleSearchTypeChange = (type: string) => {
    setSearchType(type)
    setShowSearchTypeDropdown(false)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
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
    <div className="fac-main-container">
      <div className="fac-header-container">
        <div className="fac-header-left">
          <h2>Clients</h2>
        </div>
        <div className="fac-header-right">
          {/* Filter bar - always in a row */}
          <div className="fac-search-filter-container">
            {/* Search Icon with popup input */}
            <div className="fac-icon-wrapper" ref={searchInputRef}>
              <button 
                className={`fac-icon-btn ${searchTerm ? 'fac-active' : ''}`}
                onClick={toggleSearchInput}
                title="Search"
              >
                <FiSearch />
              </button>
              {showSearchInput && (
                <div className="fac-popup-input">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="fac-search-input-popup"
                  />
                  {searchTerm && (
                    <FiX 
                      className="fac-popup-clear"
                      onClick={() => setSearchTerm('')}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Search Type Dropdown */}
            <div className="fac-icon-wrapper" ref={searchTypeDropdownRef}>
              <button 
                className={`fac-icon-btn ${searchType !== 'all' ? 'fac-active' : ''}`}
                onClick={() => setShowSearchTypeDropdown(!showSearchTypeDropdown)}
                title="Search by field"
              >
                <FiFilter />
                <FiChevronDown className="fac-dropdown-arrow" />
              </button>
              {showSearchTypeDropdown && (
                <div className="fac-dropdown-menu">
                  <button 
                    className={`fac-dropdown-item ${searchType === 'all' ? 'fac-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('all')}
                  >
                    All Fields
                  </button>
                  <button 
                    className={`fac-dropdown-item ${searchType === 'name' ? 'fac-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('name')}
                  >
                    Name
                  </button>
                  <button 
                    className={`fac-dropdown-item ${searchType === 'email' ? 'fac-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('email')}
                  >
                    Email
                  </button>
                  <button 
                    className={`fac-dropdown-item ${searchType === 'phone' ? 'fac-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('phone')}
                  >
                    Phone
                  </button>
                  <button 
                    className={`fac-dropdown-item ${searchType === 'company' ? 'fac-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('company')}
                  >
                    Company
                  </button>
                  <button 
                    className={`fac-dropdown-item ${searchType === 'industry' ? 'fac-selected' : ''}`}
                    onClick={() => handleSearchTypeChange('industry')}
                  >
                    Industry
                  </button>
                </div>
              )}
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || searchType !== 'all') && (
              <button 
                className="fac-clear-filters-btn"
                onClick={clearAllFilters}
                title="Clear all filters"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fac-table-body">
        <Adminclientfetch 
          searchTerm={searchTerm}
          searchType={searchType}
        />
      </div>
    </div>
  )
}

export default Fetchalladminclients