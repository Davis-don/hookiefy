import './youractivity.css'
import Youractivitypreview from './Youractivitypreview'
import { yourActivities } from './data/youractivity'
import { usePreviewStore } from './store/connectpreview'

function Youractivity() {
  const { openActivityPreview } = usePreviewStore();

  // If no activity, show empty state
  if (yourActivities.length === 0) {
    return (
      <div className="overall-your-activity-container">
        <div className="your-activity-header">
          <h1>Your Activity</h1>
          <span className="your-activity-count">0</span>
        </div>
        <div className="your-activity-empty">
          <div className="your-activity-empty-icon">📋</div>
          <div className="your-activity-empty-title">No activity yet</div>
          <div className="your-activity-empty-sub">
            When you accept or decline a hookup request, it will appear here
          </div>
        </div>
      </div>
    );
  }

  const handlePreviewClick = (activityId: string) => {
    openActivityPreview(activityId);
  };

  return (
    <div className="overall-your-activity-container">
      <div className="your-activity-header">
        <h1>Your Activity</h1>
        <span className="your-activity-count">{yourActivities.length}</span>
      </div>
      <div className="your-activity-list">
        {yourActivities.map((activity) => (
          <Youractivitypreview 
            key={activity.id}
            activity={activity}
            onClick={() => handlePreviewClick(activity.senderId)}
          />
        ))}
      </div>
    </div>
  )
}

export default Youractivity