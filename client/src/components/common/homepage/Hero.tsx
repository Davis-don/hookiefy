import './hero.css';
import { ChevronRight, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Hero() {
  const navigate = useNavigate();
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  
  const messages = [
    "✨ Hey you... ready to have some fun? ✨",
    "💕 Find your partner in crime tonight",
    "💘 No strings attached. Just good vibes.",
    "🎉 Life's too short. Let's hook up!",
    "💫 Your next adventure starts here"
  ];
  
  useEffect(() => {
    if (currentLineIndex >= messages.length) {
      const resetTimer = setTimeout(() => {
        setCurrentLineIndex(0);
        setDisplayedLines([]);
        setCurrentCharIndex(0);
      }, 3000);
      return () => clearTimeout(resetTimer);
    }
    
    if (currentLineIndex < messages.length) {
      const currentMessage = messages[currentLineIndex];
      
      if (currentCharIndex < currentMessage.length) {
        const timer = setTimeout(() => {
          setCurrentCharIndex(prev => prev + 1);
        }, 50);
        return () => clearTimeout(timer);
      } else {
        const lineTimer = setTimeout(() => {
          setDisplayedLines(prev => [...prev, currentMessage]);
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        }, 800);
        return () => clearTimeout(lineTimer);
      }
    }
  }, [currentLineIndex, currentCharIndex, messages]);
  
  const currentTypingMessage = currentLineIndex < messages.length 
    ? messages[currentLineIndex].substring(0, currentCharIndex)
    : '';

  return (
    <div className="hookify-hero-wrapper">
      {/* Background Gradient Layers */}
      <div className="hookify-hero-bg-gradient"></div>
      <div className="hookify-hero-bg-gradient-2"></div>
      <div className="hookify-hero-bg-gradient-3"></div>
      
      {/* Floating Hearts Animation */}
      <div className="hookify-floating-hearts">
        <div className="hookify-heart hookify-heart-1">💕</div>
        <div className="hookify-heart hookify-heart-2">💘</div>
        <div className="hookify-heart hookify-heart-3">💖</div>
        <div className="hookify-heart hookify-heart-4">💗</div>
        <div className="hookify-heart hookify-heart-5">💓</div>
        <div className="hookify-heart hookify-heart-6">🔥</div>
        <div className="hookify-heart hookify-heart-7">✨</div>
      </div>
      
      {/* Main Content */}
      <div className="hookify-hero-content-wrapper">
        <div className="hookify-hero-grid-layout">
          {/* Left Column - Text Content */}
          <div className="hookify-hero-text-section">
            <div className="hookify-hero-badge">
              <Heart size={20} fill="currentColor" />
              <span>Find Your Vibe</span>
            </div>
            
            <h1 className="hookify-hero-main-heading">
              Let's
              <span className="hookify-hero-heading-accent"> Hook Up</span>
            </h1>
            
            <p className="hookify-hero-subtitle">
              <span className="hookify-hero-highlight">Hookify</span> is where fun meets connection. 
              No games, no pressure — just real people looking for good times and great company. 
              Whether it's a date, a night out, or something spontaneous, your next adventure starts here.
            </p>
            
            {/* Stats */}
            <div className="hookify-hero-stats-grid">
              <div className="hookify-hero-stat-item">
                <span className="hookify-stat-number">50k+</span>
                <span className="hookify-stat-label">Active Members</span>
              </div>
              <div className="hookify-hero-stat-item">
                <span className="hookify-stat-number">1k+</span>
                <span className="hookify-stat-label">Daily Hookups</span>
              </div>
              <div className="hookify-hero-stat-item">
                <span className="hookify-stat-number">4.9⭐</span>
                <span className="hookify-stat-label">User Rating</span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="hookify-hero-cta-group">
              <button onClick={() => navigate("/signup")} className="hookify-hero-primary-btn">
                Get Started Now
                <ChevronRight size={22} style={{ marginLeft: '0.75rem' }} />
              </button>
              <button onClick={() => navigate("/about")} className="hookify-hero-secondary-btn">
                Learn More
              </button>
            </div>
            
            {/* Tagline */}
            <div className="hookify-hero-tagline">
              <span>✨ No drama. Just good energy. ✨</span>
            </div>
          </div>
          
          {/* Right Column - Animated Notebook 3D */}
          <div className="hookify-hero-visualization">
            <div className="hookify-notebook-3d-container">
              <div className="hookify-notebook-3d">
                <div className="hookify-notebook-spine"></div>
                
                <div className="hookify-notebook-cover">
                  <div className="hookify-notebook-pages">
                    <div className="hookify-page-lines-bg">
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                      <div className="hookify-page-line"></div>
                    </div>
                    
                    <div className="hookify-written-messages">
                      {displayedLines.map((line, idx) => (
                        <div key={idx} className="hookify-written-line">
                          <span className="hookify-line-text">{line}</span>
                          <span className="hookify-line-heart">💕</span>
                        </div>
                      ))}
                      
                      {currentTypingMessage && (
                        <div className="hookify-typing-line">
                          <span className="hookify-typing-text">{currentTypingMessage}</span>
                          <span className="hookify-typing-cursor">|</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="hookify-writing-pen">
                      <div className="hookify-pen-body">✍️</div>
                    </div>
                  </div>
                  
                  <div className="hookify-notebook-corner"></div>
                </div>
              </div>
              
              <div className="hookify-floating-sparkle hookify-sparkle-1">✨</div>
              <div className="hookify-floating-sparkle hookify-sparkle-2">⭐</div>
              <div className="hookify-floating-sparkle hookify-sparkle-3">💫</div>
              <div className="hookify-floating-sparkle hookify-sparkle-4">🌟</div>
              <div className="hookify-floating-sparkle hookify-sparkle-5">🔥</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="hookify-hero-scroll-indicator">
        <div className="hookify-scroll-mouse">
          <div className="hookify-scroll-wheel"></div>
        </div>
        <span>Swipe to find your vibe</span>
      </div>
    </div>
  );
}

export default Hero;