import './homepage.css'
import Hero from '../../components/common/homepage/Hero'
import Howto from '../../components/common/homepage/Howto'
function Homepage() {
  return (
    <div className="overall-homepage-container">
      <Hero />
      <Howto />
    </div>
  )
}

export default Homepage