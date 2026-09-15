import './messages.css'

const Messages = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Messages</h1>
          <p className="sp-page-subtitle">Chat with your customers.</p>
        </div>
      </div>

      <div className="sp-card">
        <p style={{ color: 'var(--sp-text-secondary)' }}>
          No messages yet. Customer conversations will appear here.
        </p>
      </div>
    </div>
  );
};

export default Messages;