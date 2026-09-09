// Notifications.tsx
import "./notification.css";
import { useState, useEffect, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authtokenstore';
import Connectionrequest from "./Connectionrequest";
import Youractivity from "./Youractivity";
import Connectionrequestdetail from "./Connectionrequestdetail";
import Youractivitydetail from "./Youractivitydetail";
import { usePreviewStore } from "../store/connectpreview"

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
  const [activeTab, setActiveTab] = useState<"requests" | "activity">("requests");
  const { isMount, isActivityMount } = usePreviewStore();
  const { access: accessToken } = useAuthStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Fetch unread connection requests
  const { data: hasUnreadRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['hasUnreadRequests', accessToken],
    queryFn: () => fetchUnreadRequests(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Fetch unread activity
  const { data: hasUnreadActivity, refetch: refetchActivity } = useQuery({
    queryKey: ['hasUnreadActivity', accessToken],
    queryFn: () => fetchUnreadActivity(accessToken),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Refetch both when tab changes
  useEffect(() => {
    if (activeTab === 'requests') {
      refetchRequests();
    } else {
      refetchActivity();
    }
  }, [activeTab, refetchRequests, refetchActivity]);

  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  // Update header height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Connection Request Preview
  if (isMount) {
    return (
      <div className="notif-container">
        <Connectionrequestdetail />
      </div>
    );
  }

  // Activity Preview
  if (isActivityMount) {
    return (
      <div className="notif-container">
        <Youractivitydetail />
      </div>
    );
  }

  return (
    <div className="notif-container">
      {/* Fixed Header */}
      <div className="notif-header-sticky" ref={headerRef}>
        <div className="notif-header-inner">
          <div className="notif-header-top">
            <h2 className="notif-title">Notifications</h2>
          </div>

          <div className="notif-tabs-wrapper">
            <button
              className={`notif-tab-btn ${
                activeTab === "requests" ? "notif-tab-active" : ""
              }`}
              onClick={() => setActiveTab("requests")}
            >
              <span className="notif-tab-text">Connection Requests</span>
              {hasUnreadRequests && (
                <span className="notif-tab-dot" />
              )}
              {activeTab === "requests" && (
                <span className="notif-tab-indicator" />
              )}
            </button>

            <button
              className={`notif-tab-btn ${
                activeTab === "activity" ? "notif-tab-active" : ""
              }`}
              onClick={() => setActiveTab("activity")}
            >
              <span className="notif-tab-text">Your Activity</span>
              {hasUnreadActivity && (
                <span className="notif-tab-dot" />
              )}
              {activeTab === "activity" && (
                <span className="notif-tab-indicator" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Body - Hidden Scrollbar */}
      <div 
        className="notif-body-scroll"
        style={{ paddingTop: `${headerHeight + 20}px` }}
      >
        <div className="notif-body-content">
          {activeTab === "requests" ? (
            <Connectionrequest />
          ) : (
            <Youractivity onNavigateToSuccessfulConnections={onNavigateToSuccessfulConnections} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;