import './revenuebylocations.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import worldimage from '../../assets/images/images.jpeg';
import { locationsRevenue } from '../../data/topfvelocations';

const progressColors = [
  '#00E5FF',
  '#7B2FFC',
  '#00C853',
  '#FF9800',
  '#F44336',
  '#9C27B0',
  '#3F51B5',
  '#009688',
  '#E91E63',
  '#FFC107',
];

function Revenuebylocations() {
  return (
    <div className="overall-revenue-by-locations-concern">
      <div className="map-image-location">
        <img
          src={worldimage}
          alt="World Map"
        />
      </div>

      <div className="actual-locations-with-revenue">
        {locationsRevenue.map((location, index) => (
          <div
            className="location-revenue-item"
            key={location.location}
          >
            <div className="location-header">
              <span>{location.location}</span>

              <span>
                KSh {location.revenue.toLocaleString()}
              </span>
            </div>

            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{
                  width: `${location.percentage}%`,
                  backgroundColor:
                    progressColors[
                      index % progressColors.length
                    ],
                }}
                aria-valuenow={location.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {location.percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Revenuebylocations;