// Login.tsx
import  { useState, useEffect, useCallback } from 'react';
import { FaChevronLeft, FaChevronRight, FaPlay, FaPause } from 'react-icons/fa';
import LoginForm from '../../components/common/login/Loginform';
import './login.css';

// Define types for carousel items
interface CarouselItem {
  id: number;
  imageUrl: string;
  overlayColor?: string;
}

function Login() {
  // Carousel data for hookup/dating app - Using Unsplash images
  const carouselItems: CarouselItem[] = [
    {
      id: 1,
      imageUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      overlayColor: 'rgba(9, 2, 32, 0.4)'
    },
    {
      id: 2,
      imageUrl: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      overlayColor: 'rgba(42, 82, 152, 0.4)'
    },
    {
      id: 3,
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      overlayColor: 'rgba(9, 2, 32, 0.4)'
    },
    {
      id: 4,
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      overlayColor: 'rgba(42, 82, 152, 0.4)'
    },
    {
      id: 5,
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c7f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      overlayColor: 'rgba(9, 2, 32, 0.4)'
    },
    {
      id: 6,
      imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      overlayColor: 'rgba(42, 82, 152, 0.4)'
    }
  ];

  // State management
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const AUTO_PLAY_INTERVAL = 5000;

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    setTimeout(() => {
      setActiveIndex((prevIndex) => 
        prevIndex === carouselItems.length - 1 ? 0 : prevIndex + 1
      );
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }, 300);
  }, [carouselItems.length, isAnimating]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    setTimeout(() => {
      setActiveIndex((prevIndex) => 
        prevIndex === 0 ? carouselItems.length - 1 : prevIndex - 1
      );
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }, 300);
  }, [carouselItems.length, isAnimating]);

  const goToSlide = useCallback((index: number) => {
    if (isAnimating || index === activeIndex) return;
    
    setIsAnimating(true);
    
    setTimeout(() => {
      setActiveIndex(index);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }, 300);
  }, [activeIndex, isAnimating]);

  const toggleAutoPlay = () => {
    setIsAutoPlay(!isAutoPlay);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === ' ') {
        e.preventDefault();
        toggleAutoPlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide]);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      nextSlide();
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(interval);
  }, [isAutoPlay, nextSlide]);


  return (
    <div className='overall-login-container-page'>
      <div className="login-carousel-wrapper">
        {/* Carousel Container */}
        <div className="carousel-global-container">
          {/* Slides Container */}
          <div className="carousel-slides-wrapper">
            {carouselItems.map((item, index) => (
              <div
                key={item.id}
                className={`carousel-slide-item ${index === activeIndex ? 'active' : ''}`}
                style={{
                  backgroundImage: `linear-gradient(${item.overlayColor || 'rgba(9, 2, 32, 0.4)'}, ${item.overlayColor || 'rgba(9, 2, 32, 0.4)'}), url(${item.imageUrl})`
                }}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <button
            className="carousel-nav-button prev-button"
            onClick={prevSlide}
            aria-label="Previous slide"
            disabled={isAnimating}
          >
            <FaChevronLeft />
          </button>
          
          <button
            className="carousel-nav-button next-button"
            onClick={nextSlide}
            aria-label="Next slide"
            disabled={isAnimating}
          >
            <FaChevronRight />
          </button>

          {/* Indicators/Dots */}
          <div className="carousel-indicators-container">
            {carouselItems.map((item, index) => (
              <button
                key={item.id}
                className={`carousel-indicator-dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                disabled={isAnimating}
              >
                <span className="indicator-progress"></span>
              </button>
            ))}
          </div>

          {/* Auto Play Control */}
          <button
            className="autoplay-control-button"
            onClick={toggleAutoPlay}
            aria-label={isAutoPlay ? 'Pause auto play' : 'Start auto play'}
          >
            {isAutoPlay ? <FaPause /> : <FaPlay />}
          </button>

          {/* Slide Counter */}
          <div className="slide-counter-display">
            <span className="current-slide">{activeIndex + 1}</span>
            <span className="counter-divider">/</span>
            <span className="total-slides">{carouselItems.length}</span>
          </div>
        </div>

        {/* Login Form Overlay - Left Side */}
        <div className="login-form-overlay">
          <LoginForm  />
        </div>
      </div>
    </div>
  );
}

export default Login;