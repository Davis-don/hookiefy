import { useState } from 'react';
import './login.css'
import image1 from '../../assets/images/stefzn-pFW7o43y-FM-unsplash.jpg'
import Loginform from '../../components/login/Loginform'
import Spinner from '../../components/protected/protectedspinner/Spinner';

const GlitterRain = () => {
    return (
        <div className="glitter-rain">
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i>
        </div>
    );
};

const Logo = () => {
    return (
        <div className="login-logo">
            <div className="overall-login-logo-container">
                <h2 className="logo-name">Hookify</h2>
                <h3 className="logo-tagline">Find your perfect match</h3>
            </div>
        </div>
    );
};

function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="overall-login-page-container">
        <GlitterRain />
        <div className="left-side-login-page-container">
          <img src={image1} alt="Romantic moment" />
        </div>
        <div className="right-side-login-page-container">
            <Logo/>
            {isSubmitting ? (
              <div className="login-spinner-container">
                <Spinner 
                  size="large" 
                  color="#c41e3a" 
                  message="Signing you in..." 
                />
              </div>
            ) : (
              <Loginform onSubmittingChange={setIsSubmitting} />
            )}
        </div>
    </div>
  )
}

export default Login;