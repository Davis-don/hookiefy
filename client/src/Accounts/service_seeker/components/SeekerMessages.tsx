// SeekerMessages.tsx
import { FiMessageCircle } from 'react-icons/fi';
import './seekermessages.css';

const SeekerMessages = () => {
  return (
    <div className="ss-messages-page">
      <div className="ss-messages-header">
        <div>
          <h1 className="ss-messages-title">Messages</h1>
          <p className="ss-messages-subtitle">
            Chat with providers you're working with.
          </p>
        </div>
      </div>

      <div className="ss-messages-empty">
        <FiMessageCircle className="ss-messages-empty-icon" />
        <h3 className="ss-messages-empty-title">
          No messages yet
        </h3>
        <p className="ss-messages-empty-text">
          Once you reach out to a provider, your
          conversation will show up here.
        </p>
      </div>
    </div>
  );
};

export default SeekerMessages;