import React from 'react';
import './InfiniteArcadiaLanding.css';

const InfiniteArcadiaLanding = () => {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1>Infinite Arcadia</h1>
        <p className="tagline">Explore infinite possibilities in a boundless arcade universe</p>
        <a href="#learn-more" className="cta-button">Learn More</a>
      </header>
      <section id="learn-more" className="info-section">
        <h2>About Infinite Arcadia</h2>
        <p>
          Infinite Arcadia is the next generation arcade experience bringing
          endless adventures and challenges to players of all skill levels.
          Discover new games, compete with friends, and unlock exclusive rewards.
        </p>
        <ul>
          <li>Dynamic gameplay</li>
          <li>Rich, colorful graphics</li>
          <li>Cross platform multiplayer</li>
          <li>Exclusive seasonal content</li>
        </ul>
      </section>
      <section className="features-section">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon">🎮</div>
            <h3>Diverse Games</h3>
            <p>Enjoy a vast library of arcade games, updated regularly.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🌐</div>
            <h3>Global Community</h3>
            <p>Connect and compete with players worldwide in real-time.</p>
          </div>
          <div className="feature-card">
            <div className="icon">🏆</div>
            <h3>Achievements</h3>
            <p>Earn badges and rewards as you progress through challenges.</p>
          </div>
          <div className="feature-card">
            <div className="icon">⚙️</div>
            <h3>Customizable Controls</h3>
            <p>Personalize your playing experience with flexible controls.</p>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <p>© 2024 Infinite Arcadia. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default InfiniteArcadiaLanding;
