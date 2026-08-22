import './search.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Searchfeed from './Searchfeed'
import Serchedentities from './Serchedentities'
import { useState } from 'react'
import Serchfeeddetail from './Serchfeeddetail'
import useSearchFeedStore from '../store/sechfeed'

function Search() {
  const [mountFeed, setmountFeed] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { isMounted, selectedUserId } = useSearchFeedStore()

  // If a user is selected from the search feed, show the detail view
  if (isMounted && selectedUserId) {
    return <Serchfeeddetail />
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    // If there's a search term, switch to search results view
    if (value.trim().length > 0) {
      setmountFeed(false)
    } else {
      // If search is cleared, switch back to feed
      setmountFeed(true)
    }
  }

  // Handle cancel button click
  const handleCancel = () => {
    setSearchTerm('')
    setmountFeed(true)
  }

  return (
    <div className="overall-search-user-container">
      <div className="top-users-search-container">
        <div className={`serch-input-container ${!mountFeed ? 'with-cancel' : ''}`}>
          <input 
            onClick={() => {
              // If clicking on input and it's empty, stay on feed
              if (searchTerm.trim().length === 0) {
                setmountFeed(true)
              }
            }}
            onChange={handleSearchChange}
            value={searchTerm}
            type="text" 
            className="form-control search-input" 
            placeholder="Search users..."
          />
        </div>
        {!mountFeed && (
          <div className="cancel-button">
            <button onClick={handleCancel} className='btn text-light search-cancel-button'>
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="bottom-users-search-container">
        {mountFeed ? (
          <Searchfeed />
        ) : (
          <Serchedentities searchTerm={searchTerm} />
        )}
      </div>
    </div>
  )
}

export default Search