import './fetchalladmincheck.css'
import { adminData } from '../../data/admins'
import { AiTwotoneEdit } from "react-icons/ai";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useEditComModalStore } from "./store/admninmodaeditcom";
interface FetchalladmincomsProps {
  searchTerm: string
  searchType: string
}

function Fetchalladmincoms({ searchTerm, searchType }: FetchalladmincomsProps) {
    const {  openModal } =useEditComModalStore();

  const handleEdit = (adminId: string) => {
    openModal(adminId)
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  // Filter admins based on search term and search type
  const filteredAdmins = adminData.filter(admin => {
    if (!searchTerm) return true
    
    const term = searchTerm.toLowerCase()
    
    switch(searchType) {
      case 'name':
        return admin.name.toLowerCase().includes(term)
      case 'email':
        return admin.email.toLowerCase().includes(term)
      case 'phone':
        return admin.phone.includes(term)
      case 'adminId':
        return admin.adminId.toLowerCase().includes(term)
      default:
        return admin.name.toLowerCase().includes(term) ||
               admin.email.toLowerCase().includes(term) ||
               admin.phone.includes(term) ||
               admin.adminId.toLowerCase().includes(term)
    }
  })

  return (
    <div className="overall-fetch-all-admin-checks">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Admin</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Commission</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAdmins.map((admin) => (
            <tr key={admin.adminId}>
              <td>
                <div className="admin-info">
                  <div className="admin-avatar">
                    {getInitials(admin.name)}
                  </div>
                  <div className="admin-name-details">
                    <span className="admin-full-name">{admin.name}</span>
                    <span className="admin-id">ID: {admin.adminId}</span>
                  </div>
                </div>
              </td>
              <td className="admin-email-cell">{admin.email}</td>
              <td className="admin-phone-cell">{admin.phone}</td>
              <td>
                <span className="admin-commission-badge">
                  {admin.companyCommissionPercentage}%
                </span>
              </td>
              <td>
                <div className="admin-action-buttons">
                  <button
                    className="btn btn-outline-info btn-lg"
                    onClick={() => handleEdit(admin.adminId)}
                  >
                    <AiTwotoneEdit />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredAdmins.length === 0 && (
        <div className="admin-no-admins-found">
          <div className="admin-no-admins-icon">👤</div>
          <p>No admins found matching your search</p>
        </div>
      )}
    </div>
  )
}

export default Fetchalladmincoms