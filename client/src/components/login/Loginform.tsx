import './loginform.css'

function Loginform() {
  return (
    <div className="overall-login-form">
        <form className="romantic-login-form">
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                    type="email" 
                    id="email" 
                    placeholder="your@email.com"
                    className="romantic-input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    placeholder="••••••••"
                    className="romantic-input"
                />
            </div>
            <button type="submit" className="romantic-button">
                <span>Find your partner</span>
                <span className="button-heart">♡</span>
            </button>
        </form>
    </div>
  )
}

export default Loginform