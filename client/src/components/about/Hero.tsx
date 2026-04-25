import './hero.css';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Shield, Zap ,CreditCard, Heart, Lock, Sparkles } from 'lucide-react';

function Hero() {
  const navigate = useNavigate();
  
  // Animated phone messages
  const [currentMessage, setCurrentMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  
  const messages = [
    "Hey... you free tonight? 🔥",
    "I wanna hook up with you 💕",
    "Let's meet up 😉",
    "Your place or mine? ✨",
    "Can't stop thinking about you 💘"
  ];
  
  useEffect(() => {
    const currentFullMessage = messages[messageIndex];
    
    if (!isDeleting && typingIndex < currentFullMessage.length) {
      const timer = setTimeout(() => {
        setCurrentMessage(prev => prev + currentFullMessage[typingIndex]);
        setTypingIndex(prev => prev + 1);
      }, 80);
      return () => clearTimeout(timer);
    } else if (!isDeleting && typingIndex === currentFullMessage.length) {
      const timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (isDeleting && typingIndex > 0) {
      const timer = setTimeout(() => {
        setCurrentMessage(prev => prev.slice(0, -1));
        setTypingIndex(prev => prev - 1);
      }, 40);
      return () => clearTimeout(timer);
    } else if (isDeleting && typingIndex === 0) {
      setIsDeleting(false);
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }
  }, [isDeleting, typingIndex, messageIndex, messages]);

  const features = [
    { icon: <Shield size={40} />, title: "Verified Profiles", desc: "Every user undergoes strict verification for your safety" },
    { icon: <Zap size={40} />, title: "Instant Connect", desc: "Get matched and connect within minutes" },
    { icon: <Lock size={40} />, title: "Private & Secure", desc: "Your details are only shared with your match" },
    { icon: <CreditCard size={40} />, title: "Easy Payment", desc: "Simple secure payment system with admin-set fees" }
  ];

  const steps = [
    { number: "01", title: "Get Verified", desc: "Complete verification process to prove your identity" },
    { number: "02", title: "Find Your Match", desc: "Browse profiles and select who you want to connect with" },
    { number: "03", title: "Pay & Confirm", desc: "Pay the hookup fee set by your admin" },
    { number: "04", title: "Get Connected", desc: "Receive your match's details and start your adventure" }
  ];

  return (
    <div className="hookify-about-wrapper">
      {/* Background Gradients */}
      <div className="hookify-about-bg-gradient"></div>
      <div className="hookify-about-bg-gradient-2"></div>
      <div className="hookify-about-bg-gradient-3"></div>
      
      {/* Floating Elements */}
      <div className="hookify-about-floating">
        <div className="hookify-about-float-1">💕</div>
        <div className="hookify-about-float-2">🔥</div>
        <div className="hookify-about-float-3">✨</div>
        <div className="hookify-about-float-4">💫</div>
        <div className="hookify-about-float-5">⭐</div>
      </div>
      
      <div className="hookify-about-container">
        {/* Hero Section */}
        <div className="hookify-about-hero">
          <div className="hookify-about-hero-content">
            <div className="hookify-about-badge">
              <Heart size={28} fill="currentColor" />
              <span>About Hookify</span>
            </div>
            
            <h1 className="hookify-about-title">
              Modern Dating
              <span className="hookify-about-title-accent"> Redefined</span>
            </h1>
            
            <p className="hookify-about-subtitle">
              Hookify is revolutionizing how people connect. Our electronic platform enables secure, 
              verified connections where you only pay the hookup fee and get matched with verified 
              individuals. Your privacy and safety are our top priorities.
            </p>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="hookify-about-grid">
          {/* Left Column - Text Content */}
          <div className="hookify-about-text-section">
            <h2 className="hookify-section-title">
              How Hookify
              <span className="hookify-section-title-accent"> Works</span>
            </h2>
            
            <p className="hookify-section-subtitle">
              We've created a seamless electronic system that connects verified individuals 
              looking for genuine connections. No games, no fake profiles — just real people.
            </p>
            
            <div className="hookify-about-steps">
              {steps.map((step) => (
                <div key={step.number} className="hookify-step-item">
                  <div className="hookify-step-number-badge">{step.number}</div>
                  <div className="hookify-step-content">
                    <h4 className="hookify-step-title">{step.title}</h4>
                    <p className="hookify-step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="hookify-about-features">
              {features.map((feature, idx) => (
                <div key={idx} className="hookify-feature-card">
                  <div className="hookify-feature-icon">{feature.icon}</div>
                  <h4 className="hookify-feature-title">{feature.title}</h4>
                  <p className="hookify-feature-desc">{feature.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="hookify-about-cta">
              <button onClick={() => navigate("/signup")} className="hookify-about-primary-btn">
                Get Started Now
                <Sparkles size={22} />
              </button>
            </div>
          </div>
          
          {/* Right Column - Animated Phone */}
          <div className="hookify-about-phone-section">
            <div className="hookify-phone-container">
              <div className="hookify-phone">
                {/* Phone Notch */}
                <div className="hookify-phone-notch"></div>
                
                {/* Phone Screen */}
                <div className="hookify-phone-screen">
                  {/* Status Bar */}
                  <div className="hookify-phone-status">
                    <span className="hookify-time">9:41</span>
                    <div className="hookify-battery">
                      <span>📶</span>
                      <span>🔋</span>
                    </div>
                  </div>
                  
                  {/* Chat Header */}
                  <div className="hookify-chat-header">
                    <div className="hookify-chat-avatar">💕</div>
                    <div className="hookify-chat-info">
                      <h4 className="hookify-chat-name">Hookify Match</h4>
                      <span className="hookify-chat-status">Online · Typing...</span>
                    </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="hookify-chat-messages">
                    <div className="hookify-message received">
                      <div className="hookify-message-bubble">
                        Hey there! Ready to have some fun?
                      </div>
                      <span className="hookify-message-time">9:41 PM</span>
                    </div>
                    
                    <div className="hookify-message sent">
                      <div className="hookify-message-bubble">
                        {currentMessage || "..."}
                        <span className="hookify-typing-cursor">|</span>
                      </div>
                      <span className="hookify-message-time">Just now</span>
                    </div>
                    
                    {/* Typing indicator */}
                    <div className="hookify-typing-indicator">
                      <div className="hookify-typing-dot"></div>
                      <div className="hookify-typing-dot"></div>
                      <div className="hookify-typing-dot"></div>
                    </div>
                  </div>
                  
                  {/* Chat Input */}
                  <div className="hookify-chat-input">
                    <div className="hookify-input-field">
                      <span>Type a message...</span>
                    </div>
                    <div className="hookify-send-button">
                      <span>➤</span>
                    </div>
                  </div>
                </div>
                
                {/* Phone Home Button */}
                <div className="hookify-phone-home"></div>
              </div>
              
              {/* Floating notifications */}
              <div className="hookify-phone-notification">
                <div className="hookify-notif-icon">🔔</div>
                <div className="hookify-notif-text">
                  <strong>New match!</strong> Someone wants to connect with you
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;