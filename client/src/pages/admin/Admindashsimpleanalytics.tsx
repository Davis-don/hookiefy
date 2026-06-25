import './admindashsimpleanalytics.css'
import Clientwiserevenue from './Clientwiserevenue'
import Clientrevenuevalue from './Clientrevenuevalue'

function Admindashsimpleanalytics() {
  return (
    <div className="ada-overall-container">
      <div className="ada-left-card">
        <Clientwiserevenue/>
      </div>
      <div className="ada-right-card">
        <Clientrevenuevalue/>
      </div>
    </div>
  )
}

export default Admindashsimpleanalytics