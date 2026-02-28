import React, { useState } from 'react';

// Types for form data
interface AddAdminFormData {
  name: string;
  email: string;
  role: string;
}

const AddAdmin: React.FC = () => {
  const [formData, setFormData] = useState<AddAdminFormData>({
    name: '',
    email: '',
    role: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    console.log('Adding admin:', formData);
    // Add your submission logic here
    // Reset form after submission
    setFormData({
      name: '',
      email: '',
      role: ''
    });
  };

  return (
    <div className="hookey-superadmin-add-admin">
      <h3>Add New Administrator</h3>
      <form onSubmit={handleSubmit} className="hookey-superadmin-admin-form">
        <div className="hookey-superadmin-form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter admin's full name"
            required
            aria-label="Admin full name"
          />
        </div>
        
        <div className="hookey-superadmin-form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            required
            aria-label="Admin email address"
          />
        </div>
        
        <div className="hookey-superadmin-form-group">
          <label htmlFor="role">Role</label>
          <input
            type="text"
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            placeholder="e.g., Senior Admin, Manager"
            required
            aria-label="Admin role"
          />
        </div>
        
        <button type="submit" className="hookey-superadmin-submit-btn">
          Add Admin ✨
        </button>
      </form>
    </div>
  );
};

export default AddAdmin;