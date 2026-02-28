import './addadmin.css'
import 'bootstrap/dist/css/bootstrap.min.css'

function AddAdmin() {
  const handleSubmit = (e: any) => {
    e.preventDefault();
    // Add your form submission logic here
    console.log('Form submitted');
  };

  return (
    <div className="overal-add-admin-container">
      <form onSubmit={handleSubmit}>
        <div className="overall-form-container-add-admin">
          <div className="left-side-form-container">
            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" className='form-control form-control-lg' placeholder="Enter first name" />
            </div>

            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" className='form-control form-control-lg' placeholder="Enter last name" />
            </div>

            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="email">Email</label>
              <input type="email" id="email" className='form-control form-control-lg' placeholder="Enter email" />
            </div>

            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="phone">Phone</label>
              <input type="tel" id="phone" className='form-control form-control-lg' placeholder="Enter phone number" />
            </div>
          </div>
          
          <div className="right-side-form-container">
            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="gender">Gender</label>
              <select id="gender" className='form-select form-select-lg'>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="password">Password</label>
              <input type="password" id="password" className='form-control form-control-lg' placeholder="Enter password" />
            </div>

            <div className="mb-3">
              <label className='form-label fw-semibold' htmlFor="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" className='form-control form-control-lg' placeholder="Confirm password" />
            </div>

            {/* Submit button container - full width with bigger button */}
            <div className="submit-btn-container text-center mt-5">
              <button type="submit" className="btn btn-primary px-5 py-3 fs-4 fw-semibold" style={{ minWidth: '250px' }}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AddAdmin