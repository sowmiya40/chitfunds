import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, TrendingUp, ShieldCheck,
  CheckCircle, Zap, Clock, Award, ArrowRight,
  ChevronRight, BarChart3, Wallet
} from 'lucide-react';
import './Home.css';
import heroImg from '../assets/hero.png';

const Home = () => {
  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
        }
      });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.fade-in-section');
    hiddenElements.forEach((el) => observer.observe(el));

    return () => {
      hiddenElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content fade-in-section">
            <div className="hero-badge">
              <span className="badge-pulse"></span> New: Smart Automation 2.0
            </div>
            <h1 className="hero-title">
              Empower Your <span className="text-gradient">Financial</span> Future
            </h1>
            <p className="hero-description">
              Experience the next generation of Chit Fund management.
              Transparent, secure, and designed to accelerate your wealth creation seamlessly.
            </p>
            <div className="hero-actions">
              <Link to="/groups" className="btn-modern btn-primary-glow">
                Groups <ArrowRight size={18} />
              </Link>
              <Link to="/subscribers" className="btn-modern btn-outline">
                Subscribers <ChevronRight size={18} />
              </Link>
            </div>

            <div className="hero-stats-mini">
              <div className="mini-stat">
                <strong>₹50M+</strong> Managed
              </div>
              <div className="mini-stat-divider"></div>
              <div className="mini-stat">
                <strong>10k+</strong> Users
              </div>
              <div className="mini-stat-divider"></div>
              <div className="mini-stat">
                <strong>100%</strong> Secure
              </div>
            </div>
          </div>
          <div className="hero-visual fade-in-section">
            <div className="hero-image-wrapper">
              <img src={heroImg} alt="Chit Fund Growth" className="main-hero-img" />
              {/* Floating elements */}
              <div className="floating-card float-1">
                <TrendingUp className="float-icon green" />
                <div>
                  <h4>High Returns</h4>
                  <p>Up to 15% PA</p>
                </div>
              </div>
              <div className="floating-card float-2">
                <ShieldCheck className="float-icon blue" />
                <div>
                  <h4>Bank-Grade</h4>
                  <p>Security</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="dashboard-section">
        <div className="container">
          <div className="section-header text-center fade-in-section">
            <h2 className="section-title">Real-Time Insights</h2>
            <p className="section-subtitle">Monitor our rapidly growing community and secure funds at a glance</p>
          </div>

          <div className="dashboard-grid">
            <div className="premium-stat-card fade-in-section" style={{ transitionDelay: '100ms' }}>
              <div className="stat-card-inner">
                <div className="stat-icon-box bg-blue-light">
                  <Users className="text-blue" size={24} />
                </div>
                <div className="stat-details">
                  <p className="stat-label">Active Subscribers</p>
                  <h3 className="stat-value">1,248</h3>
                  <div className="stat-trend positive">
                    <TrendingUp size={14} /> <span>+12.5% vs last month</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="premium-stat-card fade-in-section" style={{ transitionDelay: '200ms' }}>
              <div className="stat-card-inner">
                <div className="stat-icon-box bg-green-light">
                  <BarChart3 className="text-green" size={24} />
                </div>
                <div className="stat-details">
                  <p className="stat-label">Active Groups</p>
                  <h3 className="stat-value">24</h3>
                  <div className="stat-trend positive">
                    <TrendingUp size={14} /> <span>+2 this week</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="premium-stat-card fade-in-section" style={{ transitionDelay: '300ms' }}>
              <div className="stat-card-inner">
                <div className="stat-icon-box bg-purple-light">
                  <Wallet className="text-purple" size={24} />
                </div>
                <div className="stat-details">
                  <p className="stat-label">Monthly Collection</p>
                  <h3 className="stat-value">₹4.5M</h3>
                  <div className="stat-trend neutral">
                    <CheckCircle size={14} /> <span>On Schedule</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="premium-stat-card fade-in-section" style={{ transitionDelay: '400ms' }}>
              <div className="stat-card-inner">
                <div className="stat-icon-box bg-orange-light">
                  <CreditCard className="text-orange" size={24} />
                </div>
                <div className="stat-details">
                  <p className="stat-label">Pending Dues</p>
                  <h3 className="stat-value">₹12.4K</h3>
                  <div className="stat-trend negative">
                    <Zap size={14} /> <span>Action Required</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="why-choose-us-section">
        <div className="container">
          <div className="why-grid">
            <div className="why-content fade-in-section">
              <h2 className="section-title">Why We Are the <br /> <span className="text-gradient">Leading Choice</span></h2>
              <p className="section-subtitle left-align">
                Experience unparalleled financial growth with best-in-class features engineered specifically for modern investors.
              </p>
              <ul className="benefits-list">
                <li><CheckCircle className="benefit-icon" /> Guaranteed Transparency</li>
                <li><CheckCircle className="benefit-icon" /> AI-Driven Risk Analysis</li>
                <li><CheckCircle className="benefit-icon" /> Instant Payouts System</li>
              </ul>
            </div>
            <div className="features-cards-wrapper">
              <div className="feature-card-modern fade-in-section" style={{ transitionDelay: '100ms' }}>
                <div className="f-icon-wrapper shield"><ShieldCheck size={28} /></div>
                <h4>Highly Secure</h4>
                <p>Your funds are protected with AES-256 bank-level encryption.</p>
              </div>
              <div className="feature-card-modern mt-large fade-in-section" style={{ transitionDelay: '200ms' }}>
                <div className="f-icon-wrapper zap"><Zap size={28} /></div>
                <h4>Fast Processing</h4>
                <p>Lightning-fast bidding and immediate settlement processes.</p>
              </div>
              <div className="feature-card-modern fade-in-section" style={{ transitionDelay: '300ms' }}>
                <div className="f-icon-wrapper award"><Award size={28} /></div>
                <h4>Trusted Platform</h4>
                <p>Thousands of successful subscribers achieving their financial goals.</p>
              </div>
              <div className="feature-card-modern mt-large fade-in-section" style={{ transitionDelay: '400ms' }}>
                <div className="f-icon-wrapper users"><Users size={28} /></div>
                <h4 className="flex">100% Transparent</h4>
                <p>Clear tracking of every single transaction and auction.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header text-center fade-in-section">
            <h2 className="section-title">Your Journey to Wealth</h2>
            <p className="section-subtitle">Four simple steps to transform your financial future</p>
          </div>

          <div className="timeline-container fade-in-section">
            <div className="timeline-line"></div>

            <div className="timeline-step">
              <div className="step-marker">1</div>
              <div className="step-content">
                <h3>Create Account</h3>
                <p>Quick KYC and verification to ensure maximum security.</p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-marker">2</div>
              <div className="step-content">
                <h3>Select a Plan</h3>
                <p>Choose chit values and tenures tailored to your specific goals.</p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-marker">3</div>
              <div className="step-content">
                <h3>Contribute Monthly</h3>
                <p>Automated, hassle-free monthly contributions via multiple payment modes.</p>
              </div>
            </div>

            <div className="timeline-step">
              <div className="step-marker">4</div>
              <div className="step-content">
                <h3>Bid & Claim</h3>
                <p>Participate in dynamic auctions and access capital exactly when you need it.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section fade-in-section">
        <div className="cta-background"></div>
        <div className="container cta-container">
          <h2 className="cta-title">Ready to Start Your Chit Fund Journey?</h2>
          <p className="cta-description">Join 1,200+ members who are already growing their savings with us. Register today and choose a scheme that fits your goals.</p>

                    <div className="cta-actions" style={{display: "flex", justifyContent: "center", marginTop: "1rem"}}>
              <Link to="/explore" className="btn-modern btn-primary-glow">
                Explore Now <ArrowRight size={20} />
              </Link>
            </div>
            </div>
      </section>
    </div>
  );
};

export default Home;
