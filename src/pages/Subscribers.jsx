import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ChevronRight, Phone, Search, Building, User, Mail, FileText, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { groupsData } from '../data/mockData';
import './Subscribers.css';

// API endpoint for subscribers (proxied via Vite)
const SUBSCRIBERS_ENDPOINT = '/api/customers/';

const emptyForm = {
  branchName: '', agentName: '', chitValue: '', groupNo: '', monthlyInst: '', duration: '', admissionFees: '',
  name: '', fatherName: '', dob: '', gender: '', maritalStatus: '', subscriberStatus: '', gstNo: '', incomeSource: '', email: '', phone: '', address: '', businessAddress: '',
  bankName: '', bankBranch: '', acType: '', ifsc: '', nomineeName: '', nomineeAge: '', nomineeRelationship: '',
  witness1: '', witness2: '', idProofType: '', idProofNo: '', place: '', date: ''
};

const Subscribers = () => {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [customerGroups, setCustomerGroups] = useState([]);
  
  const [deleteModal, setDeleteModal] = useState({ open: false, subscriber: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper: build request headers – include auth only if we have a token
  const getHeaders = () => {
    const token = localStorage.getItem('staffToken');
    return token
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        }
      : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
  };

  const fetchSubs = async () => {
    try {
      const resp = await fetch(`${SUBSCRIBERS_ENDPOINT}?t=${Date.now()}`, { 
        headers: getHeaders(),
        cache: 'no-store'
      });
      
      // Fetch customer-groups to calculate scheme counts
      const cgResp = await fetch(`/api/customer-groups/?t=${Date.now()}`, {
        headers: getHeaders(),
        cache: 'no-store'
      });
      const cgDataRaw = cgResp.ok ? await cgResp.json() : [];
      const cgData = Array.isArray(cgDataRaw) ? cgDataRaw : (cgDataRaw.results || cgDataRaw.data || []);
      setCustomerGroups(cgData);

      if (!resp.ok) throw new Error('Failed to load subscribers');
      const data = await resp.json();
      const subsArray = Array.isArray(data) ? data : (data.data || []);
      const processedSubs = subsArray.map(sub => ({
        ...sub,
        id: sub.id,
        name: sub.customer_name,
        phone: sub.mobile_number,
        branchName: sub.branch_name,
        date: sub.joined_date,
        initial: sub.customer_name ? sub.customer_name.charAt(0).toUpperCase() : '?'
      }));
      // Reverse to show newest first, assuming the backend returns in insertion order
      setSubscribers(processedSubs.reverse());
    } catch (e) {
      console.error(e);
      // Don't show error to user for empty GET initially, just set empty array
      setSubscribers([]);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const filtered = subscribers.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery)
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    // Ensure any previous error is cleared before validation
    setError('');
    if (!form.name || !form.phone || !form.branchName) {
      setError('Please fill in required fields (Name, Phone, Branch)');
      return;
    }
    try {
      const payload = {
        branch_name: form.branchName,
        agent_name: form.agentName,
        admission_fees: form.admissionFees || '0',
        customer_name: form.name,
        father_husband_name: form.fatherName || 'N/A',
        date_of_birth: form.dob || '1990-01-01',
        gender: form.gender ? form.gender.toLowerCase() : 'male',
        marital_status: form.maritalStatus ? form.maritalStatus.toLowerCase() : 'single',
        subscriber_status: form.subscriberStatus ? form.subscriberStatus.toLowerCase() : 'individual',
        income_source: form.incomeSource ? form.incomeSource.toLowerCase() : 'salary',
        email: form.email || 'noemail@example.com',
        mobile_number: form.phone,
        bank_name: form.bankName || 'N/A',
        branch: form.bankBranch || 'N/A',
        account_number: form.acType || 'N/A',
        ifsc_code: form.ifsc || 'N/A',
        residence_address: form.address || 'N/A',
        nominee_name: form.nomineeName || 'N/A',
        nominee_age: form.nomineeAge || 0,
        nominee_relationship: form.nomineeRelationship || 'N/A',
        witness_one: form.witness1 || 'N/A',
        witness_two: form.witness2 || 'N/A',
        proof_type: form.idProofType ? form.idProofType.toLowerCase().replace(' ', '_') : 'aadhar',
        place: form.place || 'N/A',
        // --- Missing Fields added ---
        gst_number: form.gstNo || '',
        business_address: form.businessAddress || 'N/A',
        id_proof_number: form.idProofNo || 'N/A',
        chit_value: form.chitValue || '0',
        group_ticket_no: form.groupNo || 'N/A',
        monthly_installment: form.monthlyInst || '0',
        duration: form.duration || '0'
      };

      const resp = await fetch(SUBSCRIBERS_ENDPOINT, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const created = await resp.json();
      
      // If the backend returns an error object but status 200
      if (created && typeof created === 'object' && !created.id && !created.data && Object.keys(created).length > 0) {
         // It's likely a validation error map
         const errorMsg = Object.entries(created).map(([k, v]) => `${k}: ${v}`).join(', ');
         throw new Error(`Validation Error: ${errorMsg}`);
      }

      if (!resp.ok) {
        throw new Error(`Create subscriber failed (${resp.status})`);
      }
      
      setIsModalOpen(false);
      setForm(emptyForm);
      setStep(1);
      setError('');
      
      // Refresh the list directly from the server to ensure consistency
      await fetchSubs();
    } catch (e) {
      console.error('Add subscriber error:', e);
      setError(e.message || 'Unable to add subscriber');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setStep(1);
    setError('');
  };

  const confirmDelete = (e, sub) => {
    e.stopPropagation();
    setDeleteModal({ open: true, subscriber: sub });
  };

  const executeDelete = async () => {
    if (!deleteModal.subscriber) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`${SUBSCRIBERS_ENDPOINT}${deleteModal.subscriber.id}/`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!resp.ok) {
         throw new Error(`Delete failed (${resp.status})`);
      }
      setSubscribers(prev => prev.filter(s => s.id !== deleteModal.subscriber.id));
      setDeleteModal({ open: false, subscriber: null });
    } catch (e) {
      console.error("Failed to delete subscriber", e);
      setError("Failed to delete subscriber: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="sub-page container">
      <div className="sub-header">
        <div className="sub-header-left">
          <Users size={28} color="#1d4ed8" />
          <h1>Subscribers</h1>
        </div>
        <button className="add-sub-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} strokeWidth={2.5} />
          Add Subscriber
        </button>
      </div>

      <div className="search-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search subscriber name or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <p className="sub-count">{filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}</p>

      <div className="sub-list">
        {filtered.length === 0 ? (
          <div className="sub-empty">No subscribers found for "{searchQuery}".</div>
        ) : (
          filtered.map(sub => {
            const dynamicSchemeCount = customerGroups.filter(cg => String(cg.customer) === String(sub.id)).length;

            return (
              <div 
                className="sub-card" 
                key={sub.id} 
                onClick={() => navigate(`/subscribers/${sub.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="sub-card-left">
                  <div className="sub-avatar">{sub.initial}</div>
                  <div className="sub-info">
                    <span className="sub-name">{sub.name}</span>
                    <span className="sub-phone">
                      <Phone size={12} /> {sub.phone}
                    </span>
                  </div>
                </div>
                <div className="sub-card-right">
                  <span className="scheme-badge">{dynamicSchemeCount} SCHEME{dynamicSchemeCount !== 1 ? 'S' : ''}</span>
                  <button 
                    className="delete-sub-btn" 
                    onClick={(e) => confirmDelete(e, sub)}
                    title="Delete Subscriber"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={18} color="#94a3b8" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-box large premium-wizard" onClick={e => e.stopPropagation()}>
            <div className="modal-header-wizard">
               <div className="wizard-icon-wrapper"><FileText size={28} /></div>
               <h2 className="modal-heading-wizard">Application for Chit Enrollment</h2>
               <p className="wizard-subtitle">Complete the 4-step process to securely add a new subscriber.</p>
            </div>
            
            <div className="step-indicator-modern">
              {[
                 {num: 1, label: 'Enrollment'}, 
                 {num: 2, label: 'Personal'}, 
                 {num: 3, label: 'Financial'}, 
                 {num: 4, label: 'Declaration'}
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className={`step-wrapper-modern ${step >= s.num ? 'active' : ''} ${step === s.num ? 'current' : ''}`}>
                    <div className="step-circle-modern">
                      {step > s.num ? <CheckCircle size={14} strokeWidth={3} /> : s.num}
                    </div>
                    <span className="step-label-modern">{s.label}</span>
                  </div>
                  {s.num < 4 && <div className={`step-line-modern ${step > s.num ? 'active' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            {error && (
              <div style={{ padding: '10px 40px', background: '#fee2e2', borderBottom: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div className="modal-body scrollable">
              {step === 1 && (
                <div className="step-content fade-in-step">
                  <div className="step-title-row">
                    <Building size={20} className="step-icon" />
                    <h3>Enrollment Details</h3>
                  </div>
                  <div className="form-section-box">
                    <div className="grid-2">
                      <div className="modal-field">
                        <label>Branch Name</label>
                        <input type="text" name="branchName" value={form.branchName} onChange={handleChange} placeholder="e.g. Main Branch" />
                      </div>
                      <div className="modal-field">
                        <label>Agent Name</label>
                        <input type="text" name="agentName" value={form.agentName} onChange={handleChange} placeholder="e.g. Rahul Verma" />
                      </div>
                      <div className="modal-field">
                        <label>Chit Value (Rs.)</label>
                        <input type="number" name="chitValue" value={form.chitValue} onChange={handleChange} placeholder="100000" />
                      </div>
                      <div className="modal-field">
                        <label>Group / Tkt No</label>
                        <input type="text" name="groupNo" value={form.groupNo} onChange={handleChange} placeholder="GRP-001" />
                      </div>
                      <div className="modal-field">
                        <label>Monthly Inst. Amt (Rs.)</label>
                        <input type="number" name="monthlyInst" value={form.monthlyInst} onChange={handleChange} placeholder="10000" />
                      </div>
                      <div className="modal-field">
                        <label>Duration (Months)</label>
                        <input type="number" name="duration" value={form.duration} onChange={handleChange} placeholder="10" />
                      </div>
                      <div className="modal-field">
                        <label>Admission Fees (Rs.)</label>
                        <input type="number" name="admissionFees" value={form.admissionFees} onChange={handleChange} placeholder="500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step-content fade-in-step">
                  <div className="step-title-row">
                    <User size={20} className="step-icon" />
                    <h3>Personal Details</h3>
                  </div>
                  <div className="form-section-box">
                    <div className="grid-2">
                      <div className="modal-field full-width">
                        <label>Name (in BLOCK LETTERS)</label>
                        <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. RAJESH KUMAR" />
                      </div>
                      <div className="modal-field full-width">
                        <label>Father's / Husband's Name</label>
                        <input type="text" name="fatherName" value={form.fatherName} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Date of Birth</label>
                        <input type="date" name="dob" value={form.dob} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Gender</label>
                        <select name="gender" value={form.gender} onChange={handleChange}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>Marital Status</label>
                        <input type="text" name="maritalStatus" value={form.maritalStatus} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Subscriber Status</label>
                        <select name="subscriberStatus" value={form.subscriberStatus} onChange={handleChange}>
                          <option value="">Select Status</option>
                          <option value="Individual">Individual</option>
                          <option value="Firm">Firm</option>
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>Income Source</label>
                        <select name="incomeSource" value={form.incomeSource} onChange={handleChange}>
                          <option value="">Select Income Source</option>
                          <option value="Salary">Salary</option>
                          <option value="Business">Business</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>GST No</label>
                        <input type="text" name="gstNo" value={form.gstNo} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Mobile Number</label>
                        <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="e.g. 9876543210" />
                      </div>
                      <div className="modal-field">
                        <label>Gmail ID</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="e.g. name@gmail.com" />
                      </div>
                    </div>
                  </div>

                  <div className="form-section-box mt-4">
                    <h4 className="box-mini-title">Addresses</h4>
                    <div className="grid-2">
                      <div className="modal-field full-width">
                        <label>Residential Address</label>
                        <textarea name="address" rows={2} value={form.address} onChange={handleChange} placeholder="Enter full residential address..."></textarea>
                      </div>
                      <div className="modal-field full-width">
                        <label>Business / Office Address</label>
                        <textarea name="businessAddress" rows={2} value={form.businessAddress} onChange={handleChange} placeholder="Enter business or office address..."></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="step-content fade-in-step">
                  <div className="step-title-row">
                    <Building size={20} className="step-icon" />
                    <h3>Bank & Nominee Details</h3>
                  </div>
                  <div className="form-section-box">
                    <h4 className="box-mini-title">Bank Information</h4>
                    <div className="grid-2">
                      <div className="modal-field">
                        <label>Bank Name</label>
                        <input type="text" name="bankName" value={form.bankName} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Branch</label>
                        <input type="text" name="bankBranch" value={form.bankBranch} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>A/c Type (SB/CA No)</label>
                        <input type="text" name="acType" value={form.acType} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>IFSC Code</label>
                        <input type="text" name="ifsc" value={form.ifsc} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section-box mt-4">
                    <h4 className="box-mini-title">Nominee Information</h4>
                    <div className="grid-2">
                      <div className="modal-field full-width">
                        <label>Nominee's Name</label>
                        <input type="text" name="nomineeName" value={form.nomineeName} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Age</label>
                        <input type="number" name="nomineeAge" value={form.nomineeAge} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Relationship</label>
                        <input type="text" name="nomineeRelationship" value={form.nomineeRelationship} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="step-content fade-in-step">
                  <div className="step-title-row">
                    <CheckCircle size={20} className="step-icon" />
                    <h3>Witnesses & Declaration</h3>
                  </div>
                  
                  <div className="form-section-box">
                    <h4 className="box-mini-title">Identification</h4>
                    <div className="grid-2">
                      <div className="modal-field">
                        <label>PAN / AADHAR / VOTER ID</label>
                        <select name="idProofType" value={form.idProofType} onChange={handleChange}>
                          <option value="">Select ID Type</option>
                          <option value="PAN">PAN</option>
                          <option value="AADHAR">AADHAR</option>
                          <option value="VOTER ID">VOTER ID</option>
                        </select>
                      </div>
                      <div className="modal-field">
                        <label>ID Proof Number</label>
                        <input type="text" name="idProofNo" value={form.idProofNo} onChange={handleChange} />
                      </div>
                    </div>
                  </div>

                  <div className="form-section-box mt-4">
                    <h4 className="box-mini-title">Witnesses</h4>
                    <div className="grid-2">
                      <div className="modal-field full-width">
                        <label>Witness - 1 (Name & Address)</label>
                        <textarea name="witness1" rows={2} value={form.witness1} onChange={handleChange}></textarea>
                      </div>
                      <div className="modal-field full-width">
                        <label>Witness - 2 (Name & Address)</label>
                        <textarea name="witness2" rows={2} value={form.witness2} onChange={handleChange}></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="form-section-box mt-4">
                    <h4 className="box-mini-title">Signing Details</h4>
                    <div className="grid-2">
                      <div className="modal-field">
                        <label>Place</label>
                        <input type="text" name="place" value={form.place} onChange={handleChange} />
                      </div>
                      <div className="modal-field">
                        <label>Date</label>
                        <input type="date" name="date" value={form.date} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions-multi">
              <button className="btn-wizard-cancel" onClick={handleCancel}>Cancel</button>
              <div className="nav-actions">
                {step > 1 && <button className="btn-wizard-prev" onClick={prevStep}>Previous</button>}
                {step < 4 ? (
                  <button className="btn-wizard-next" onClick={nextStep}>Continue <ChevronRight size={16} /></button>
                ) : (
                  <button className="btn-wizard-submit" onClick={handleRegister}>Submit Application <CheckCircle size={16} /></button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="delete-modal-overlay" onClick={() => !isDeleting && setDeleteModal({ open: false, subscriber: null })}>
          <div className="delete-modal-box" onClick={e => e.stopPropagation()}>
            <div className="delete-icon-wrapper">
              <AlertTriangle size={32} />
            </div>
            <h3>Delete Subscriber?</h3>
            <p>
              Are you sure you want to delete <strong>{deleteModal.subscriber?.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button 
                className="btn-delete-cancel" 
                onClick={() => setDeleteModal({ open: false, subscriber: null })}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-delete-confirm" 
                onClick={executeDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscribers;
