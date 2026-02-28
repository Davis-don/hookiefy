import './login.css'
import image1 from '../../assets/images/stefzn-pFW7o43y-FM-unsplash.jpg'
import Loginform from '../../components/login/Loginform'

const GlitterRain = () => {
    return (
        <div className="glitter-rain">
            {/* 50 glitter elements for dense rain effect */}
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
                <h2 className="logo-name">Hookiefy</h2>
                <h3 className="logo-tagline">Get your fun partner today</h3>
            </div>
        </div>
    );
};

function Login() {
  return (
    <div className="overall-login-page-container">
        <GlitterRain />
        <div className="left-side-login-page-container">
          <img src={image1} alt="Romantic moment" />
        </div>
        <div className="right-side-login-page-container">
            <Logo/>
            <Loginform/>
        </div>
    </div>
  )
}

export default Login