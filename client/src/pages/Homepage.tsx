import './homepage.css'
import Hero from '../components/homepagehero/Hero'
import Ninche from '../components/Ninche/Ninche'
function Homepage() {
  return (
    <div className="overall-homepage-container">
      <Hero />
      <Ninche />
    </div>
  )
}

export default Homepage