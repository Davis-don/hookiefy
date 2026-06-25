import './adminclientfetch.css'
import { useState } from 'react'
import {  FiSearch } from 'react-icons/fi'
import { AiTwotoneEdit } from "react-icons/ai";
import { MdDelete } from "react-icons/md";
import { sampleClients } from './data/sampleclients';
import type { Client } from './data/sampleclients'
import 'bootstrap/dist/css/bootstrap.min.css'

interface AdminclientfetchProps {
  searchTerm: string
  searchType: string
}

function Adminclientfetch({ searchTerm, searchType }: AdminclientfetchProps) {
  const [clients, setClients] = useState<Client[]>(sampleClients)

  // Filter clients based on search term and search type
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true

    const term = searchTerm.toLowerCase()
    
    switch(searchType) {
      case 'name':
        return client.firstName.toLowerCase().includes(term) || 
               client.lastName.toLowerCase().includes(term)
      case 'email':
        return client.email.toLowerCase().includes(term)
      case 'phone':
        return client.phone.includes(term)
      case 'all':
      default:
        return client.firstName.toLowerCase().includes(term) ||
               client.lastName.toLowerCase().includes(term) ||
               client.email.toLowerCase().includes(term) ||
               client.phone.includes(term)
    }
  })

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return 'acf-status-active'
      case 'inactive':
        return 'acf-status-inactive'
      default:
        return ''
    }
  }

  // Handle delete
  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(client => client.id !== id))
    }
  }

  // Handle edit
  const handleEdit = (id: number) => {
    alert(`Edit client with ID: ${id}`)
  }

  // Get initials
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }

  // Get avatar color - consistent cyan for all clients
  const getAvatarColor = () => {
    return '#00e5ff'
  }

  return (
    <div className="acf-table-wrapper">
      <div className="acf-table-scroll-container">
        <table className="acf-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => {
              return (
                <tr key={client.id}>
                  <td>
                    <div className="acf-client-info">
                      <div 
                        className="acf-client-avatar"
                        style={{ background: getAvatarColor() }}
                      >
                        {getInitials(client.firstName, client.lastName)}
                      </div>
                      <div className="acf-client-name">
                        <span className="acf-full-name">{client.firstName} {client.lastName}</span>
                        <span className="acf-client-id">ID: {client.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="acf-email-cell">{client.email}</td>
                  <td className="acf-phone-cell">{client.phone}</td>
                  <td>
                    <span className={`acf-status-badge ${getStatusBadge(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td>
                    <div className="acf-action-buttons">
                      <button
                        className='btn btn-outline-info acf-action-btn acf-edit-btn'
                        onClick={() => handleEdit(client.id)}
                      >
                        <AiTwotoneEdit className='fs-2'/>
                      </button>
                      <button
                        className='btn btn-outline-danger acf-action-btn acf-delete-btn'
                        onClick={() => handleDelete(client.id)}
                      >
                        <MdDelete className='fs-2'/>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filteredClients.length === 0 && (
        <div className="acf-no-clients-found">
          <FiSearch className="acf-no-clients-icon" />
          <p>No clients found matching your criteria</p>
        </div>
      )}
    </div>
  )
}

export default Adminclientfetch