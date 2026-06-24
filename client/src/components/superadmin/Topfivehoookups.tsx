import { hookupData } from '../../data/hookupdata'
import './topfivehookup.css'

function Topfivehoookups() {
  // Handle view action
  const handleView = (hookupId: string) => {
    alert(`View details for hookup: ${hookupId}`)
  }

  // Get status color class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed'
      case 'pending':
        return 'status-pending'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return ''
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`
  }

  return (
    <div className="overall-top-five-hookups-concern">
      <div className="hookup-table-header">
        <h3>Recent Hookups</h3>
        <span className="hookup-count">{hookupData.length} records</span>
      </div>

      <div className="hookup-table-wrapper">
        <table className="hookup-table">
          <thead>
            <tr>
              <th>Hookup ID</th>
              <th>Buyer ID</th>
              <th>Seller ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hookupData.map((hookup) => (
              <tr key={hookup.hookupId}>
                <td className="hookup-id-cell">{hookup.hookupId.substring(0, 8)}...</td>
                <td>{hookup.serviceBuyerId}</td>
                <td>{hookup.sellerId}</td>
                <td className="amount-cell">{formatCurrency(hookup.amount)}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(hookup.status)}`}>
                    {hookup.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="view-btn"
                    onClick={() => handleView(hookup.hookupId)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Topfivehoookups