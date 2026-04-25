import './contact.css';

import { Mail, Phone, MessageCircle, MapPin, Heart, Sparkles } from 'lucide-react';

function Contact() {


  const contactInfo = [
    { 
      icon: <Mail size={36} />, 
      title: "Email Us", 
      details: ["donkenyan45@gmail.com"],
      action: "mailto:donkenyan45@gmail.com",
      color: "#4f46e5"
    },
    { 
      icon: <Phone size={36} />, 
      title: "Call Us", 
      details: ["0758 420 860"],
      action: "tel:+254758420860",
      color: "#7c3aed"
    },
    { 
      icon: <MessageCircle size={36} />, 
      title: "WhatsApp", 
      details: ["0758 420 860", "Technical Support Available"],
      action: "https://wa.me/254758420860",
      color: "#25D366"
    },
    { 
      icon: <MapPin size={36} />, 
      title: "Visit Us", 
      details: ["Nairobi, Kenya", "Available 24/7 Online Support"],
      color: "#8b5cf6"
    }
  ];

  return (
    <div className="hookify-contact-wrapper">
      {/* Background Gradients */}
      <div className="hookify-contact-bg-gradient"></div>
      <div className="hookify-contact-bg-gradient-2"></div>
      <div className="hookify-contact-bg-gradient-3"></div>
      
      {/* Floating Elements */}
      <div className="hookify-contact-floating">
        <div className="hookify-contact-float-1">💕</div>
        <div className="hookify-contact-float-2">✨</div>
        <div className="hookify-contact-float-3">💫</div>
        <div className="hookify-contact-float-4">⭐</div>
        <div className="hookify-contact-float-5">🔥</div>
      </div>
      
      <div className="hookify-contact-container">
        {/* Header Section */}
        <div className="hookify-contact-header">
          <div className="hookify-contact-badge">
            <Heart size={28} fill="currentColor" />
            <span>Get in Touch</span>
          </div>
          
          <h1 className="hookify-contact-title">
            Contact
            <span className="hookify-contact-title-accent"> Us</span>
          </h1>
          
          <p className="hookify-contact-subtitle">
            Have questions? We'd love to hear from you. Our team is here to help 24/7.
          </p>
        </div>
        
        {/* Main Content Grid */}
        <div className="hookify-contact-grid">
          {/* Left Column - Animated Telephone */}
          <div className="hookify-contact-phone-section">
            <div className="hookify-telephone-container">
              <div className="hookify-telephone">
                {/* Telephone Base Shadow */}
                <div className="hookify-telephone-base"></div>
                
                {/* Telephone Dial Pad */}
                <div className="hookify-telephone-dial">
                  <div className="hookify-dial-row">
                    <div className="hookify-dial-key">1</div>
                    <div className="hookify-dial-key">2</div>
                    <div className="hookify-dial-key">3</div>
                  </div>
                  <div className="hookify-dial-row">
                    <div className="hookify-dial-key">4</div>
                    <div className="hookify-dial-key">5</div>
                    <div className="hookify-dial-key">6</div>
                  </div>
                  <div className="hookify-dial-row">
                    <div className="hookify-dial-key">7</div>
                    <div className="hookify-dial-key">8</div>
                    <div className="hookify-dial-key">9</div>
                  </div>
                  <div className="hookify-dial-row">
                    <div className="hookify-dial-key">*</div>
                    <div className="hookify-dial-key">0</div>
                    <div className="hookify-dial-key">#</div>
                  </div>
                </div>
                
                {/* Telephone Receiver - Animated */}
                <div className="hookify-telephone-receiver">
                  <div className="hookify-receiver-speaker"></div>
                  <div className="hookify-receiver-mic"></div>
                </div>
                
                {/* Animated Sound Waves */}
                <div className="hookify-sound-waves">
                  <div className="hookify-wave wave-1"></div>
                  <div className="hookify-wave wave-2"></div>
                  <div className="hookify-wave wave-3"></div>
                  <div className="hookify-wave wave-4"></div>
                </div>
              </div>
              
              {/* Floating Call Notification */}
              <div className="hookify-call-notification">
                <div className="hookify-call-icon">📞</div>
                <div className="hookify-call-text">
                  <strong>Call us anytime!</strong>
                  <span>We're here to help 24/7</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Contact Info Cards */}
          <div className="hookify-contact-info-section">
            <div className="hookify-contact-cards">
              {contactInfo.map((info, idx) => (
                <div key={idx} className="hookify-contact-card">
                  <div className="hookify-card-icon" style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}dd)` }}>
                    {info.icon}
                  </div>
                  <div className="hookify-card-content">
                    <h3 className="hookify-card-title">{info.title}</h3>
                    {info.details.map((detail, i) => (
                      <p key={i} className="hookify-card-detail">{detail}</p>
                    ))}
                    {info.action && (
                      <a 
                        href={info.action} 
                        target={info.title === "Call Us" || info.title === "Email Us" ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        className="hookify-card-link"
                      >
                        Contact Now →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Support Notice */}
            <div className="hookify-support-notice">
              <Sparkles size={24} />
              <div className="hookify-support-text">
                <strong>24/7 Technical Support Available</strong>
                <span>For technical assistance, reach out via WhatsApp or Call</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;