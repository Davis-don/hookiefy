import './admindash.css'
import Welcomeconcernsuperadmin from '../../components/superadmin/Welcomeconcernsuperadmin'
// import Admindashsimpleanalytics from './Admindashsimpleanalytics'
import Adminsubstats from './Adminsubstats'
import Moreanalysissuperadmindash from '../../components/superadmin/Moreanalysissuperadmindash'

function Admindash() {
  return (
    <div className="overall-admin-dash-container">
        <div className="welcome-super-admin-dash-concern">
       <Welcomeconcernsuperadmin/>
      </div>
       <div className="statistics-cards-super-dash-container">
        <Adminsubstats/>
      </div>
      {/* <div className="admin-dash-simple-analytics">
    <Admindashsimpleanalytics/>
      </div> */}
      <div className="more-analytics-section-superadmin">
    <Moreanalysissuperadmindash/>
      </div>
    </div>
  )
}

export default Admindash