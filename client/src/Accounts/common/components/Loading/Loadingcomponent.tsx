import './loadingcomponent.css'
import Spinner from '../../../../components/Publicspinner/Spinner'

function Loadingcomponent() {
  return (
    
      <Spinner message="Loading content..." slowMessage="This is taking longer than expected…" slowAfter={4000} />
    
  )
}

export default Loadingcomponent