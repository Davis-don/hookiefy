import './homepage.css'
import Hero from '../components/homepagehero/Hero'
import Ninche from '../components/Ninche/Ninche'
import Howitworks from '../components/Howitworks/Howitworks'
function Homepage() {
  return (
    <div className="overall-homepage-container">
      <Hero />
      <Ninche />
      <Howitworks />
    </div>
  )
}

export default Homepage