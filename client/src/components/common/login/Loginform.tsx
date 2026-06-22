// LoginForm.tsx - Pure Form Container
import './loginform.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react';

function LoginForm() {
    const [loginData,setLoginData]=useState({
        email:'',
        password:''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginData((prevData) => ({
            ...prevData,
            [name]: value
        }));
        console.log(loginData)
    };

  return (
    <div className="login-form-container">
      <div className="login-form-wrapper">
        <h3 className="brand-name">Hookiefy</h3>
        <h1 className="login-heading">LOGIN</h1>
        <form className="login-form">
          <input onChange={(e)=>handleChange(e)} className='form-control' type="email" name="email" id="email" placeholder="Email" required />
          <input onChange={(e)=>handleChange(e)} className='form-control' type="password" name="password" id="password" placeholder="Password" required />
          <div className="bottom-login-form">
            <div className="button-container">
                <button className='login-button' type="submit">Login</button>
            </div>
            <div className="forgot-password">
                <a href="/forgot-password">Forgot Password ?</a>
            </div>
          </div>
          
        </form>
      </div>
    </div>
  );
}

export default LoginForm;