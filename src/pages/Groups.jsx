import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Landmark, Users, ChevronRight } from 'lucide-react';
import './Groups.css';

// API endpoint for groups
const GROUPS_ENDPOINT = 'https://swarm-guidance-uplifting.ngrok-free.dev/api/groups/';

const Groups = () => {
  const navigate = useNavigate();
  const [localGroups, setLocalGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHIT',
    totalPot: '',
    duration: '',
    members: '',
    adminCommission: '',
    startDate: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper: build request headers – include auth only if we have a token
  const getHeaders = () => {
    const token = localStorage.getItem('staffToken');
    return token
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        }
      : { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        };
  };

  const handleCreate = async () => {
    // basic validation
    if (!formData.name || !formData.totalPot || !formData.duration || !formData.members || !formData.startDate) {
      setError('Please fill in all required fields');
      return;
    }

    // Build payload as expected by the API
    const payload = {
      group_name: formData.name,
      chit_value: parseInt(formData.totalPot, 10),
      monthly_installment: parseInt(formData.totalPot, 10) / parseInt(formData.duration, 10),
      duration_months: parseInt(formData.duration, 10),
      total_members: parseInt(formData.members, 10),
      start_date: formData.startDate,
      // The backend may or may not use adminCommission or type, sending them just in case
      // or simply omitting them if not supported.
    };

    setLoading(true);
    setError('');
    try {
      const resp = await fetch(GROUPS_ENDPOINT, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Create failed (${resp.status})`);
      }

      // Refresh list – API may return the created group or the full list
      await fetchGroups();

      // close modal & reset form
      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'CHIT',
        totalPot: '',
        duration: '',
        members: '',
        adminCommission: '',
        startDate: ''
      });
    } catch (e) {
      console.error('Create group error:', e);
      setError(e.message || 'Unable to create group');
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation modal
  const promptDelete = (id) => {
    setGroupToDelete(id);
  };

  // Confirm and execute group deletion
  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${GROUPS_ENDPOINT}${groupToDelete}/`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Delete failed (${resp.status})`);
      }
      setGroupToDelete(null);
      await fetchGroups();
    } catch (e) {
      console.error('Delete group error:', e);
      setError(e.message || 'Unable to delete group');
    } finally {
      setLoading(false);
    }
  };

  // Cancel deletion
  const cancelDelete = () => {
    setGroupToDelete(null);
  };

  /* ---------- FETCH ALL GROUPS ---------- */
  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(GROUPS_ENDPOINT, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Failed to load groups (${resp.status})`);
      }
      const data = await resp.json(); // expect array
      // Normalise data for UI expectations
      const normalised = data.map((g) => {
        const pot = g.chit_value ? `₹${g.chit_value}` : `₹${g.totalPot || 0}`;
        const color = g.typeColor || 'blue';
        return { 
          ...g, 
          id: g.id,
          name: g.group_name || g.name,
          type: g.type || 'CHIT',
          totalPot: pot, 
          typeColor: color,
          currentMonth: g.currentMonth || 1, // Fallback if backend doesn't have it
          totalMonths: g.duration_months || g.totalMonths || 1,
          slotsFilled: g.slotsFilled || 0,
          totalSlots: g.total_members || g.totalSlots || 1,
          installment: g.monthly_installment ? `₹${g.monthly_installment}` : g.installment || '₹0'
        };
      });
      setLocalGroups(normalised);
    } catch (e) {
      console.error('Fetch groups error:', e);
      setError(e.message || 'Unable to load groups');
    } finally {
      setLoading(false);
    }
  };

  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div className="container page-container">
      {loading && <p className="info-msg">Loading…</p>}
      {error && <p className="error-msg">{error}</p>}
      <div className="groups-header-section">
        <div className="header-title-container">
          <Landmark className="header-icon" size={32} color="#1d4ed8" />
          <h1 className="header-title">Fund Groups</h1>
        </div>
        <button className="create-group-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} strokeWidth={2.5} />
          Create Group
        </button>
      </div>

      <div className="groups-grid">
        {localGroups.map((group) => {
          const progressPercentage = (group.currentMonth / group.totalMonths) * 100;
          
          return (
            <div
              className="premium-group-card"
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              style={{ position: 'relative' }}
            >
              <button
                className="delete-group-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  promptDelete(group.id);
                }}
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', zIndex: 10, fontWeight: 'bold' }}
              >
                Delete
              </button>
              <div className="card-accent-bar"></div>
              
              <div className="pg-card-top">
                <span className={`pg-badge badge-${group.typeColor}`}>
                  {group.type}
                </span>
                <div className="pg-status-indicator">
                  <span className="status-dot"></span> Active
                </div>
              </div>

              <h2 className="pg-title">{group.name}</h2>
              
              <div className="pg-main-value">
                <span className="pg-currency">₹</span>
                <span className="pg-amount">{group.totalPot.replace('₹', '')}</span>
                <span className="pg-label">Total Pot Value</span>
              </div>

              <div className="pg-progress-box">
                <div className="pg-progress-labels">
                  <span className="pg-progress-text">Month {group.currentMonth} of {group.totalMonths}</span>
                  <span className="pg-progress-percent">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="pg-progress-bg">
                  <div
                    className="pg-progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="pg-meta-grid">
                <div className="pg-meta-item">
                  <div className="pg-meta-icon-wrapper">
                    <Users size={16} strokeWidth={2.5} />
                  </div>
                  <div className="pg-meta-details">
                    <div className="pg-meta-value">{group.slotsFilled}/{group.totalSlots}</div>
                    <div className="pg-meta-label">Slots Filled</div>
                  </div>
                </div>
                <div className="pg-meta-divider"></div>
                <div className="pg-meta-item">
                  <div className="pg-meta-icon-wrapper blue-icon">
                    <Landmark size={16} strokeWidth={2.5} />
                  </div>
                  <div className="pg-meta-details">
                    <div className="pg-meta-value">{group.installment}</div>
                    <div className="pg-meta-label">Base Installment</div>
                  </div>
                </div>
              </div>

              <div className="pg-card-action">
                <span className="pg-action-text">Manage Group</span>
                <div className="pg-action-circle">
                  <ChevronRight size={18} strokeWidth={3} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Create Fund Group</h2>
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Platinum 2L Chit"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label className="scheme-label">Fund Scheme Type</label>
              <input
                type="text"
                name="type"
                className="scheme-input"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="e.g., CHIT, Savings, etc."
              />
            </div>
            <div className="form-group">
              <label>Total Pot Value (₹)</label>
              <input
                type="number"
                name="totalPot"
                placeholder="100000"
                value={formData.totalPot}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Duration (Months)</label>
              <input
                type="number"
                name="duration"
                placeholder="10"
                value={formData.duration}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Number of Members</label>
              <input
                type="number"
                name="members"
                placeholder="20"
                value={formData.members}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>Admin Commission %</label>
              <input
                type="number"
                name="adminCommission"
                placeholder="e.g., 5"
                value={formData.adminCommission}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleCreate}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {groupToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 className="modal-title" style={{ color: '#e11d48' }}>Delete Group</h2>
            <p style={{ marginBottom: '24px', color: '#475569' }}>
              Are you sure you want to delete this group? This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button 
                className="btn-create" 
                onClick={handleConfirmDelete}
                style={{ backgroundColor: '#e11d48' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
