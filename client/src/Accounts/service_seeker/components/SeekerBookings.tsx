// SeekerBookings.tsx
import { FiInbox } from 'react-icons/fi';
import './seekerbookings.css';

const SeekerBookings = () => {
  return (
    <div className="ss-bookings-page">
      <div className="ss-bookings-header">
        <div>
          <h1 className="ss-bookings-title">My Bookings</h1>
          <p className="ss-bookings-subtitle">
            Everything you've booked with providers.
          </p>
        </div>
      </div>

      <div className="ss-bookings-empty">
        <FiInbox className="ss-bookings-empty-icon" />
        <h3 className="ss-bookings-empty-title">
          No bookings yet
        </h3>
        <p className="ss-bookings-empty-text">
          When you book a service, it'll show up here so
          you can track it.
        </p>
      </div>
    </div>
  );
};

export default SeekerBookings;