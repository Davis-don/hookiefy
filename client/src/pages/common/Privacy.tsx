import './privacy.css';
import { Shield, Lock, Eye, FileText, Database, Mail, Users, Heart, Sparkles, CheckCircle } from 'lucide-react';

function Privacy() {

  const sections = [
    {
      icon: <Database size={32} />,
      title: "Information We Collect",
      content: "We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with other users. This includes your name, email address, phone number, age, location, and profile photos. We also collect information about your use of our platform, including your interactions with other users and your preferences."
    },
    {
      icon: <Shield size={32} />,
      title: "How We Use Your Information",
      content: "We use your information to provide, maintain, and improve our services, to connect you with other users, to communicate with you about your account, to personalize your experience, and to ensure the safety and security of our platform. We never sell your personal information to third parties."
    },
    {
      icon: <Lock size={32} />,
      title: "Data Security",
      content: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, regular security assessments, and strict access controls. However, no method of transmission over the Internet is 100% secure."
    },
    {
      icon: <Eye size={32} />,
      title: "Information Sharing",
      content: "We share your information only with your consent or as necessary to complete transactions. Your profile information is visible to other users based on your privacy settings. We do not share your personal information with advertisers or marketing companies. Law enforcement may access information only with proper legal authorization."
    },
    {
      icon: <FileText size={32} />,
      title: "Your Rights",
      content: "You have the right to access, correct, or delete your personal information. You can update your profile settings at any time. You may request a copy of your data or ask us to delete your account permanently. To exercise these rights, please contact our support team. We will respond within 30 days."
    },
    {
      icon: <Mail size={32} />,
      title: "Contact Us",
      content: "If you have questions about this Privacy Policy or our data practices, please contact us at donkenyan45@gmail.com or call 0758 420 860. Our privacy team is available Monday through Friday, 9 AM to 6 PM EAT."
    }
  ];

  return (
    <div className="hookify-privacy-wrapper">
      {/* Background Gradients */}
      <div className="hookify-privacy-bg-gradient"></div>
      <div className="hookify-privacy-bg-gradient-2"></div>
      <div className="hookify-privacy-bg-gradient-3"></div>
      
      {/* Floating Elements */}
      <div className="hookify-privacy-floating">
        <div className="hookify-privacy-float-1">🔒</div>
        <div className="hookify-privacy-float-2">🛡️</div>
        <div className="hookify-privacy-float-3">✨</div>
        <div className="hookify-privacy-float-4">💫</div>
        <div className="hookify-privacy-float-5">⭐</div>
      </div>
      
      <div className="hookify-privacy-container">
        {/* Header Section */}
        <div className="hookify-privacy-header">
          <div className="hookify-privacy-badge">
            <Shield size={28} fill="currentColor" />
            <span>Your Privacy Matters</span>
          </div>
          
          <h1 className="hookify-privacy-title">
            Privacy
            <span className="hookify-privacy-title-accent"> Policy</span>
          </h1>
          
          <p className="hookify-privacy-subtitle">
            Last Updated: January 1, 2026
          </p>
          
          <div className="hookify-privacy-intro">
            <p>
              At Hookify, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our platform. Please read this 
              policy carefully. By using Hookify, you consent to the data practices described in this policy.
            </p>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="hookify-privacy-grid">
          {/* Left Column - Key Points */}
          <div className="hookify-privacy-sidebar">
            <div className="hookify-privacy-sidebar-card">
              <h3 className="hookify-sidebar-title">
                <Heart size={24} />
                Our Commitment
              </h3>
              <ul className="hookify-sidebar-list">
                <li>
                  <CheckCircle size={18} />
                  <span>We never sell your data</span>
                </li>
                <li>
                  <CheckCircle size={18} />
                  <span>You control your privacy</span>
                </li>
                <li>
                  <CheckCircle size={18} />
                  <span>Industry-standard security</span>
                </li>
                <li>
                  <CheckCircle size={18} />
                  <span>Transparent practices</span>
                </li>
                <li>
                  <CheckCircle size={18} />
                  <span>Right to delete your data</span>
                </li>
              </ul>
            </div>
            
            <div className="hookify-privacy-sidebar-card">
              <h3 className="hookify-sidebar-title">
                <Users size={24} />
                Quick Links
              </h3>
              <ul className="hookify-sidebar-links">
                <li onClick={() => window.location.href = '/terms'}>Terms of Service →</li>
                <li onClick={() => window.location.href = '/contact'}>Contact Support →</li>
                <li onClick={() => window.location.href = '/about'}>About Hookify →</li>
              </ul>
            </div>
          </div>
          
          {/* Right Column - Privacy Sections */}
          <div className="hookify-privacy-content">
            {sections.map((section, idx) => (
              <div key={idx} className="hookify-privacy-section">
                <div className="hookify-section-icon">
                  {section.icon}
                </div>
                <div className="hookify-section-content">
                  <h2 className="hookify-section-title">{section.title}</h2>
                  <p className="hookify-section-text">{section.content}</p>
                </div>
              </div>
            ))}
            
            {/* Policy Update Notice */}
            <div className="hookify-privacy-notice">
              <Sparkles size={24} />
              <div className="hookify-notice-content">
                <strong>Policy Updates</strong>
                <span>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. You are advised to review this policy periodically for changes.</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Note */}
        <div className="hookify-privacy-footer-note">
          <p>For any privacy-related concerns, please contact our Data Protection Officer at <strong>donkenyan45@gmail.com</strong> or call <strong>0758 420 860</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Privacy;