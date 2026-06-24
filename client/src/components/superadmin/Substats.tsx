import './substats.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { statData } from './subcarddata'
import Substatscard from './Substatscard'

function Substats() {
  return (
    <div className="overall-sub-stats-container">
      {statData.map((item, index) => (
        <Substatscard key={index} data={item} />
      ))}
    </div>
  )
}

export default Substats