import './graphical-section-super-dash.css'
import Revenuesuperdashgraph from './Revenuesuperdashgraph'
import Adminsrevenuevalue from './Adminsrevenuevalue'

function Graphicalsectionsuperdash() {
  return (
    <div className="overall-graphical-dash-analysis-concern">
      <div className="left-side-revenue-graphical-dash">
        <Revenuesuperdashgraph/>
      </div>
      <div className="right-side-revenue-graphical-dash">
        <Adminsrevenuevalue/>
      </div>
    </div>
  )
}

export default Graphicalsectionsuperdash