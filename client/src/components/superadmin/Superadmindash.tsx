import './superadmindash.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Welcomeconcernsuperadmin from './Welcomeconcernsuperadmin'
import Substats from './Substats'
import Graphicalsectionsuperdash from './Graphicalsectionsuperdash'
import Moreanalysissuperadmindash from './Moreanalysissuperadmindash'
import Revenuebygender from './Revenuebygender'

function Superadmindash() {
  return (
    <div className="overall-super-admin-dash-container">
      <div className="welcome-super-admin-dash-concern">
       <Welcomeconcernsuperadmin/>
      </div>
      <div className="statistics-cards-super-dash-container">
        <Substats/>
      </div>
      <div className="graphical-rep-stats-superadmin-container">
     <Graphicalsectionsuperdash/>
      </div>
      <div className="more-analytics-section-superadmin">
    <Moreanalysissuperadmindash/>
      </div>
      <div className="revenue-by-gender-container">
    <Revenuebygender/>
      </div>
    </div>
  )
}

export default Superadmindash