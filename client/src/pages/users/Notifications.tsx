import "./notification.css";
import { useState } from "react";
import Connectionrequest from "./Connectionrequest";
import Youractivity from "./Youractivity";
import Connectionrequestdetail from "./Connectionrequestdetail";
import Youractivitydetail from "./Youractivitydetail";
import { usePreviewStore } from "./store/connectpreview";

function Notifications() {
  const [activeTab, setActiveTab] = useState<"requests" | "activity">(
    "requests"
  );

  const { isMount, isActivityMount } = usePreviewStore();

  // Connection Request Preview
  if (isMount) {
    return (
      <div className="notif-wrapper">
        <Connectionrequestdetail />
      </div>
    );
  }

  // Activity Preview
  if (isActivityMount) {
    return (
      <div className="notif-wrapper">
        <Youractivitydetail />
      </div>
    );
  }

  return (
    <div className="notif-wrapper">
      <div className="notif-header">
        <div className="notif-header-top">
          <h2>Notifications</h2>
        </div>

        <div className="notif-tabs">
          <button
            className={`notif-tab-btn ${
              activeTab === "requests" ? "notif-tab-active" : ""
            }`}
            onClick={() => setActiveTab("requests")}
          >
            <span>Connection Requests</span>
            {activeTab === "requests" && (
              <span className="notif-tab-indicator"></span>
            )}
          </button>

          <button
            className={`notif-tab-btn ${
              activeTab === "activity" ? "notif-tab-active" : ""
            }`}
            onClick={() => setActiveTab("activity")}
          >
            <span>Your Activity</span>
            {activeTab === "activity" && (
              <span className="notif-tab-indicator"></span>
            )}
          </button>
        </div>
      </div>

      <div className="notif-body">
        {activeTab === "requests" ? (
          <Connectionrequest />
        ) : (
          <Youractivity />
        )}
      </div>
    </div>
  );
}

export default Notifications;