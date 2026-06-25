import './addnewclient.css'
import { IoMdClose } from "react-icons/io";
import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMountStore } from '../superadmin/store/usermodalstore'

function Addnewclientcomponent() {
  const { toggleMount } = useMountStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    password: '',
    confirmPassword: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters long!')
      return
    }

    const clientData = {
      ...formData,
      role: 'client' // Role is always client
    }
    
    console.log('New client data:', clientData)
    alert('Client added successfully!')
    
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: '',
      password: '',
      confirmPassword: ''
    })
    
    toggleMount()
  }

  return (
    <div className="anc-overall-add-new-client-form">
      <div className="anc-add-client-header-form">
        <div className="anc-add-client-form-left">
          <h3>Add Client</h3>
        </div>
        <div className="anc-add-client-right-form">
          <IoMdClose onClick={toggleMount} className="anc-close-icon" />
        </div>
      </div>

      <div className="anc-add-client-form-div-actual">
        <form className='anc-form-component-div-actual' onSubmit={handleSubmit}>
          <input
            type="text"
            name="firstName"
            placeholder="Enter First Name"
            className="form-control p-3 anc-form-input"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="lastName"
            placeholder="Enter Last Name"
            className="form-control p-3 anc-form-input"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            className="form-control p-3 anc-form-input"
            value={formData.email}
            onChange={handleInputChange}
            required
          />

          <input
            type="text"
            name="phone"
            placeholder="Enter Phone Number"
            className="form-control p-3 anc-form-input"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />

          <select
            name="gender"
            className="form-control p-3 anc-form-input anc-form-select"
            value={formData.gender}
            onChange={handleInputChange}
            required
          >
            <option value="" disabled>Select Gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>

          {/* Role is removed - client only */}

          <input
            type="password"
            name="password"
            placeholder="Enter Password"
            className="form-control p-3 anc-form-input"
            value={formData.password}
            onChange={handleInputChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            className="form-control p-3 anc-form-input"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />

          <div className="anc-submit-client-button">
            <button type="submit" className='btn anc-confirm-btn'>Confirm</button>
            <button type="button" className='btn btn-danger anc-close-btn' onClick={toggleMount}>close</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Addnewclientcomponent