import './substatscard.css'
import type { IconType } from 'react-icons';
import 'bootstrap/dist/css/bootstrap.min.css'

interface StatData {
  icon: IconType;
  title: string;
  value: string | number; // Changed to accept both string and number
  percentage: number;
  trendIcon: IconType;
  color: string;
  trendcolor: string;
}

interface SubstatscardProps {
  data: StatData;
}

function Substatscard({ data }: SubstatscardProps) {
  const Icon = data.icon;
  const TrendIcon = data.trendIcon;

  return (
    <div className="overall-sub-stats-card">
      <div className="card-header-stat-sub-card">
        <div
          style={{ backgroundColor: data.color }}
          className="icon-container-stat-card rounded-circle"
        >
          <Icon />
        </div>

        <div className="title-stat-sub">
          {data.title}
        </div>
      </div>

      <div className="card-footer-sub-card">
        <div className="left-side-sub-footer-card">
          {data.value}
        </div>

        <div className="right-side-sub-footer-card">
          <p style={{ color: data.trendcolor }}>
            <span>{Math.abs(data.percentage)}%</span>
            <span><TrendIcon /></span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Substatscard;