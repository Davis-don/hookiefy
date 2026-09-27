import './subscription.css'
import Premiumexpire from '../Premiumexpire'
import Plans from './Plans'

function Subscription() {
  return (
    <div className="overall-subscription-container">
   <Premiumexpire/>
   <Plans/>
    </div>
  )
}

export default Subscription