import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Phone, Mail, MapPin, Users, User, Briefcase, Landmark, ShieldCheck, FileText, Calendar, Building, Edit2, Save, X } from 'lucide-react';
import { subscribersData, groupsData } from '../data/mockData';
import './SubscriberDetails.css';

const SubscriberDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscriber, setSubscriber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [joinedSchemes, setJoinedSchemes] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSub = useCallback(async () => {
    try {
      const token = localStorage.getItem('staffToken');
      const headers = token ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      } : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

      const mapSub = (sub) => ({
        ...sub,
        id: sub.id,
        name: sub.customer_name || sub.name,
        phone: sub.mobile_number || sub.phone,
        branchName: sub.branch_name || sub.branchName,
        date: sub.joined_date || sub.date,
        email: sub.email,
        fatherName: sub.father_husband_name || sub.fatherName,
        dob: sub.date_of_birth || sub.dob,
        gender: sub.gender,
        maritalStatus: sub.marital_status || sub.maritalStatus,
        subscriberStatus: sub.subscriber_status || sub.subscriberStatus,
        incomeSource: sub.income_source || sub.incomeSource,
        address: sub.residence_address || sub.address,
        gstNo: sub.gst_number || sub.gstNo,
        businessAddress: sub.business_address || sub.businessAddress,
        agentName: sub.agent_name || sub.agentName,
        admissionFees: sub.admission_fees || sub.admissionFees,
        chitValue: sub.chit_value || sub.chitValue,
        groupNo: sub.group_ticket_no || sub.groupNo,
        monthlyInst: sub.monthly_installment || sub.monthlyInst,
        duration: sub.duration,
        place: sub.place,
        bankName: sub.bank_name || sub.bankName,
        bankBranch: sub.branch || sub.bankBranch,
        acType: sub.account_number || sub.acType,
        ifsc: sub.ifsc_code || sub.ifsc,
        nomineeName: sub.nominee_name || sub.nomineeName,
        nomineeAge: sub.nominee_age || sub.nomineeAge,
        nomineeRelationship: sub.nominee_relationship || sub.nomineeRelationship,
        idProofType: sub.proof_type || sub.idProofType,
        idProofNo: sub.id_proof_number || sub.idProofNo,
        witness1: sub.witness_one || sub.witness1,
        witness2: sub.witness_two || sub.witness2,
        initial: (sub.customer_name || sub.name || '?').charAt(0).toUpperCase()
      });

      const resp = await fetch(`/api/customers/${id}?t=${Date.now()}`, { headers, cache: 'no-store' });
      if (!resp.ok) {
        if (resp.status === 404 || resp.status === 500) {
           const allResp = await fetch(`/api/customers/?t=${Date.now()}`, { headers, cache: 'no-store' });
           if (!allResp.ok) throw new Error('Not found');
           const allData = await allResp.json();
           const allSubs = Array.isArray(allData) ? allData : (allData.data || []);
           const found = allSubs.find(s => String(s.id) === String(id));
           if (!found) throw new Error('Subscriber not found');
           setSubscriber(mapSub(found));
           return;
        }
        throw new Error('Not found');
      }
      
      const data = await resp.json();
      const subData = data.data || data;
      setSubscriber(mapSub(subData));
    } catch (e) {
      console.error(e);
      setError('Subscriber not found.');
      setSubscriber(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchJoinedSchemes = useCallback(async () => {
    try {
      const token = localStorage.getItem('staffToken');
      const headers = token ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      } : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

      const [groupsResp, cGroupsResp] = await Promise.all([
        fetch(`/api/groups/?t=${Date.now()}`, { headers, cache: 'no-store' }),
        fetch(`/api/customer-groups/?t=${Date.now()}`, { headers, cache: 'no-store' })
      ]);

      if (!groupsResp.ok || !cGroupsResp.ok) return;

      const groupsRaw = await groupsResp.json();
      const cgDataRaw = await cGroupsResp.json();

      const groups = Array.isArray(groupsRaw) ? groupsRaw : (groupsRaw.results || groupsRaw.data || []);
      const cgData = Array.isArray(cgDataRaw) ? cgDataRaw : (cgDataRaw.results || cgDataRaw.data || []);

      const subscriberGroups = cgData.filter(cg => String(cg.customer) === String(id));

      const schemes = subscriberGroups.map(cg => {
        const groupInfo = groups.find(g => String(g.id) === String(cg.group));
        if (!groupInfo) return null;
        return {
          id: groupInfo.id,
          name: groupInfo.group_name || groupInfo.name,
          type: groupInfo.type || 'CHIT',
          assignedSlot: cg.group_ticket_no || 'N/A'
        };
      }).filter(Boolean);

      setJoinedSchemes(schemes);
    } catch (e) {
      console.error('Failed to fetch joined schemes', e);
    }
  }, [id]);

  useEffect(() => {
    fetchSub();
    fetchJoinedSchemes();
  }, [fetchSub, fetchJoinedSchemes, fetchTrigger]);

  if (loading) {
    return (
      <div className="container sub-detail-page">
        <button className="back-btn" onClick={() => navigate('/subscribers')}>
          <ChevronLeft size={20} strokeWidth={2.5} /> Back to Subscribers
        </button>
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
      </div>
    );
  }

  if (error || !subscriber) {
    return (
      <div className="container sub-detail-page">
        <button className="back-btn" onClick={() => navigate('/subscribers')}>
          <ChevronLeft size={20} strokeWidth={2.5} /> Back to Subscribers
        </button>
        <h2>{error || 'Subscriber not found.'}</h2>
      </div>
    );
  }

  const handleEditToggle = () => {
    if (isEditing) {
      setIsEditing(false);
      setEditForm(null);
    } else {
      setEditForm({ ...subscriber });
      setIsEditing(true);
    }
  };

  const handleEditChange = (e, field) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        branch_name: editForm.branchName || '',
        agent_name: editForm.agentName || '',
        admission_fees: editForm.admissionFees || '0',
        customer_name: editForm.name || '',
        father_husband_name: editForm.fatherName || 'N/A',
        date_of_birth: editForm.dob || '1990-01-01',
        gender: editForm.gender ? editForm.gender.toLowerCase() : 'male',
        marital_status: editForm.maritalStatus ? editForm.maritalStatus.toLowerCase() : 'single',
        subscriber_status: editForm.subscriberStatus ? editForm.subscriberStatus.toLowerCase() : 'individual',
        income_source: editForm.incomeSource ? editForm.incomeSource.toLowerCase() : 'salary',
        email: editForm.email || 'noemail@example.com',
        mobile_number: editForm.phone || '',
        bank_name: editForm.bankName || 'N/A',
        branch: editForm.bankBranch || 'N/A',
        account_number: editForm.acType || 'N/A',
        ifsc_code: editForm.ifsc || 'N/A',
        residence_address: editForm.address || 'N/A',
        nominee_name: editForm.nomineeName || 'N/A',
        nominee_age: editForm.nomineeAge || 0,
        nominee_relationship: editForm.nomineeRelationship || 'N/A',
        witness_one: editForm.witness1 || 'N/A',
        witness_two: editForm.witness2 || 'N/A',
        proof_type: editForm.idProofType ? editForm.idProofType.toLowerCase().replace(' ', '_') : 'aadhar',
        place: editForm.place || 'N/A',
        gst_number: editForm.gstNo || '',
        business_address: editForm.businessAddress || 'N/A',
        id_proof_number: editForm.idProofNo || 'N/A',
        chit_value: editForm.chitValue || '0',
        group_ticket_no: editForm.groupNo || 'N/A',
        monthly_installment: editForm.monthlyInst || '0',
        duration: editForm.duration || '0'
      };

      const token = localStorage.getItem('staffToken');
      const headers = token ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      } : { 'Content-Type': 'application/json' };

      const resp = await fetch(`/api/customers/${id}/`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error('Failed to update subscriber');
      
      setFetchTrigger(prev => prev + 1);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save changes. ' + (e.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (label, value, fieldName) => {
    if (isEditing && fieldName) {
      return (
        <div className="sd-field">
          <span className="sd-field-label">{label}</span>
          <input 
            type="text"
            className="sd-edit-input"
            value={editForm[fieldName] || ''}
            onChange={(e) => handleEditChange(e, fieldName)}
            placeholder={label}
          />
        </div>
      );
    }
    return (
      <div className="sd-field">
        <span className="sd-field-label">{label}</span>
        <span className="sd-field-value">{value || 'N/A'}</span>
      </div>
    );
  };

  return (
    <div className="container sub-detail-page">
      <div className="sd-header-top">
        <button className="back-btn" onClick={() => navigate('/subscribers')}>
          <ChevronLeft size={18} strokeWidth={2.5} />
          Back to Subscribers
        </button>
        <div className="sd-actions">
          {isEditing ? (
            <>
              <button className="cancel-btn" onClick={handleEditToggle} disabled={isSaving}>
                <X size={16} /> Cancel
              </button>
              <button className="save-btn" onClick={handleSave} disabled={isSaving}>
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className="edit-btn" onClick={handleEditToggle}>
              <Edit2 size={16} /> Edit Details
            </button>
          )}
        </div>
      </div>

      <div className="sd-header-wrapper">
        <div className="sd-avatar-large">{subscriber.initial}</div>
        <div className="sd-title-area">
          {isEditing ? (
            <input 
              type="text" 
              className="sd-edit-input" 
              style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}
              value={editForm.name || ''} 
              onChange={e => handleEditChange(e, 'name')}
            />
          ) : (
            <h1 className="sd-page-title highlight-text">{subscriber.name}</h1>
          )}
          <div className="sd-sub-badges">
            <span className="sd-pill-badge"><Calendar size={14} /> Enrolled: <strong>{subscriber.registered || subscriber.date || 'N/A'}</strong></span>
            <span className="sd-pill-badge"><Building size={14} /> Branch: <strong>{subscriber.branchName || 'Main Branch'}</strong></span>
          </div>
          <div className="sd-meta">
            <span className="sd-meta-item"><Phone size={14} /> {subscriber.phone}</span>
            {subscriber.email && <span className="sd-meta-item"><Mail size={14} /> {subscriber.email}</span>}
          </div>
        </div>
      </div>

      <div className="sd-grid-layout">
        <div className="sd-card">
          <div className="sd-card-header">
            <User size={24} color="#2563eb" />
            <h3>Personal Details</h3>
          </div>
          <div className="sd-card-body grid-2">
            {renderField("Father's / Husband's Name", subscriber.fatherName, 'fatherName')}
            {renderField("Date of Birth", subscriber.dob, 'dob')}
            {renderField("Gender", subscriber.gender, 'gender')}
            {renderField("Marital Status", subscriber.maritalStatus, 'maritalStatus')}
            {renderField("Subscriber Status", subscriber.subscriberStatus, 'subscriberStatus')}
            {renderField("Income Source", subscriber.incomeSource, 'incomeSource')}
            {isEditing ? (
              <div className="sd-field full-width">
                <span className="sd-field-label">Residence Address</span>
                <textarea 
                  className="sd-edit-input"
                  rows={2}
                  value={editForm.address || ''}
                  onChange={e => handleEditChange(e, 'address')}
                />
              </div>
            ) : (
              <div className="sd-field full-width">
                <span className="sd-field-label">Residence Address</span>
                <span className="sd-field-value">{subscriber.address || 'N/A'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <Briefcase size={24} color="#2563eb" />
            <h3>Business & Professional</h3>
          </div>
          <div className="sd-card-body grid-2">
            {renderField("GST No", subscriber.gstNo, 'gstNo')}
            {isEditing ? (
              <div className="sd-field full-width">
                <span className="sd-field-label">Business / Office Address</span>
                <textarea 
                  className="sd-edit-input"
                  rows={2}
                  value={editForm.businessAddress || ''}
                  onChange={e => handleEditChange(e, 'businessAddress')}
                />
              </div>
            ) : (
              <div className="sd-field full-width">
                <span className="sd-field-label">Business / Office Address</span>
                <span className="sd-field-value">{subscriber.businessAddress || 'N/A'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <FileText size={24} color="#2563eb" />
            <h3>Enrollment Details</h3>
          </div>
          <div className="sd-card-body grid-2">
            {renderField("Branch Name", subscriber.branchName, 'branchName')}
            {renderField("Agent Name", subscriber.agentName, 'agentName')}
            {renderField("Chit Value", subscriber.chitValue ? (isEditing ? subscriber.chitValue : `₹${subscriber.chitValue}`) : '', 'chitValue')}
            {renderField("Group / Tkt No", subscriber.groupNo, 'groupNo')}
            {renderField("Monthly Inst. Amt", subscriber.monthlyInst ? (isEditing ? subscriber.monthlyInst : `₹${subscriber.monthlyInst}`) : '', 'monthlyInst')}
            {renderField("Duration (Months)", subscriber.duration, 'duration')}
            {renderField("Admission Fees", subscriber.admissionFees ? (isEditing ? subscriber.admissionFees : `₹${subscriber.admissionFees}`) : '', 'admissionFees')}
            {renderField("Date", subscriber.date, 'date')}
            {renderField("Place", subscriber.place, 'place')}
          </div>
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <Landmark size={24} color="#2563eb" />
            <h3>Bank & Nominee Details</h3>
          </div>
          <div className="sd-card-body grid-2">
            {renderField("Bank Name", subscriber.bankName, 'bankName')}
            {renderField("Branch", subscriber.bankBranch, 'bankBranch')}
            {renderField("A/c Type", subscriber.acType, 'acType')}
            {renderField("IFSC Code", subscriber.ifsc, 'ifsc')}
            <div className="divider full-width"></div>
            {renderField("Nominee Name", subscriber.nomineeName, 'nomineeName')}
            {renderField("Nominee Age", subscriber.nomineeAge, 'nomineeAge')}
            {renderField("Relationship", subscriber.nomineeRelationship, 'nomineeRelationship')}
          </div>
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <ShieldCheck size={24} color="#2563eb" />
            <h3>Witnesses & Declaration</h3>
          </div>
          <div className="sd-card-body grid-2">
            {renderField("ID Proof Type", subscriber.idProofType, 'idProofType')}
            {renderField("ID Proof Number", subscriber.idProofNo, 'idProofNo')}
            <div className="divider full-width"></div>
            {isEditing ? (
              <>
                <div className="sd-field full-width">
                  <span className="sd-field-label">Witness - 1</span>
                  <textarea 
                    className="sd-edit-input"
                    rows={2}
                    value={editForm.witness1 || ''}
                    onChange={e => handleEditChange(e, 'witness1')}
                  />
                </div>
                <div className="sd-field full-width">
                  <span className="sd-field-label">Witness - 2</span>
                  <textarea 
                    className="sd-edit-input"
                    rows={2}
                    value={editForm.witness2 || ''}
                    onChange={e => handleEditChange(e, 'witness2')}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="sd-field full-width">
                  <span className="sd-field-label">Witness - 1</span>
                  <span className="sd-field-value">{subscriber.witness1 || 'N/A'}</span>
                </div>
                <div className="sd-field full-width">
                  <span className="sd-field-label">Witness - 2</span>
                  <span className="sd-field-value">{subscriber.witness2 || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sd-section-title" style={{ marginTop: '32px', marginBottom: '16px' }}>
        <div className="sd-vertical-bar"></div>
        <h2>Joined Schemes</h2>
      </div>

      <div className="sd-schemes-list">
        {joinedSchemes.length === 0 ? (
          <div className="sd-empty">No schemes joined yet.</div>
        ) : (
          joinedSchemes.map(scheme => (
            <div
              className="sd-scheme-item"
              key={scheme.id}
              onClick={() => navigate(`/groups/${scheme.id}`)}
            >
              <div className="sd-scheme-left">
                <div className="sd-scheme-icon">
                  <Users size={18} color="#005ce6" />
                </div>
                <div className="sd-scheme-info">
                  <h4>{scheme.name}</h4>
                  <span>Assigned Member Slot: #{scheme.assignedSlot}</span>
                </div>
              </div>
              <div className="sd-scheme-right">
                <span className={`sd-badge sd-badge-${scheme.type.toLowerCase()}`}>
                  {scheme.type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubscriberDetails;
