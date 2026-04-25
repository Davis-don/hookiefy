import './terms.css';
import { 
  FileText, Shield, Users, CreditCard, AlertTriangle, 
  Scale, Clock, Mail, Heart, CheckCircle,
  XCircle, Info, BookOpen, Lock, 
} from 'lucide-react';

function Terms() {


  const sections = [
    {
      icon: <FileText size={32} />,
      title: "Acceptance of Terms",
      content: "By accessing or using Hookify, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the platform. We reserve the right to modify these terms at any time. Your continued use of the platform after changes constitutes acceptance of the new terms."
    },
    {
      icon: <Users size={32} />,
      title: "Eligibility & Account Registration",
      content: "You must be at least 18 years old to use Hookify. By creating an account, you represent that you are 18 or older. You agree to provide accurate, current, and complete information during registration. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
    },
    {
      icon: <Shield size={32} />,
      title: "Verification Process",
      content: "All users must complete our verification process before accessing matchmaking features. Verification requires valid government-issued ID and may include photo verification. We reserve the right to reject or suspend any account that fails verification. Verified accounts receive a verification badge visible to other users."
    },
    {
      icon: <CreditCard size={32} />,
      title: "Payments & Fees",
      content: "Hookify charges a hookup fee set by your admin. All fees are clearly displayed before confirmation. Payments are processed through our secure payment system. Fees are non-refundable once a connection is established. Any payment disputes must be reported within 7 days of transaction date."
    },
    {
      icon: <Scale size={32} />,
      title: "User Conduct & Prohibited Activities",
      content: "You agree to use Hookify respectfully and lawfully. Prohibited activities include: harassment, spamming, sharing explicit content without consent, impersonation, fraudulent behavior, attempting to bypass verification, sharing account credentials, and using the platform for illegal activities. Violations may result in immediate account termination."
    },
    {
      icon: <AlertTriangle size={32} />,
      title: "Termination & Suspension",
      content: "We reserve the right to suspend or terminate your account for violations of these terms, inappropriate conduct, or any reason at our discretion. You may delete your account at any time through settings. Upon termination, your access to the platform ceases immediately, and you forfeit any pending connection requests."
    },
    {
      icon: <Lock size={32} />,
      title: "Privacy & Data Protection",
      content: "Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using Hookify, you consent to our data practices as described in the Privacy Policy. We implement industry-standard security measures to protect your data."
    },
    {
      icon: <Clock size={32} />,
      title: "Limitation of Liability",
      content: "Hookify is provided 'as is' without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to direct, indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you, if any, for using our services."
    }
  ];

  const prohibitedItems = [
    "Harassment, bullying, or threatening behavior",
    "Sharing explicit or inappropriate content",
    "Impersonating another person or entity",
    "Using fake or stolen identity documents",
    "Attempting to bypass verification systems",
    "Sharing login credentials with others",
    "Using the platform for commercial purposes",
    "Posting false or misleading information",
    "Attempting to hack or disrupt the platform",
    "Engaging in illegal activities through our service"
  ];

  return (
    <div className="hookify-terms-wrapper">
      {/* Background Gradients */}
      <div className="hookify-terms-bg-gradient"></div>
      <div className="hookify-terms-bg-gradient-2"></div>
      <div className="hookify-terms-bg-gradient-3"></div>
      
      {/* Floating Elements */}
      <div className="hookify-terms-floating">
        <div className="hookify-terms-float-1">⚖️</div>
        <div className="hookify-terms-float-2">📜</div>
        <div className="hookify-terms-float-3">✨</div>
        <div className="hookify-terms-float-4">💫</div>
        <div className="hookify-terms-float-5">⭐</div>
      </div>
      
      <div className="hookify-terms-container">
        {/* Header Section */}
        <div className="hookify-terms-header">
          <div className="hookify-terms-badge">
            <FileText size={28} fill="currentColor" />
            <span>Legal Agreement</span>
          </div>
          
          <h1 className="hookify-terms-title">
            Terms of
            <span className="hookify-terms-title-accent"> Service</span>
          </h1>
          
          <p className="hookify-terms-subtitle">
            Last Updated: January 1, 2026 | Effective: January 15, 2026
          </p>
          
          <div className="hookify-terms-intro">
            <Info size={24} />
            <p>
              These Terms of Service constitute a legally binding agreement between you and Hookify. 
              By accessing or using our platform, you acknowledge that you have read, understood, 
              and agree to be bound by these terms.
            </p>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="hookify-terms-grid">
          {/* Left Column - Key Information */}
          <div className="hookify-terms-sidebar">
            <div className="hookify-terms-sidebar-card">
              <h3 className="hookify-sidebar-title">
                <Heart size={22} />
                Our Promise
              </h3>
              <ul className="hookify-sidebar-list">
                <li>
                  <CheckCircle size={16} />
                  <span>Safe & secure platform</span>
                </li>
                <li>
                  <CheckCircle size={16} />
                  <span>Verified users only</span>
                </li>
                <li>
                  <CheckCircle size={16} />
                  <span>24/7 support available</span>
                </li>
                <li>
                  <CheckCircle size={16} />
                  <span>Transparent fees</span>
                </li>
                <li>
                  <CheckCircle size={16} />
                  <span>Privacy protected</span>
                </li>
              </ul>
            </div>
            
            <div className="hookify-terms-sidebar-card">
              <h3 className="hookify-sidebar-title">
                <XCircle size={22} />
                Prohibited Actions
              </h3>
              <ul className="hookify-sidebar-prohibited">
                {prohibitedItems.slice(0, 6).map((item, idx) => (
                  <li key={idx}>
                    <XCircle size={14} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="hookify-terms-sidebar-card">
              <h3 className="hookify-sidebar-title">
                <Mail size={22} />
                Contact Us
              </h3>
              <div className="hookify-sidebar-contact">
                <p><strong>Email:</strong> donkenyan45@gmail.com</p>
                <p><strong>Phone:</strong> 0758 420 860</p>
                <p><strong>Support Hours:</strong> 24/7 Online</p>
              </div>
            </div>
          </div>
          
          {/* Right Column - Terms Sections */}
          <div className="hookify-terms-content">
            {sections.map((section, idx) => (
              <div key={idx} className="hookify-terms-section">
                <div className="hookify-terms-section-icon">
                  {section.icon}
                </div>
                <div className="hookify-terms-section-content">
                  <h2 className="hookify-terms-section-title">{section.title}</h2>
                  <p className="hookify-terms-section-text">{section.content}</p>
                </div>
              </div>
            ))}
            
            {/* Prohibited Items Full List */}
            <div className="hookify-terms-prohibited-full">
              <div className="hookify-prohibited-header">
                <AlertTriangle size={28} />
                <h3>Complete List of Prohibited Activities</h3>
              </div>
              <div className="hookify-prohibited-grid">
                {prohibitedItems.map((item, idx) => (
                  <div key={idx} className="hookify-prohibited-item">
                    <XCircle size={18} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Governing Law */}
            <div className="hookify-terms-notice">
              <BookOpen size={24} />
              <div className="hookify-notice-content">
                <strong>Governing Law & Dispute Resolution</strong>
                <span>These terms shall be governed by the laws of Kenya. Any disputes arising from your use of Hookify shall be resolved through binding arbitration in Nairobi, Kenya. You agree to waive any right to participate in class-action lawsuits against Hookify.</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Note */}
        <div className="hookify-terms-footer-note">
          <p>By continuing to use Hookify, you acknowledge that you have read, understood, and agree to these Terms of Service.</p>
          <div className="hookify-terms-footer-buttons">
            <button onClick={() => window.location.href = '/privacy'} className="hookify-terms-footer-btn">
              Read Privacy Policy →
            </button>
            <button onClick={() => window.location.href = '/contact'} className="hookify-terms-footer-btn secondary">
              Contact Support →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Terms;