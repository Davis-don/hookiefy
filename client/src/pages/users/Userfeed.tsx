import './userfeed.css'
import Postsdiv from './Postsdiv'

function Userfeed() {
  return (
    <div className="overall-user-feed-container">
        <div className="user-feed">
      <div className="user-feed-header">
        <h4>Feed</h4>
        <div className="feed-header-actions">
          <button className="feed-header-btn">Following</button>
          <button className="feed-header-btn feed-header-active">For You</button>
        </div>
      </div>
    </div>
    <div className="user-feed-posts-data">
    <Postsdiv/>
    </div>
    </div>
  )
}

export default Userfeed