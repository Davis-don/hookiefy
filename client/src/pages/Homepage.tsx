import './homepage.css';
import Hero from '../components/homepagehero/Hero';
import Ninche from '../components/Ninche/Ninche';
import Howitworks from '../components/Howitworks/Howitworks';
import Fiq from '../components/FIQS/Fiq';
import Contact from '../components/Contact/Contact';

function Homepage() {
  return (
    <div className="overall-homepage-container">
      <section id="home">
        <Hero />
      </section>

      <section id="services">
        <Ninche />
      </section>

      <section id="how-it-works">
        <Howitworks />
      </section>

      <section id="faqs">
        <Fiq />
      </section>

      <section id="contact">
        <Contact />
      </section>
    </div>
  );
}

export default Homepage;