import './superadmindash.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Welcomeconcernsuperadmin from './Welcomeconcernsuperadmin'
import Substats from './Substats'

function Superadmindash() {
  return (
    <div className="overall-super-admin-dash-container">
      <div className="welcome-super-admin-dash-concern">
       <Welcomeconcernsuperadmin/>
      </div>
      <div className="statistics-cards-super-dash-container">
        <Substats/>
      </div>
    </div>
  )
}

export default Superadmindash