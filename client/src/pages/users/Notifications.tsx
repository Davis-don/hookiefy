import "./notification.css";
import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authtokenstore';
import Connectionrequest from "./Connectionrequest";
import Youractivity from "./Youractivity";
import Connectionrequestdetail from "./Connectionrequestdetail";
import Youractivitydetail from "./Youractivitydetail";
import { usePreviewStore } from "./store/connectpreview";

interface NotificationsProps {
  onNavigateToSuccessfulConnections?: () => void;
}

// API calls for unread status
const fetchUnreadRequests = async (accessToken: string | null): Promise<boolean> => {
  if (!accessToken) return false;
  
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/notifications/has-unread-requests/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) return false;
  const data = await response.json();
  return data.has_unread_connection_requests;
};

const fetchUnreadActivity = async (accessToken: string | null): Promise<boolean> => {
  if (!accessToken) return false;
  
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/notifications/has-unread-activity/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) return false;
  const data = await response.json();
  return data.has_unread_activity;
};

function Notifications({ onNavigateToSuccessfulConnections }: NotificationsProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "activity">(
    "requests"
  );
  const { isMount, isActivityMount } = usePreviewStore();
  const { access: accessToken } = useAuthStore();

  // Fetch unread connection requests
  const { data: hasUnreadRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['hasUnreadRequests', accessToken],
    queryFn: () => fetchUnreadRequests(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch unread activity
  const { data: hasUnreadActivity, refetch: refetchActivity } = useQuery({
    queryKey: ['hasUnreadActivity', accessToken],
    queryFn: () => fetchUnreadActivity(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Refetch both when tab changes
  useEffect(() => {
    if (activeTab === 'requests') {
      refetchRequests();
    } else {
      refetchActivity();
    }
  }, [activeTab, refetchRequests, refetchActivity]);

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
            style={{ position: 'relative' }}
          >
            <span>Connection Requests</span>
            {hasUnreadRequests && (
              <span 
                className="notif-tab-dot"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '-8px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid #000000',
                  animation: 'pulse-dot 2s infinite',
                }}
              />
            )}
            {activeTab === "requests" && (
              <span className="notif-tab-indicator"></span>
            )}
          </button>

          <button
            className={`notif-tab-btn ${
              activeTab === "activity" ? "notif-tab-active" : ""
            }`}
            onClick={() => setActiveTab("activity")}
            style={{ position: 'relative' }}
          >
            <span>Your Activity</span>
            {hasUnreadActivity && (
              <span 
                className="notif-tab-dot"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '-8px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid #000000',
                  animation: 'pulse-dot 2s infinite',
                }}
              />
            )}
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
          <Youractivity onNavigateToSuccessfulConnections={onNavigateToSuccessfulConnections} />
        )}
      </div>
    </div>
  );
}

export default Notifications;