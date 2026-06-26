import './connectionrequest.css'
import Connectionrequestpreview from './Connectionrequestpreview'
import { connectionRequests } from './data/connectionrequest'
import { usePreviewStore } from './store/connectpreview'

function Connectionrequest() {
  const { openPreview } = usePreviewStore();

  const handlePreviewClick = (senderId: string) => {
    openPreview(senderId);
  };

  if (connectionRequests.length === 0) {
    return (
      <div className="ovrall-connection-request-container">
        <div className="conn-req-empty">
          <div className="conn-req-empty-icon">📭</div>
          <div className="conn-req-empty-title">No connection requests</div>
          <div className="conn-req-empty-sub">When someone sends you a hookup request, it will appear here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ovrall-connection-request-container">
      {connectionRequests.map((request) => (
        <Connectionrequestpreview 
          key={request.id}
          request={request}
          onClick={() => handlePreviewClick(request.senderId)}
        />
      ))}
    </div>
  )
}

export default Connectionrequest