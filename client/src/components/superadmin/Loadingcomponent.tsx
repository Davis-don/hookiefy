import './loadingcomponent.css'

function Loadingcomponent() {
  return (
    <div className="overall-loading-component">
      <div className="loading-spinner-container">
        <div className="loading-spinner">
          <div className="loading-spinner-ring"></div>
          <div className="loading-spinner-ring"></div>
          <div className="loading-spinner-ring"></div>
          <div className="loading-spinner-ring"></div>
        </div>
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  )
}

export default Loadingcomponent