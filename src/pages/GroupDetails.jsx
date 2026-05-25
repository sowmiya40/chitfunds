import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Check, Smartphone, Banknote, Landmark, UserPlus, Search, X } from 'lucide-react';
import { groupsData } from '../data/mockData';
import './GroupDetails.css';

const GROUPS_ENDPOINT = '/api/groups/';

const GroupDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedMember, setExpandedMember] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState({});
  const [paymentForms, setPaymentForms] = useState({});
  const [savedPayments, setSavedPayments] = useState(() => {
    const saved = localStorage.getItem(`group_${id}_payments`);
    return saved ? JSON.parse(saved) : {};
  });

  const [groupMembers, setGroupMembers] = useState([]);

  React.useEffect(() => {
    localStorage.setItem(`group_${id}_payments`, JSON.stringify(savedPayments));
  }, [savedPayments, id]);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableSubscribers, setAvailableSubscribers] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subSearch, setSubSearch] = useState('');

  const openAddMemberModal = async () => {
    setShowAddMemberModal(true);
    setSubsLoading(true);
    try {
      const token = localStorage.getItem('staffToken');
      const headers = token 
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
      const resp = await fetch(`/api/customers/?t=${Date.now()}`, { headers, cache: 'no-store' });
      const data = await resp.json();
      const subsArray = Array.isArray(data) ? data : (data.data || []);
      const processed = subsArray.map(sub => ({
        id: sub.id,
        name: sub.customer_name || sub.name,
        phone: sub.mobile_number || sub.phone,
        initial: (sub.customer_name || sub.name || '?').charAt(0).toUpperCase()
      }));
      setAvailableSubscribers(processed.reverse());
    } catch (e) {
      console.error('Failed to fetch subscribers', e);
    } finally {
      setSubsLoading(false);
    }
  };

  const handleAddSubscriber = async (sub) => {
    if (groupMembers.some(m => m.id === sub.id)) {
      alert('Subscriber is already in this group!');
      return;
    }
    
    try {
      const token = localStorage.getItem('staffToken');
      const headers = token 
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
        
      const payload = {
        group: parseInt(id),
        customer: sub.id,
        group_ticket_no: String(groupMembers.length + 1)
      };

      const resp = await fetch('/api/customer-groups/', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        throw new Error('Failed to add member to group');
      }
      const newRelation = await resp.json();

      const newMember = {
        id: sub.id,
        relationId: newRelation.id,
        ticketNo: newRelation.group_ticket_no,
        name: sub.name,
        phone: sub.phone,
        initial: sub.initial
      };
      const updated = [...groupMembers, newMember];
      setGroupMembers(updated);
      setGroupData(prev => prev ? { ...prev, members: updated } : prev);
      setShowAddMemberModal(false);
      setSubSearch('');
    } catch(e) {
      console.error(e);
      alert('Failed to add subscriber to group. Ensure they are not already in it.');
    }
  };

    React.useEffect(() => {
    const fetchAllData = async () => {
      // 1️⃣ Fetch collection entries for this group
      try {
        const token = localStorage.getItem('staffToken');
        const headers = token
          ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
          : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
        const collectionsResp = await fetch(`/api/collections/?group=${id}&t=${Date.now()}`, { headers, cache: 'no-store' });
        if (collectionsResp.ok) {
          const collData = await collectionsResp.json();
          const paymentsByMember = {};
          collData.forEach(item => {
            const month = Number(item.month_number);
            const memberId = Number(item.customer);
            if (!paymentsByMember[memberId]) paymentsByMember[memberId] = {};
            paymentsByMember[memberId][month] = {
              status: item.status,
              amount: item.amount,
              mode: item.payment_mode,
              note: item.note,
              date: item.date || ''
            };
          });
          setSavedPayments(paymentsByMember);
        }
      } catch (e) {
        console.error('Failed to fetch collections', e);
      }

      // 2️⃣ Fetch group, customer‑group relations and customers
      try {
        const token = localStorage.getItem('staffToken');
        const headers = token
          ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
          : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
        const [groupsResp, cGroupsResp, customersResp] = await Promise.all([
          fetch(GROUPS_ENDPOINT, { headers }),
          fetch('/api/customer-groups/', { headers }),
          fetch('/api/customers/', { headers })
        ]);
        if (!groupsResp.ok) throw new Error('Failed to load groups');
        const groupsData = await groupsResp.json();
        const cgData = cGroupsResp.ok ? await cGroupsResp.json() : [];
        const custData = customersResp.ok ? await customersResp.json() : [];
        const g = groupsData.find(item => item.id === parseInt(id));
        if (!g) throw new Error('Group not found');
        const groupRels = cgData.filter(cg => cg.group === parseInt(id));
        const backendMembers = groupRels.map(cg => {
          const c = custData.find(cust => cust.id === cg.customer);
          if (!c) return null;
          return {
            id: c.id,
            relationId: cg.id,
            ticketNo: cg.group_ticket_no,
            name: c.customer_name || c.name,
            phone: c.mobile_number || c.phone,
            initial: (c.customer_name || c.name || '?').charAt(0).toUpperCase()
          };
        }).filter(Boolean);
        setGroupMembers(backendMembers);
        setGroupData({
          id: g.id,
          name: g.group_name || g.name,
          type: g.type || 'CHIT',
          status: g.status || 'ACTIVE',
          totalPot: g.chit_value ? `₹${g.chit_value}` : `₹${g.totalPot || 0}`,
          currentMonth: g.currentMonth || 1,
          totalMonths: g.duration_months || g.totalMonths || 1,
          slotsFilled: g.slotsFilled || backendMembers.length,
          totalSlots: g.total_members || g.totalSlots || 1,
          startDate: g.start_date || g.startDate || '',
          members: backendMembers
        });
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    // Duplicate fetch logic removed; data fetching is handled in fetchAllData useEffect
    fetchAllData();
  }, [id]);

  const [saveSuccess, setSaveSuccess] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [showMemberConfirm, setShowMemberConfirm] = useState(false);

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('staffToken');
      const headers = token 
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

      const resp = await fetch(`${GROUPS_ENDPOINT}${id}/`, {
        method: 'DELETE',
        headers
      });
      if (!resp.ok) {
        throw new Error('Delete failed');
      }
      setShowConfirm(false);
      navigate('/groups');
    } catch(e) {
      console.error(e);
      alert('Unable to delete group from backend.');
    }
  };

  const deleteMember = async (memberId) => {
    try {
      const member = groupMembers.find(m => m.id === memberId);
      if (!member || !member.relationId) {
         removeLocalMember(memberId);
         return;
      }

      const token = localStorage.getItem('staffToken');
      const headers = token 
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
        
      const resp = await fetch(`/api/customer-groups/${member.relationId}/`, {
        method: 'DELETE',
        headers
      });
      if (!resp.ok) throw new Error('Delete failed');
      
      removeLocalMember(memberId);
    } catch(e) {
      console.error(e);
      alert('Failed to delete member from backend.');
    }
  };

  const removeLocalMember = (memberId) => {
    const updated = groupMembers.filter(m => m.id !== memberId);
    setGroupMembers(updated);
    setGroupData(prev => prev ? { ...prev, members: updated } : prev);
    
    // Clean up payments
    const { [memberId]: _, ...rest } = savedPayments;
    setSavedPayments(rest);
    if (expandedMember === memberId) {
      setExpandedMember(null);
    }
  };

  const cancelMemberDelete = () => {
    setShowMemberConfirm(false);
    setMemberToDelete(null);
  };

  const confirmMemberDelete = () => {
    if (memberToDelete !== null) {
      deleteMember(memberToDelete);
    }
    setShowMemberConfirm(false);
    setMemberToDelete(null);
  };

  if (loading) {
    return (
      <div className="container page-container">
        <p className="info-msg">Loading group details…</p>
      </div>
    );
  }

  if (error || !groupData) {
    return (
      <div className="container page-container">
        <button className="back-btn" onClick={() => navigate('/groups')}>
          <ChevronLeft size={20} strokeWidth={2.5} />
          Back to Groups
        </button>
        <h2 className="error-msg" style={{marginTop: '20px'}}>{error || 'Group not found.'}</h2>
      </div>
    );
  }

  const baseInstallment = Math.round(
    parseInt(groupData.totalPot.replace(/[₹,]/g, '')) / groupData.totalMonths
  );

  const toggleMember = (memberId) => {
    const opening = expandedMember !== memberId;
    setExpandedMember(opening ? memberId : null);
    if (opening && !selectedMonth[memberId]) {
      setSelectedMonth(prev => ({ ...prev, [memberId]: 1 }));
      initForm(memberId, 1);
    }
  };

  const getMonthPayments = (memberId) => savedPayments[memberId] || {};

  const isMonthPaid = (memberId, month) => !!getMonthPayments(memberId)[month];

  const getPaidCount = (memberId) => Object.keys(getMonthPayments(memberId)).length;

  const initForm = (memberId, month) => {
    const key = `${memberId}-${month}`;
    const existing = (savedPayments[memberId] || {})[month];
    setPaymentForms(prev => ({
      ...prev,
      [key]: existing || {
        status: 'paid',
        amount: baseInstallment.toString(),
        mode: 'upi',
        note: ''
      }
    }));
  };

  // Map display labels → backend enum values
  const modeToBackend = { 'UPI': 'UPI', 'CASH': 'CASH', 'BANK_TRANSFER': 'BANK_TRANSFER' };

  const handleMonthClick = (memberId, month) => {
    setSelectedMonth(prev => ({ ...prev, [memberId]: month }));
    initForm(memberId, month);
  };

  const getForm = (memberId, month) => {
    return paymentForms[`${memberId}-${month}`] || {
      status: 'paid',
      amount: baseInstallment.toString(),
      mode: 'upi',
      note: ''
    };
  };

  const modeLabel = { 'UPI': 'UPI', 'CASH': 'Cash', 'BANK_TRANSFER': 'Bank Transfer' };

  const updateForm = (memberId, month, field, value) => {
    const key = `${memberId}-${month}`;
    setPaymentForms(prev => ({
      ...prev,
      [key]: { ...getForm(memberId, month), [field]: value }
    }));
  };

  const saveEntry = async (memberId, month) => {
    const form = getForm(memberId, month);

    // Build payload matching backend field names & enum choices
    const payload = {
      customer: memberId,
      group: parseInt(id),
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      status: form.status,                          // 'paid' | 'pending'
      amount: parseFloat(form.amount),
      payment_mode: form.mode,                      // 'upi' | 'cash' | 'bank_transfer'
      note: form.note,
      month_number: month
    };

    // Optimistically update UI (store with display-friendly shape)
    const uiEntry = {
      status: form.status,
      amount: form.amount,
      mode: form.mode,
      note: form.note,
      date: payload.date
    };
    setSavedPayments(prev => ({
      ...prev,
      [memberId]: { ...getMonthPayments(memberId), [month]: uiEntry }
    }));
    const key = `${memberId}-${month}`;
    setSaveSuccess(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setSaveSuccess(prev => ({ ...prev, [key]: false })), 2500);

    // Persist to backend
    try {
      const token = localStorage.getItem('staffToken');
      const headers = token
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
        : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
      const resp = await fetch('/api/collections/', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.error('Failed to persist collection', resp.status, errBody);
      }
    } catch (e) {
      console.error('Error persisting collection', e);
    }
  };

  const handleWhatsAppShare = (member, month, form) => {
    try {
      const paymentAmount = form.amount;
      const groupName = groupData.name;
      const monthNum = month;
      
      const paidCount = getPaidCount(member.id);
      const totalPaid = paidCount * baseInstallment;
      
      const dueMonths = groupData.totalMonths - paidCount;
      const totalDue = dueMonths * baseInstallment;
      const currentMonthDue = dueMonths > 0 ? baseInstallment : 0;
      const arrearsDue = totalDue - currentMonthDue;

      const message = `*Shri Ram Chits - Payment Receipt*

Dear *${member.name.toUpperCase()}*,
We have received your payment of *₹${paymentAmount}* for Month *${monthNum}* in group *"${groupName}"*.

*Account Summary:*

*Total Amount Paid:* ₹${totalPaid}
*Arrears Due:* ₹${arrearsDue}
*Current Month Due:* ₹${currentMonthDue}
*Total Due:* ₹${totalDue}

Thank you!`;

      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = member.phone.replace(/\D/g, '');
      const waLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(waLink, '_blank');
    } catch (err) {
      console.error('WhatsApp generating error:', err);
      alert('An error occurred while preparing the WhatsApp message.');
    }
  };

  return (
    <div className="container page-container group-details-page">

      <button className="back-btn" onClick={() => navigate('/groups')}>
        <ChevronLeft size={20} strokeWidth={2.5} />
        Back to Groups
      </button>

      <div className="group-details-header">
        <h1>{groupData.name}</h1>
        <div className="header-badges">
          <span className="badge-scheme">{groupData.type} SCHEME</span>
          <span className="badge-active">{groupData.status}</span>
        </div>
      </div>
      {/* ── Delete Confirmation Modal ── */}
      {showMemberConfirm && (
        <div className="delete-modal-overlay" onClick={cancelMemberDelete}>
          <div className="delete-modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="delete-modal-title">Delete Member?</h2>
            <p className="delete-modal-desc">
              Are you sure you want to permanently delete this member? This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel" onClick={cancelMemberDelete}>Cancel</button>
              <button className="delete-modal-confirm" onClick={confirmMemberDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Parameters ── */}
      <div className="section-title">
        <div className="vertical-bar"></div>
        <h2>Group Parameters</h2>
      </div>
      <div className="parameters-card" style={{ position: 'relative' }}>
        <button className="delete-group-btn" onClick={handleDelete}>Delete Group</button>
        <div className="param-grid">
          <div className="param-item">
            <span className="param-label">SCHEME POT</span>
            <span className="param-value text-blue">{groupData.totalPot}</span>
          </div>
          <div className="param-item">
            <span className="param-label">DURATION</span>
            <span className="param-value">{groupData.totalMonths} Months</span>
          </div>
          <div className="param-item">
            <span className="param-label">MONTHLY BASE AMT</span>
            <span className="param-value">₹{baseInstallment.toLocaleString('en-IN')}</span>
          </div>
          <div className="param-item">
            <span className="param-label">SCHEME TYPE</span>
            <span className="param-value-badge">{groupData.type}</span>
          </div>
          <div className="param-item">
            <span className="param-label">START DATE</span>
            <span className="param-value">{groupData.startDate}</span>
          </div>
          <div className="param-item">
            <span className="param-label">CAPACITY SLOTS</span>
            <span className="param-value">{groupData.slotsFilled} / {groupData.totalSlots}</span>
          </div>
        </div>
      </div>
      {/* ── Delete Group Confirmation Modal ── */}
      {showConfirm && (
        <div className="delete-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="delete-modal-card" onClick={e => e.stopPropagation()}>
            <h2 className="delete-modal-title">Delete Group?</h2>
            <p className="delete-modal-desc">Are you sure you want to permanently delete this group? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="delete-modal-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="delete-modal-confirm" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Members ── */}
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="vertical-bar"></div>
          <h2>Group Members</h2>
        </div>
        <button 
          className="add-member-btn" 
          onClick={openAddMemberModal}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#2563eb', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
          }}
        >
          <UserPlus size={16} /> Add Member
        </button>
      </div>

      {showAddMemberModal && (
        <div className="delete-modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="delete-modal-card" style={{ maxWidth: '500px', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Add Subscriber to Group</h2>
              <button onClick={() => setShowAddMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '16px 24px' }}>
              <div className="search-wrapper" style={{ margin: 0 }}>
                <Search size={16} className="search-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search subscribers..."
                  value={subSearch}
                  onChange={e => setSubSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '0 24px 24px' }}>
              {subsLoading ? (
                <p style={{ textAlign: 'center', color: '#64748b', margin: '20px 0' }}>Loading subscribers...</p>
              ) : availableSubscribers.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', margin: '20px 0' }}>No subscribers found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {availableSubscribers
                    .filter(s => s.name?.toLowerCase().includes(subSearch.toLowerCase()) || s.phone?.includes(subSearch))
                    .map(sub => {
                      const isAdded = groupMembers.some(m => m.id === sub.id);
                      return (
                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: isAdded ? '#f8fafc' : '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {sub.initial}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{sub.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{sub.phone}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddSubscriber(sub)}
                            disabled={isAdded}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: isAdded ? 'default' : 'pointer',
                              background: isAdded ? '#e2e8f0' : '#eff6ff', color: isAdded ? '#94a3b8' : '#2563eb'
                            }}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="members-accordion">
        {groupData.members.length === 0 ? (
          <div className="empty-members">No members added yet.</div>
        ) : (
          groupData.members.map(member => {
            const isOpen = expandedMember === member.id;
            const activeMonth = selectedMonth[member.id] || 1;
            const paidCount = getPaidCount(member.id);
            const form = getForm(member.id, activeMonth);
            const successKey = `${member.id}-${activeMonth}`;
            const monthPayments = getMonthPayments(member.id);

            return (
                            <div className={`accordion-card ${isOpen ? 'open' : ''}`} key={`${member.id}-${member.relationId}`}>

                {/* ── Member Row Header ── */}
                <div className="accordion-header" onClick={() => toggleMember(member.id)}>
                  <div className="acc-member-left">
                    <div className="member-avatar">{member.initial}</div>
                    <div className="acc-member-info">
                      <div className="member-name-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span 
                          className="member-name"
                          style={{ cursor: 'pointer', color: '#005ce6', textDecoration: 'underline' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/subscribers/${member.id}`);
                          }}
                          title="View Subscriber Details"
                        >
                          {member.name}
                        </span>
                        <button
                          className="delete-member-btn"
                          onClick={(e) => { e.stopPropagation(); setMemberToDelete(member.id); setShowMemberConfirm(true); }}
                          style={{ background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="member-subinfo" style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                        <span className="member-phone">Mobile: {member.phone}</span>
                        <span className="member-agent" style={{ marginLeft: '12px' }}>Agent: {`Agent-${member.id}`}</span>
                      </div>
                      <div className="member-stats" style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem' }}>
                        <span>Inst Paid: {getPaidCount(member.id)}</span>
                        <span>Due Inst: {groupData.totalMonths - getPaidCount(member.id)}</span>
                        <span>Arrears Due: ₹{((groupData.totalMonths - getPaidCount(member.id)) > 0 ? (groupData.totalMonths - getPaidCount(member.id) - 1) * baseInstallment : 0).toLocaleString('en-IN')}</span>
                        <span>Current Due: ₹{((groupData.totalMonths - getPaidCount(member.id)) > 0 ? baseInstallment : 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="acc-member-right">
                    <span className="paid-badge">
                      {paidCount}/{groupData.totalMonths} PAID
                    </span>
                    {isOpen
                      ? <ChevronUp size={20} color="#64748b" />
                      : <ChevronDown size={20} color="#64748b" />
                    }
                  </div>
                </div>

                {/* ── Expanded Body ── */}
                {isOpen && (
                  <div className="accordion-body">

                    {/* Month Bubbles */}
                    <p className="field-label" style={{ marginBottom: '10px' }}>
                      Month-by-Month Installments
                    </p>
                    <div className="month-bubbles">
                      {Array.from({ length: groupData.totalMonths }, (_, i) => i + 1).map(m => {
                        const paid = isMonthPaid(member.id, m);
                        const active = activeMonth === m;
                        return (
                          <button
                            key={m}
                            className={`month-bubble ${paid ? 'bubble-paid' : ''} ${active && !paid ? 'bubble-active' : ''}`}
                            onClick={() => handleMonthClick(member.id, m)}
                          >
                            M{m}{paid && <Check size={10} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Payment Form */}
                    <div className="payment-form-card">
                      <div className="pf-header">
                        <span className="pf-title">Enter Payment: Month {activeMonth}</span>
                        <span className="pf-expected">
                          Expected: ₹{baseInstallment.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* PAID / PENDING */}
                      <div className="status-toggle">
                        <button
                          className={`toggle-btn paid-btn ${form.status === 'paid' ? 'active-paid' : ''}`}
                          onClick={() => updateForm(member.id, activeMonth, 'status', 'paid')}
                        >
                          ✓ PAID
                        </button>
                        <button
                          className={`toggle-btn pending-btn ${form.status === 'pending' ? 'active-pending' : ''}`}
                          onClick={() => updateForm(member.id, activeMonth, 'status', 'pending')}
                        >
                          ✕ PENDING
                        </button>
                      </div>

                      {/* Amount, Mode, Note — only shown when PAID */}
                      {form.status === 'paid' && (
                        <>
                          <div className="form-field">
                            <label className="field-label">Manually Received Amount (₹)</label>
                            <input
                              type="number"
                              className="field-input"
                              value={form.amount}
                              placeholder={baseInstallment.toString()}
                              onChange={e => updateForm(member.id, activeMonth, 'amount', e.target.value)}
                            />
                          </div>

                          <div className="form-field">
                            <label className="field-label">Payment Mode</label>
                            <div className="mode-selector">
                              {[
                                { id: 'upi', label: 'UPI', icon: Smartphone },
                                { id: 'cash', label: 'Cash', icon: Banknote },
                                { id: 'bank_transfer', label: 'Bank Transfer', icon: Landmark }
                              ].map(mode => (
                                <button
                                  key={mode.id}
                                  className={`mode-btn ${form.mode === mode.id ? 'mode-active' : ''}`}
                                  onClick={() => updateForm(member.id, activeMonth, 'mode', mode.id)}
                                >
                                  <mode.icon size={18} strokeWidth={2.5} className="mode-icon" />
                                  <span>{mode.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="form-field">
                            <label className="field-label">Transaction Ref / Note</label>
                            <input
                              type="text"
                              className="field-input"
                              value={form.note}
                              placeholder={`TXN-G${id}-${member.id}-${activeMonth}`}
                              onChange={e => updateForm(member.id, activeMonth, 'note', e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* Save and Share Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="save-entry-btn"
                          style={{ flex: 1 }}
                          onClick={() => saveEntry(member.id, activeMonth)}
                        >
                          Save Collection Entry
                        </button>
                        
                        <button
                          className="wa-share-btn"
                          style={{ 
                            flex: 1, background: '#25D366', color: '#fff', border: 'none', 
                            borderRadius: '8px', fontWeight: 600, display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                            fontSize: '0.95rem', padding: '12px'
                          }}
                          onClick={() => handleWhatsAppShare(member, activeMonth, form)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          Share Receipt
                        </button>
                      </div>

                      {saveSuccess[successKey] && (
                        <div className="save-success-msg">
                          ✓ Entry saved for Month {activeMonth}!
                        </div>
                      )}
                    </div>

                    {/* Mini Payment Log */}
                    {Object.keys(monthPayments).length > 0 && (
                      <div className="mini-log">
                        <p className="field-label" style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                          Payment Collection Log
                        </p>
                        <div className="mini-log-table">
                          <div className="mini-log-head">
                            <span>Month</span><span>Amount</span><span>Mode</span><span>Status</span>
                          </div>
                          {Object.entries(monthPayments)
                            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                            .map(([m, p]) => (
                              <div className="mini-log-row" key={m}>
                                <span>M{m}</span>
                                <span className="log-amount">
                                  ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                                </span>
                                <span>{(p.mode || '').replace('_', ' ').toUpperCase()}</span>
                                <span className={p.status === 'paid' ? 'log-paid' : 'log-pending'}>
                                  {(p.status || '').toUpperCase()}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GroupDetails;
