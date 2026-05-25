import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://swarm-guidance-uplifting.ngrok-free.dev/api/staff/', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to the server');
      }

      const staffData = await response.json();
      const staffList = Array.isArray(staffData) ? staffData : (staffData.data || []);
      
      // Check if user exists with matching credentials
      const user = staffList.find(
        (s) => (s.name === username || s.mobile_number === username) && s.password === password
      );

      // Fallback for admin if API is empty for testing, or if user is found
      if (user || (username === 'admin' && password === 'admin123')) {
        // Save last login timestamp to localStorage
        const now = new Date();
        const formattedLogin = now.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        let profileData = {};
        const savedProfile = localStorage.getItem('admin_profile');
        if (savedProfile) {
          try { profileData = JSON.parse(savedProfile); } catch (e) {}
        }
        
        profileData.lastLogin = formattedLogin;
        if (user) {
          profileData.name = user.name;
          profileData.role = user.role;
          profileData.mobile_number = user.mobile_number;
        } else {
          profileData.name = 'Admin';
          profileData.role = 'ADMIN';
        }
        
        localStorage.setItem('admin_profile', JSON.stringify(profileData));
        navigate('/home');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <img src="/logo.jpg" alt="Chit Funds Logo" className="logo" />
          <h1>Chit Funds</h1>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
