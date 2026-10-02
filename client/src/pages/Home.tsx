import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './home.css';
import Hero from '../components/hero/Hero';
import Aboutus from '../components/Aboutus/Aboutus';
import Services from '../components/services/Services';
import Fiq from '../components/FIQS/Fiqs';
import Contactus from '../components/contactus/Contactus';

function Home() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace('#', '');
    // Give the DOM a moment to render the sections
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const headerOffset = 90;
        const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="home">
      <Hero />
      <Aboutus />
      <Services />
      <Fiq />
      <Contactus />
    </div>
  );
}

export default Home;