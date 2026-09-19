// Stories.tsx — public stories feed with search/filter
import './stories.css'
import SearchPosts from './SearchPosts'

function Stories() {
  return (
    <div className="stories-root">
      <div className="stories-panel" role="region">
        <SearchPosts />
      </div>
    </div>
  )
}

export default Stories