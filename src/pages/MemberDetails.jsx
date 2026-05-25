import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Phone, Calendar, CreditCard, CheckCircle, Clock, AlertCircle, PlusCircle } from 'lucide-react';
import { groupsData } from '../data/mockData';
import './MemberDetails.css';

const MemberDetails = () => {
  const navigate = useNavigate();
  const { groupId, memberId } = useParams();

  const group = groupsData.find(g => g.id === parseInt(groupId));
  const member = group?.members.find(m => m.id === parseInt(memberId));

  const [payments, setPayments] = useState(member?.payments || []);
  const [form, setForm] = useState({
    month: '',
    amount: '',
    mode: 'Cash',
    note: ''
  });
  const [saved, setSaved] = useState(false);

  if (!group || !member) {
    return (
      <div className="container page-container">
        <button className="back-btn" onClick={() => navigate(`/groups/${groupId}`)}>
          <ChevronLeft size={20} /> Back to Group
        </button>
        <h2>Member not found.</h2>
      </div>
    );
  }

  const baseInstallment = Math.round(
    parseInt(group.totalPot.replace(/[₹,]/g, '')) / group.totalMonths
  );

  // Build month-wise grid
  const monthStatuses = Array.from({ length: group.totalMonths }, (_, i) => {
    const monthNum = i + 1;
    const payment = payments.find(p => p.month === monthNum);
    if (payment) return { month: monthNum, status: 'paid', payment };
    if (monthNum < group.currentMonth) return { month: monthNum, status: 'overdue', payment: null };
    if (monthNum === group.currentMonth) return { month: monthNum, status: 'due', payment: null };
    return { month: monthNum, status: 'upcoming', payment: null };
  });

  const paidCount = payments.length;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleSave = () => {
    if (!form.month || !form.amount) return;
    const monthNum = parseInt(form.month);
    if (monthNum < 1 || monthNum > group.totalMonths) return;

    const newEntry = {
      id: Date.now(),
      month: monthNum,
      amount: parseFloat(form.amount),
      mode: form.mode,
      note: form.note,
      date: new Date().toLocaleDateString('en-IN')
    };

    const updated = [...payments.filter(p => p.month !== monthNum), newEntry];
    setPayments(updated);
    // Persist to mock data
    if (member) member.payments = updated;

    setForm({ month: '', amount: '', mode: 'Cash', note: '' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const statusIcon = (status) => {
    if (status === 'paid') return <CheckCircle size={14} />;
    if (status === 'overdue') return <AlertCircle size={14} />;
    if (status === 'due') return <Clock size={14} />;
    return null;
  };

  return (
    <div className="member-details-page">
      <div className="container page-container">

        {/* Back */}
        <button className="back-btn" onClick={() => navigate(`/groups/${groupId}`)}>
          <ChevronLeft size={20} strokeWidth={2.5} />
          Back to Group
        </button>

        {/* Member Header Card */}
        <div className="member-hero-card">
          <div className="member-hero-left">
            <div className="member-avatar-large">{member.name.charAt(0)}</div>
            <div>
              <h1 className="member-hero-name">{member.name}</h1>
              <div className="member-hero-meta">
                <span><Phone size={14} /> {member.phone}</span>
                <span><Calendar size={14} /> Joined: {group.startDate}</span>
              </div>
              <div className="member-hero-group">
                <span className="group-pill">{group.name}</span>
              </div>
            </div>
          </div>
          <div className="member-hero-stats">
            <div className="stat-box">
              <span className="stat-label">Paid</span>
              <span className="stat-value green">{paidCount}/{group.totalMonths}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Total Paid</span>
              <span className="stat-value blue">₹{totalPaid.toLocaleString('en-IN')}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Base Amt</span>
              <span className="stat-value">₹{baseInstallment.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Month-wise Grid */}
        <div className="section-title">
          <div className="vertical-bar"></div>
          <h2>Month-wise Payment Status</h2>
        </div>
        <div className="month-grid">
          {monthStatuses.map(({ month, status, payment }) => (
            <div key={month} className={`month-cell ${status}`}>
              <span className="month-label">M{month}</span>
              <span className="month-status-icon">{statusIcon(status)}</span>
              {payment && (
                <span className="month-amount">₹{payment.amount.toLocaleString('en-IN')}</span>
              )}
            </div>
          ))}
        </div>
        <div className="month-legend">
          <span className="legend-item paid"><CheckCircle size={12} /> Paid</span>
          <span className="legend-item due"><Clock size={12} /> Due</span>
          <span className="legend-item overdue"><AlertCircle size={12} /> Overdue</span>
          <span className="legend-item upcoming">○ Upcoming</span>
        </div>

        {/* Save Collection Entry */}
        <div className="section-title" style={{ marginTop: '36px' }}>
          <div className="vertical-bar"></div>
          <h2>Save Collection Entry</h2>
        </div>
        <div className="collection-form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Month Number</label>
              <input
                type="number"
                placeholder={`1 – ${group.totalMonths}`}
                min="1"
                max={group.totalMonths}
                value={form.month}
                onChange={e => setForm(prev => ({ ...prev, month: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="number"
                placeholder={baseInstallment.toString()}
                value={form.amount}
                onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Payment Mode</label>
              <select
                value={form.mode}
                onChange={e => setForm(prev => ({ ...prev, mode: e.target.value }))}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label>Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Paid via PhonePe"
                value={form.note}
                onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
          <button className="save-btn" onClick={handleSave}>
            <PlusCircle size={18} />
            Save Collection Entry
          </button>
          {saved && (
            <div className="save-success">
              <CheckCircle size={16} /> Payment entry saved successfully!
            </div>
          )}
        </div>

        {/* Payment Collection Log */}
        <div className="section-title" style={{ marginTop: '36px' }}>
          <div className="vertical-bar"></div>
          <h2>Payment Collection Log</h2>
        </div>

        {payments.length === 0 ? (
          <div className="empty-log">
            <CreditCard size={36} color="#cbd5e1" />
            <p>No payment records yet. Use the form above to add entries.</p>
          </div>
        ) : (
          <div className="payment-log-table">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...payments]
                  .sort((a, b) => a.month - b.month)
                  .map(p => (
                    <tr key={p.id}>
                      <td><strong>Month {p.month}</strong></td>
                      <td className="amount-cell">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className="mode-badge">{p.mode}</span>
                      </td>
                      <td>{p.date}</td>
                      <td className="note-cell">{p.note || '—'}</td>
                      <td>
                        <span className="status-badge status-active">
                          <CheckCircle size={12} /> Paid
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default MemberDetails;
