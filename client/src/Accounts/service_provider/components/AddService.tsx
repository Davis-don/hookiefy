import './addservice.css'
const AddService = () => {
  return (
    <div className="sp-page-container">
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Add New Service</h1>
          <p className="sp-page-subtitle">Create a new service offering for your customers.</p>
        </div>
      </div>

      <div className="sp-card">
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.875rem' }}>
              Service Name
            </label>
            <input
              type="text"
              placeholder="e.g., Home Cleaning"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--sp-border)',
                borderRadius: '10px',
                fontSize: '0.925rem',
                outline: 'none',
                transition: 'var(--sp-transition)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.875rem' }}>
              Description
            </label>
            <textarea
              placeholder="Describe your service..."
             
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--sp-border)',
                borderRadius: '10px',
                fontSize: '0.925rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.875rem' }}>
              Price
            </label>
            <input
              type="number"
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--sp-border)',
                borderRadius: '10px',
                fontSize: '0.925rem',
                outline: 'none',
              }}
            />
          </div>
          <button type="submit" className="sp-btn sp-btn-primary" style={{ alignSelf: 'flex-start' }}>
            ➕ Add Service
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddService;