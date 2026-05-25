import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Shield, Calendar, MapPin, 
  Settings, Lock, Bell, Activity, ChevronRight, LogOut,
  CheckCircle2, AlertTriangle, KeyRound, X, Save
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  
  // Load initial settings/details from localStorage if available
  const [profile, setProfile] = useState(() => {
    const defaults = {
      name: 'Administrator',
      email: 'admin@chitfunds.com',
      mobile: '+91 9876543210',
      role: 'System Admin',
      joinedDate: 'May 22, 2026',
      location: 'Hyderabad, India',
      status: 'Active',
      lastLogin: new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    };
    const saved = localStorage.getItem('admin_profile');
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch (e) {
        // Fallback
      }
    }
    return defaults;
  });

  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('admin_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      pushNotifications: true,
      emailSummary: true,
      twoFactor: true
    };
  });

  // Save changes to localStorage when state updates
  useEffect(() => {
    localStorage.setItem('admin_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('admin_preferences', JSON.stringify(preferences));
  }, [preferences]);

  // State for Modals/Forms
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  // Edit Profile Form State
  const [editForm, setEditForm] = useState({ ...profile });
  
  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Toast notifications state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setProfile(prev => ({
      ...prev,
      name: editForm.name,
      email: editForm.email,
      mobile: editForm.mobile,
      location: editForm.location
    }));
    setIsEditModalOpen(false);
    showToast('Profile details updated successfully!');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    if (passwordForm.currentPassword.trim() === '') {
      showToast('Please enter your current password.', 'error');
      return;
    }
    
    // Simulate updating password
    showToast('Password updated successfully!');
    setIsPasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePreferenceToggle = (key) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast(`${key === 'twoFactor' ? 'Two-Factor Authentication' : key === 'pushNotifications' ? 'Push Notifications' : 'Email Summary'} ${updated[key] ? 'enabled' : 'disabled'}.`);
      return updated;
    });
  };

  const handleSignOut = () => {
    setIsLogoutModalOpen(false);
    navigate('/');
  };

  return (
    <div className="profile-wrapper">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="profile-container">
        
        {/* Header Section */}
        <div className="profile-header">
          <div className="header-bg"></div>
          <div className="header-content">
            <div className="header-left">
              <div className="avatar-container">
                <img src="/logo.jpg" alt="Admin" className="avatar-image" />
                <div className="status-indicator-ping"></div>
              </div>
              <div className="header-text">
                <h1 className="header-title">{profile.name}</h1>
                <div className="header-badges">
                  <span className="badge badge-role">
                    <Shield size={14} /> {profile.role}
                  </span>
                  <span className="badge badge-status">
                    <span className="status-dot-small"></span> {profile.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="header-right flex-row gap-4 align-center">
              <button className="btn-edit-header" onClick={() => {
                setEditForm({ ...profile });
                setIsEditModalOpen(true);
              }}>
                <Settings size={16} />
                <span>Edit Profile</span>
              </button>
              <div className="last-login">
                <span className="login-label">Last Login:</span>
                <span className="login-time">{profile.lastLogin}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="profile-layout">
          
          {/* Left Sidebar Navigation */}
          <div className="profile-sidebar">
            <nav className="profile-nav">
              <button 
                className={`nav-btn ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <div className="nav-btn-icon"><User size={18} /></div>
                <span>Personal Details</span>
                <ChevronRight size={16} className="nav-btn-arrow" />
              </button>
              
              <button 
                className={`nav-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <div className="nav-btn-icon"><Lock size={18} /></div>
                <span>Security & Access</span>
                <ChevronRight size={16} className="nav-btn-arrow" />
              </button>
              
              <button 
                className={`nav-btn ${activeTab === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                <div className="nav-btn-icon"><Settings size={18} /></div>
                <span>Preferences</span>
                <ChevronRight size={16} className="nav-btn-arrow" />
              </button>

              <div className="nav-divider"></div>

              <button className="nav-btn signout-btn-nav" onClick={() => setIsLogoutModalOpen(true)}>
                <div className="nav-btn-icon"><LogOut size={18} /></div>
                <span>Sign Out</span>
              </button>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="profile-content">
            
            {/* Personal Details Tab */}
            {activeTab === 'personal' && (
              <div className="content-section animate-fade-in">
                <div className="section-heading flex-row justify-between align-center">
                  <div>
                    <h2>Personal Information</h2>
                    <p>Manage your personal profile and contact details.</p>
                  </div>
                  <button className="btn-outline-primary" onClick={() => {
                    setEditForm({ ...profile });
                    setIsEditModalOpen(true);
                  }}>
                    Edit Details
                  </button>
                </div>
                
                <div className="info-cards-grid">
                  <div className="info-card">
                    <div className="info-card-icon bg-blue-light">
                      <User size={20} className="text-blue" />
                    </div>
                    <div className="info-card-data">
                      <label>Full Name</label>
                      <p>{profile.name}</p>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-card-icon bg-indigo-light">
                      <Mail size={20} className="text-indigo" />
                    </div>
                    <div className="info-card-data">
                      <label>Email Address</label>
                      <p>{profile.email}</p>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-card-icon bg-emerald-light">
                      <Phone size={20} className="text-emerald" />
                    </div>
                    <div className="info-card-data">
                      <label>Mobile Number</label>
                      <p>{profile.mobile}</p>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-card-icon bg-amber-light">
                      <MapPin size={20} className="text-amber" />
                    </div>
                    <div className="info-card-data">
                      <label>Location</label>
                      <p>{profile.location}</p>
                    </div>
                  </div>
                  
                  <div className="info-card full-width">
                     <div className="info-card-icon bg-purple-light">
                        <Calendar size={20} className="text-purple" />
                     </div>
                     <div className="info-card-data">
                        <label>Joined Date</label>
                        <p>{profile.joinedDate}</p>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="content-section animate-fade-in">
                <div className="section-heading">
                  <h2>Security & Access</h2>
                  <p>Protect your account with advanced security settings.</p>
                </div>

                <div className="settings-list">
                  <div className="setting-card">
                    <div className="setting-card-left">
                      <div className="setting-icon bg-red-light">
                        <KeyRound size={22} className="text-red" />
                      </div>
                      <div className="setting-details">
                        <h4>Account Password</h4>
                        <p>Keep your account secure with regular updates.</p>
                      </div>
                    </div>
                    <button className="btn-outline" onClick={() => setIsPasswordModalOpen(true)}>Update Password</button>
                  </div>

                  <div className="setting-card">
                    <div className="setting-card-left">
                      <div className="setting-icon bg-emerald-light">
                        <Shield size={22} className="text-emerald" />
                      </div>
                      <div className="setting-details">
                        <h4>Two-Factor Authentication</h4>
                        <p>Requires verification code when logging in.</p>
                      </div>
                    </div>
                    <label className="toggle-container">
                      <input 
                        type="checkbox" 
                        checked={preferences.twoFactor} 
                        onChange={() => handlePreferenceToggle('twoFactor')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-card">
                    <div className="setting-card-left">
                      <div className="setting-icon bg-blue-light">
                        <Activity size={22} className="text-blue" />
                      </div>
                      <div className="setting-details">
                        <h4>Session Protection</h4>
                        <p>Automatically verify connected sessions and API security.</p>
                      </div>
                    </div>
                    <div className="status-pill status-success">
                       <CheckCircle2 size={14} /> Active Secure
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="content-section animate-fade-in">
                <div className="section-heading">
                  <h2>System Preferences</h2>
                  <p>Customize your dashboard experience.</p>
                </div>

                <div className="settings-list">
                  <div className="setting-card">
                    <div className="setting-card-left">
                      <div className="setting-icon bg-purple-light">
                        <Bell size={22} className="text-purple" />
                      </div>
                      <div className="setting-details">
                        <h4>Push Notifications</h4>
                        <p>Get alerted for new groups and subscriber activities.</p>
                      </div>
                    </div>
                    <label className="toggle-container">
                      <input 
                        type="checkbox" 
                        checked={preferences.pushNotifications} 
                        onChange={() => handlePreferenceToggle('pushNotifications')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-card">
                    <div className="setting-card-left">
                      <div className="setting-icon bg-amber-light">
                        <Mail size={22} className="text-amber" />
                      </div>
                      <div className="setting-details">
                        <h4>Email Summary</h4>
                        <p>Receive weekly reports on platform performance.</p>
                      </div>
                    </div>
                    <label className="toggle-container">
                      <input 
                        type="checkbox" 
                        checked={preferences.emailSummary} 
                        onChange={() => handlePreferenceToggle('emailSummary')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-content animate-scale-in">
            <div className="modal-header">
              <h3>Edit Profile Details</h3>
              <button className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="input-group-profile">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="input-group-profile">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    value={editForm.email} 
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })} 
                    required 
                  />
                </div>
                <div className="input-group-profile">
                  <label>Mobile Number</label>
                  <input 
                    type="text" 
                    value={editForm.mobile} 
                    onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} 
                    required 
                  />
                </div>
                <div className="input-group-profile">
                  <label>Location</label>
                  <input 
                    type="text" 
                    value={editForm.location} 
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })} 
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-content animate-scale-in">
            <div className="modal-header">
              <h3>Change Account Password</h3>
              <button className="modal-close-btn" onClick={() => setIsPasswordModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <div className="input-group-profile">
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required 
                  />
                </div>
                <div className="input-group-profile">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    placeholder="Min 8 characters"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required 
                  />
                </div>
                <div className="input-group-profile">
                  <label>Confirm New Password</label>
                  <input 
                    type="password" 
                    placeholder="Confirm password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-content confirm-modal animate-scale-in">
            <div className="modal-body-confirm">
              <div className="confirm-icon-box">
                <LogOut size={28} />
              </div>
              <h3>Sign Out Account</h3>
              <p>Are you sure you want to log out of the Chit Funds Admin Dashboard?</p>
            </div>
            <div className="modal-footer-confirm">
              <button className="btn-cancel-confirm" onClick={() => setIsLogoutModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-danger-confirm" onClick={handleSignOut}>
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
