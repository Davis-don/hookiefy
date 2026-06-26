import './postsdiv.css'
import { posts } from './data/Posts'
import Postcard from './Postcard'

function Postsdiv() {
  return (
    <div className="overall-posts-container">
      {posts.map((post) => (
        <Postcard key={post.id} {...post} />
      ))}
    </div>
  )
}

export default Postsdiv