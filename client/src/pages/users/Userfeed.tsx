import './userfeed.css'
import Postsdiv from './Postsdiv'

function Userfeed() {
  return (
    <div className="overall-user-feed-container">
        <div className="user-feed">
      <div className="user-feed-header">
        <h4>Feed</h4>
      </div>
    </div>
    <div className="user-feed-posts-data">
    <Postsdiv/>
    </div>
    </div>
  )
}

export default Userfeed