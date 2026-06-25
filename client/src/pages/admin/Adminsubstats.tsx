import './adminsubstats.css'
import { financeStatData } from './data/subcarddata'
import Substatscard from '../../components/superadmin/Substatscard'
function Adminsubstats() {
  return (
     <div className="overall-sub-stats-container">
          {financeStatData.map((item, index) => (
            <Substatscard key={index} data={item} />
          ))}
        </div>
  )
}

export default Adminsubstats