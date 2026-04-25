import './howto.css';
import { ChevronRight, UserPlus, Users, CheckCircle, Handshake, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Howto() {
  const navigate = useNavigate();
  
  const steps = [
    {
      number: 1,
      icon: <UserPlus size={56} />,
      title: "Get Invited & Login",
      description: "Join our exclusive community through an admin invitation. Once invited, login with your unique credentials to access the platform.",
      details: ["Admin creates your account", "Receive invitation email", "Login with provided credentials"],
      color: "#4f46e5"
    },
    {
      number: 2,
      icon: <Users size={56} />,
      title: "Discover & Connect",
      description: "Browse through verified profiles, explore their interests and needs, then choose the perfect match for your vibe.",
      details: ["View detailed profiles", "Check compatibility", "Click 'Connect' to send request"],
      color: "#7c3aed"
    },
    {
      number: 3,
      icon: <CheckCircle size={56} />,
      title: "Request Approval",
      description: "Your connection request is reviewed. Once approved, you'll be notified to proceed to the next step.",
      details: ["Admin reviews request", "Verification process", "Approval notification"],
      color: "#8b5cf6"
    },
    {
      number: 4,
      icon: <Handshake size={56} />,
      title: "Pay & Hookup",
      description: "Complete the setup fee set by your admin, finalize the connection, and get ready for an amazing experience.",
      details: ["Pay admin fee", "Confirm connection", "Start your adventure"],
      color: "#a78bfa"
    }
  ];

  const handleGetStarted = () => {
    navigate('/signup');
  };

  return (
    <div className="hookify-howto-wrapper">
      {/* Background Gradients */}
      <div className="hookify-howto-bg-gradient"></div>
      <div className="hookify-howto-bg-gradient-2"></div>
      
      {/* Floating Elements */}
      <div className="hookify-howto-floating">
        <div className="hookify-float-1">✨</div>
        <div className="hookify-float-2">💫</div>
        <div className="hookify-float-3">⭐</div>
        <div className="hookify-float-4">🌟</div>
        <div className="hookify-float-5">💕</div>
      </div>
      
      <div className="hookify-howto-container">
        {/* Header Section */}
        <div className="hookify-howto-header">
          <div className="hookify-howto-badge">
            <Sparkles size={28} />
            <span>Simple 4-Step Guide</span>
          </div>
          <h2 className="hookify-howto-title">
            How to
            <span className="hookify-howto-title-accent"> Hook Up</span>
          </h2>
          <p className="hookify-howto-subtitle">
            Follow these simple steps to connect with amazing people and create unforgettable moments
          </p>
        </div>
        
        {/* Staircase Visual Steps */}
        <div className="hookify-howto-steps-container">
          {steps.map((step, index) => (
            <div 
              key={step.number} 
              className={`hookify-howto-step hookify-step-${index + 1}`}
              style={{ '--step-color': step.color } as React.CSSProperties}
            >
              {/* Step Number Badge */}
              <div className="hookify-step-number-wrapper">
                <div className="hookify-step-number-circle">
                  <span className="hookify-step-number">{step.number}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="hookify-step-connector">
                    <div className="hookify-connector-line"></div>
                    <div className="hookify-connector-arrow">
                      <ArrowRight size={28} />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Step Content Card */}
              <div className="hookify-step-card">
                <div className="hookify-step-icon" style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)` }}>
                  {step.icon}
                </div>
                
                <div className="hookify-step-content">
                  <h3 className="hookify-step-title">{step.title}</h3>
                  <p className="hookify-step-description">{step.description}</p>
                  
                  <div className="hookify-step-details">
                    {step.details.map((detail, idx) => (
                      <div key={idx} className="hookify-detail-item">
                        <ChevronRight size={22} className="hookify-detail-icon" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Alternative Modern Timeline Design for Mobile */}
        <div className="hookify-howto-timeline-mobile">
          <div className="hookify-timeline-track"></div>
          {steps.map((step, index) => (
            <div key={index} className="hookify-timeline-item">
              <div className="hookify-timeline-dot" style={{ background: step.color }}></div>
              <div className="hookify-timeline-card">
                <div className="hookify-timeline-number">{step.number}</div>
                <div className="hookify-timeline-icon" style={{ background: step.color }}>
                  {step.icon}
                </div>
                <h4 className="hookify-timeline-title">{step.title}</h4>
                <p className="hookify-timeline-desc">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="hookify-howto-cta">
          <div className="hookify-cta-content">
            <h3 className="hookify-cta-title">Ready to start your journey?</h3>
            <p className="hookify-cta-text">Join thousands of happy connections today</p>
            <button className="hookify-cta-button" onClick={handleGetStarted}>
              Get Started Now
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Howto;