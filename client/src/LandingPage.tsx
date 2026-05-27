import React from 'react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <header className="header">
        <div className="logo">Infinite Arcadia</div>
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero">
        <h1>Welcome to Infinite Arcadia</h1>
        <p>Your gateway to limitless adventures and infinite possibilities.</p>
        <button className="cta-button">Get Started</button>
      </section>

      <section id="features" className="features">
        <h2>Features</h2>
        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-icon">🌌</div>
            <h3>Vast Worlds</h3>
            <p>Explore expansive universes filled with mysteries and excitement.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚔️</div>
            <h3>Engaging Combat</h3>
            <p>Experience real-time thrilling combat with strategic elements.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🤝</div>
            <h3>Community Driven</h3>
            <p>Connect and collaborate with fellow adventurers worldwide.</p>
          </div>
        </div>
      </section>

      <section id="about" className="about">
        <h2>About Infinite Arcadia</h2>
        <p>
          Infinite Arcadia is an innovative platform designed to immerse you in an endless universe of exploration and excitement. 
          Developed by a passionate creative team, it combines captivating storytelling with cutting-edge technology.
        </p>
      </section>

      <section id="contact" className="contact">
        <h2>Contact Us</h2>
        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          <input type="text" placeholder="Name" name="name" required />
          <input type="email" placeholder="Email" name="email" required />
          <textarea placeholder="Message" name="message" required></textarea>
          <button type="submit">Send</button>
        </form>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Infinite Arcadia. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
