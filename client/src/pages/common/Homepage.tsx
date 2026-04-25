// Homepage.tsx
import './homepage.css';

function Homepage() {
  return (
    <div className="overall-homepage-container-hookiefy">
      {/* Background image layer - using reliable romantic image */}
      <div className="background-image-layer">
        <img 
          src="https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=1600" 
          alt="Romantic sunset cityscape"
        />
      </div>
      
      <div className="content-wrapper">
        {/* Left side - Captivating pen writing area */}
        <div className="writing-zone">
          <div className="elegant-card">
            <div className="card-header">
              <span className="header-dot"></span>
              <span className="header-dot"></span>
              <span className="header-dot"></span>
              <span className="header-title">New Message</span>
            </div>
            <div className="writing-area">
              <div className="paper-texture">
                <div className="typed-message">
                  <p className="type-line">Hey beautiful,</p>
                  <p className="type-line">I've been thinking about you all day...</p>
                  <p className="type-line highlight-message">Let's make tonight unforgettable ✨</p>
                  <p className="type-line">Just you & me — no rules, just vibes.</p>
                  <p className="type-signature">- Hookiefy</p>
                </div>
                
                {/* Animated Pen */}
                <div className="cursive-pen">
                  <div className="pen-svg">🖋️</div>
                  <div className="pen-trail"></div>
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button className="engage-button">✨ Let's Engage ✨</button>
            </div>
          </div>
        </div>

        {/* Right side - Flirty quote */}
        <div className="flirty-zone">
          <div className="glass-card">
            <div className="sparkle-icon">⚡</div>
            <h2 className="flirty-title">Ready for a spark?</h2>
            <p className="flirty-text">
              "The best nights start with a simple 'hello' —<br/>
              Don't keep me waiting."
            </p>
            <div className="divider"></div>
            <p className="invitation-text">One click. One night. Endless possibilities.</p>
          </div>
        </div>
      </div>

      {/* Floating particles for atmosphere */}
      <div className="particles">
        <span className="particle">·</span>
        <span className="particle">·</span>
        <span className="particle">·</span>
        <span className="particle">·</span>
        <span className="particle">·</span>
      </div>
    </div>
  );
}

export default Homepage;