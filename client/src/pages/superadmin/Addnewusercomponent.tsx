import './addnewusercomponent.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './addnewusercomponent.css'
import { IoMdClose } from "react-icons/io";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useMountStore } from './store/usermodalstore'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authtokenstore'
import { toast } from 'sonner'
import { useState } from 'react'

interface NewUserData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  role: string;
  password: string;
  confirmpassword: string;
}

const createUser = async (userData: NewUserData, accessToken: string | null): Promise<any> => {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/account/new/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create user');
  }

  return response.json();
};

function Addnewusercomponent() {
  const { toggleMount, setIsMounted } = useMountStore();
  const { access: accessToken } = useAuthStore();
  const [formData, setFormData] = useState<NewUserData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    gender: '',
    role: 'user',
    password: '',
    confirmpassword: '',
  });

  const mutation = useMutation({
    mutationFn: (data: NewUserData) => createUser(data, accessToken),
    onSuccess: (data) => {
      toast.success('User created successfully!', {
        description: `${data.data?.first_name || 'User'} has been added to the system.`,
        duration: 5000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      });
      
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        gender: '',
        role: 'user',
        password: '',
        confirmpassword: '',
      });
      
      setTimeout(() => {
        setIsMounted(false);
        toggleMount();
      }, 1500);
    },
    onError: (error: Error) => {
      toast.error('Failed to create user', {
        description: error.message || 'Please check your input and try again.',
        duration: 6000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmpassword) {
      toast.error('Passwords do not match!', {
        description: 'Please make sure both passwords are identical.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password too short!', {
        description: 'Password must be at least 8 characters long.',
        duration: 4000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      });
      return;
    }

    const loadingToast = toast.loading('Creating user...', {
      description: 'Please wait while we add the new user.',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    });

    mutation.mutate(formData, {
      onSettled: () => {
        toast.dismiss(loadingToast);
      }
    });
  };

  const isSubmitting = mutation.isPending;

  return (
    <div className="overall-add-new-user-form">
      <div className="add-users-header-form">
        <div className="add-user-form-left">
          <h3>Add Users</h3>
        </div>
        <div className="add-user-right-form">
          <IoMdClose onClick={toggleMount} className="close-icon" />
        </div>
      </div>
      <div className="add-user-form-div-actual">
        <form className='form-component-div-actual' onSubmit={handleSubmit}>
          <input
            type="text"
            name="first_name"
            placeholder="Enter First Name"
            className="form-control p-3"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="last_name"
            placeholder="Enter Last Name"
            className="form-control p-3"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            className="form-control p-3"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="phone_number"
            placeholder="Enter Phone Number"
            className="form-control p-3"
            value={formData.phone_number}
            onChange={handleChange}
            required
          />
          <select
            className="form-control p-3"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select Gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
          <select
            className="form-control p-3"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
          <input
            type="password"
            name="password"
            placeholder="Enter Password (min 8 chars)"
            className="form-control p-3"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmpassword"
            placeholder="Confirm Password"
            className="form-control p-3"
            value={formData.confirmpassword}
            onChange={handleChange}
            required
          />
          <div className="submit-user-button">
            <button 
              type="submit" 
              className='btn confirm'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Confirm'}
            </button>
            <button 
              type="button" 
              className='btn btn-danger close' 
              onClick={toggleMount}
              disabled={isSubmitting}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Addnewusercomponent