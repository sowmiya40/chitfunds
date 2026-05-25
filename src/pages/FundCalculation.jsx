import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './FundCalculation.css';

// ─── helpers ───────────────────────────────────────────────────────────────
const authHeaders = () => {
  const token = localStorage.getItem('staffToken');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
    : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
};

const apiFetch = (url) =>
  fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  }).then((r) => r.json());

// ───────────────────────────────────────────────────────────────────────────
const FundCalculation = () => {
  // ── raw API data ──────────────────────────────────────────────────────
  const [groups, setGroups]           = useState([]);   // all groups from /api/groups/
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [members, setMembers]         = useState([]);   // members of selectedGroup
  const [collections, setCollections] = useState([]);   // collections for selectedGroup

  // ── UI state ──────────────────────────────────────────────────────────
  const [loadingGroups, setLoadingGroups]   = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm]         = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);
  const [allMembers, setAllMembers]         = useState([]); // flat list for cross-group search
  const [defaulters, setDefaulters]         = useState([]);
  const [isSending, setIsSending]           = useState(false);
  
  // ── WhatsApp Modal State ──
  const [showWAModal, setShowWAModal] = useState(false);

  // ── 1. Fetch all groups on mount ──────────────────────────────────────
  useEffect(() => {
    setLoadingGroups(true);
    apiFetch('/api/groups/')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || data.data || []);
        setGroups(list);
        if (list.length > 0) setSelectedGroup(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingGroups(false));
  }, []);

  // ── 2. Fetch members + collections whenever group changes ─────────────
  const loadGroupDetails = useCallback(async (group) => {
    if (!group) return;
    setLoadingDetails(true);
    try {
      // Fetch ALL customer-groups + customers + collections, then filter client-side
      // (mirrors exact GroupDetails.jsx fetch strategy)
      const [allCgData, custData, collData] = await Promise.all([
        apiFetch('/api/customer-groups/'),
        apiFetch('/api/customers/'),
        apiFetch(`/api/collections/?group=${group.id}`),
      ]);

      const allCgList = Array.isArray(allCgData) ? allCgData : (allCgData.data || []);
      const custList  = Array.isArray(custData)  ? custData  : (custData.data  || []);
      const collList  = Array.isArray(collData)  ? collData  : (collData.data  || []);

      // Filter relations for this group only — same as GroupDetails line 155
      const groupRels = allCgList.filter((cg) => cg.group === group.id);

      // Build member list — same as GroupDetails lines 156-167
      const built = groupRels.map((cg) => {
        const c = custList.find((x) => x.id === cg.customer);
        if (!c) return null;
        return {
          id:       c.id,
          ticketNo: cg.group_ticket_no,
          name:     c.customer_name || c.name || '—',
          phone:    c.mobile_number || c.phone || 'N/A',
        };
      }).filter(Boolean);

      setMembers(built);
      setCollections(collList);
    } catch (e) {
      console.error('Failed to load group details', e);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadGroupDetails(selectedGroup);

    // Auto-refresh when user switches back to this tab
    const handleFocus = () => {
      if (selectedGroup) {
        loadGroupDetails(selectedGroup);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedGroup, loadGroupDetails]);

  // ── 3. Build cross-group member list for search (lazy: only fetches once) ──
  useEffect(() => {
    if (groups.length === 0) return;
    const fetchAll = async () => {
      try {
        const [cgData, custData] = await Promise.all([
          apiFetch('/api/customer-groups/'),
          apiFetch('/api/customers/'),
        ]);
        const cgList   = Array.isArray(cgData)  ? cgData  : (cgData.data  || []);
        const custList = Array.isArray(custData) ? custData: (custData.data|| []);

        const flat = cgList.map((cg) => {
          const c = custList.find((x) => x.id === cg.customer);
          const g = groups.find((x) => x.id === cg.group);
          if (!c || !g) return null;
          return {
            id:        c.id,
            groupId:   g.id,
            groupName: g.group_name || g.name,
            name:      c.customer_name || c.name || '—',
            phone:     c.mobile_number || c.phone || '',
          };
        }).filter(Boolean);

        setAllMembers(flat);
      } catch (e) {
        console.error('Failed to load cross-group members', e);
      }
    };
    fetchAll();
  }, [groups]);

  // ── 4. Compute defaulter rows ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup || members.length === 0) {
      setDefaulters([]);
      return;
    }

    // baseInstallment — exactly mirrors GroupDetails line 296-298:
    // Math.round(parseInt(totalPot.replace(/[₹,]/g,'')) / totalMonths)
    const chitValue      = parseFloat(selectedGroup.chit_value || 0);
    const totalMonths    = parseInt(selectedGroup.duration_months || selectedGroup.totalMonths || 1);
    const installmentAmt = totalMonths > 0 ? Math.round(chitValue / totalMonths) : 0;

    // Build paymentsByMember map — exactly mirrors GroupDetails lines 119-131
    // Key: memberId, Value: { [month]: { status, amount, ... } }
    // getPaidCount = Object.keys(paymentsByMember[id] || {}).length
    // i.e. count of DISTINCT months with ANY entry — status is irrelevant
    const paymentsByMember = {};
    collections.forEach((col) => {
      const month    = Number(col.month_number);
      const memberId = Number(col.customer);
      if (!paymentsByMember[memberId]) paymentsByMember[memberId] = {};
      paymentsByMember[memberId][month] = {
        status: col.status,
        amount: col.amount,
        mode:   col.payment_mode,
        note:   col.note,
        date:   col.date || ''
      };
    });

    const rows = members.map((m, idx) => {
      // getPaidCount — same as GroupDetails line 313
      const instPaid      = Object.keys(paymentsByMember[m.id] || {}).length;
      const noOfDueInst   = Math.max(0, totalMonths - instPaid);
      const totalDueAmt   = noOfDueInst * installmentAmt;
      const currentAmtDue = noOfDueInst > 0 ? installmentAmt : 0;
      const arrearsAmtDue = totalDueAmt - currentAmtDue;
      return {
        tktNo:          m.ticketNo || (idx + 1),
        name:           m.name,
        phoneNo:        m.phone,
        agentName:      '4550A0001',
        isPrized:       false, // Backend currently does not provide this; default to false
        instPaid,
        noOfDueInst,
        arrearsAmtDue,
        currentAmtDue,
      };
    });

    // Apply search filter
    const term = searchTerm.toLowerCase();
    const filtered = term
      ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.phoneNo.includes(searchTerm))
      : rows;

    setDefaulters(filtered);
  }, [selectedGroup, members, collections, searchTerm]);

  // ── Search helpers ────────────────────────────────────────────────────
  const searchResults = searchTerm
    ? allMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.phone.includes(searchTerm)
      )
    : [];

  const handleSelectSubscriber = (sub) => {
    const g = groups.find((x) => x.id === sub.groupId);
    if (g) setSelectedGroup(g);
    setSearchTerm(sub.name);
    setShowDropdown(false);
  };

  // ── Derived values for display ────────────────────────────────────────
  const chitValue      = selectedGroup ? parseFloat(selectedGroup.chit_value || 0) : 0;
  const totalMonths    = selectedGroup ? parseInt(selectedGroup.duration_months || selectedGroup.totalMonths || 1) : 1;
  const installmentAmt = totalMonths > 0 ? Math.round(chitValue / totalMonths) : 0;
  const groupName      = selectedGroup ? (selectedGroup.group_name || selectedGroup.name || '') : '';
  const startDate      = selectedGroup ? (selectedGroup.start_date || selectedGroup.startDate || '—') : '—';
  const totalSlots     = selectedGroup ? (selectedGroup.total_members || selectedGroup.totalSlots || '—') : '—';

  // ── PDF Download ──────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    try {
      if (!selectedGroup) return;

      const doc       = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin    = 12;
      const contentWidth = pageWidth - margin * 2;
      let yPos        = 15;

      // ── Premium Header ──
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.setFont('helvetica', 'bold');
      doc.text('CHIT FUNDS', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.setFont('helvetica', 'normal');
      doc.text((groupName || 'Chit Group').toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      // Divider Line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Meta Info
      const now     = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('USER : ADMIN', margin, yPos);
      doc.text(`BRANCH : 4550 [GOBICHETTIPALAYAM]   DATE : ${dateStr}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 12;

      // Report Title
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.setFont('helvetica', 'bold');
      doc.text('DEFAULTER LIST REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // ── Group Details Box ──
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(203, 213, 225); // Slate-300
      doc.roundedRect(margin, yPos, contentWidth, 26, 2, 2, 'FD');
      
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('GROUP DETAILS', margin + 4, yPos + 6);
      
      autoTable(doc, {
        startY: yPos + 8,
        body: [
          ['BRANCH CODE', '4550', 'BRANCH NAME', 'GOBICHETTIPALAYAM'],
          ['GROUP CODE', String(selectedGroup.id), 'LAST PRIZED TICKET', '—'],
          ['CHIT VALUE', `Rs. ${chitValue.toLocaleString('en-IN')}`, 'INSTALLMENT AMT', `Rs. ${installmentAmt.toLocaleString('en-IN')}`],
          ['AUCTION DATE', startDate, 'TOTAL MONTHS', totalMonths],
        ],
        theme: 'plain',
        styles: {
          fontSize: 7.5, cellPadding: { top: 1, bottom: 1, left: 4, right: 4 }, textColor: [71, 85, 105],
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 32 },
          1: { cellWidth: (contentWidth / 2) - 32 },
          2: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 40 },
          3: { cellWidth: (contentWidth / 2) - 40 },
        },
        margin: { left: margin, right: margin },
      });
      yPos = doc.lastAutoTable.finalY + 8;

      const tableColumns = [
        { header: 'TKT NO',          dataKey: 'tktNo' },
        { header: 'NAME',            dataKey: 'name' },
        { header: 'PHONE NO',        dataKey: 'phoneNo' },
        { header: 'AGENT NAME',      dataKey: 'agentName' },
        { header: 'INST PAID',       dataKey: 'instPaid' },
        { header: 'NO OF DUE INST',  dataKey: 'noOfDueInst' },
        { header: 'ARREARS AMT', dataKey: 'arrearsAmtDue' },
        { header: 'CURRENT AMT', dataKey: 'currentAmtDue' },
      ];

      const sharedStyles = {
        theme: 'striped',
        styles: {
          fontSize: 7, cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
          lineColor: [226, 232, 240], lineWidth: 0.1, halign: 'center', textColor: [51, 65, 85], overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold',
          halign: 'center', fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 14, fontStyle: 'bold' },
          1: { cellWidth: 35, halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
          2: { cellWidth: 23 },
          3: { cellWidth: 23 },
          4: { cellWidth: 16 },
          5: { cellWidth: 22 },
          6: { cellWidth: 26.5, halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' }, // Red for arrears
          7: { cellWidth: 26.5, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      };

      const allRows = defaulters.length > 0 ? defaulters : [];

      const renderSection = (label, rows) => {
        doc.setFontSize(10);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, yPos);
        yPos += 3;

        if (rows.length > 0) {
          const body = rows.map((r) => ({
            ...r,
            arrearsAmtDue: r.arrearsAmtDue.toLocaleString('en-IN', {minimumFractionDigits: 2}),
            currentAmtDue: r.currentAmtDue.toLocaleString('en-IN', {minimumFractionDigits: 2}),
          }));
          const arrTotal  = rows.reduce((a, c) => a + c.arrearsAmtDue, 0);
          const currTotal = rows.reduce((a, c) => a + c.currentAmtDue, 0);
          body.push({
            tktNo:'', name:'', phoneNo:'', agentName:'', instPaid:'', noOfDueInst:'TOTAL',
            arrearsAmtDue: arrTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}), 
            currentAmtDue: currTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}),
          });
          
          autoTable(doc, { 
            startY: yPos, 
            columns: tableColumns, 
            body, 
            ...sharedStyles,
            didParseCell: function(data) {
              // Highlight the "TOTAL" row
              if (data.row.index === body.length - 1) {
                data.cell.styles.fillColor = [226, 232, 240];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [15, 23, 42];
              }
            }
          });
        } else {
          autoTable(doc, { startY: yPos, columns: tableColumns, body: [], ...sharedStyles });
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`NO RECORDS FOUND FOR ${label}`, pageWidth / 2, doc.lastAutoTable.finalY + 6, { align: 'center' });
          yPos += 4;
        }
        yPos = doc.lastAutoTable.finalY + 12;
      };

      renderSection('NON PRIZED MEMBERS', allRows.filter((r) => !r.isPrized));
      renderSection('PRIZED MEMBERS',     allRows.filter((r) => r.isPrized));

      // ── Footer ──
      const totalPages = doc.internal.getNumberOfPages();
      const timeStr = now.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pgH = doc.internal.pageSize.getHeight();
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pgH - 12, pageWidth - margin, pgH - 12);
        
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${totalPages}`, margin, pgH - 7);
        doc.text(`Generated on: ${timeStr}`, pageWidth - margin, pgH - 7, { align: 'right' });
      }

      doc.save(`Defaulter_List_${groupName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  // ── Auto-Send WhatsApp Message (Individual per member) ───────────────────
  const handleOpenWAModal = () => {
    if (!selectedGroup) return;
    setShowWAModal(true);
  };

  const handleFrontendShareWhatsApp = (member) => {
    try {
      const paymentAmount = installmentAmt;
      const totalPaid = member.instPaid * installmentAmt;
      const totalDue = member.arrearsAmtDue + member.currentAmtDue;
      const monthNum = Math.max(1, member.instPaid);

      const message = `*Shri Ram Chits - Payment Receipt*

Dear *${member.name.toUpperCase()}*,
We have received your payment of *₹${paymentAmount}* for Month *${monthNum}* in group *"${groupName}"*.

*Account Summary:*

*Total Amount Paid:* ₹${totalPaid}
*Arrears Due:* ₹${member.arrearsAmtDue}
*Current Month Due:* ₹${member.currentAmtDue}
*Total Due:* ₹${totalDue}

Thank you!`;

      const encodedMessage = encodeURIComponent(message);
      
      // Clean phone number (remove spaces, plus, etc.)
      const cleanPhone = member.phoneNo.replace(/\D/g, '');
      const waLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp Web in a new tab
      window.open(waLink, '_blank');
        
    } catch (err) {
      console.error('WhatsApp generating error:', err);
      alert('An error occurred while preparing the WhatsApp message.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loadingGroups) {
    return (
      <div className="fund-calculation-page">
        <div className="container">
          <p style={{ color: '#64748b', marginTop: '40px', textAlign: 'center' }}>Loading groups…</p>
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="fund-calculation-page">
        <div className="container">
          <p style={{ color: '#94a3b8', marginTop: '40px', textAlign: 'center' }}>
            No groups found. Please create a group first.
          </p>
        </div>
      </div>
    );
  }

  const nonPrized = defaulters.filter((row) => !row.isPrized);
  const prized    = defaulters.filter((row) => row.isPrized);

  return (
    <div className="fund-calculation-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Fund Calculation</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="pdf-download-btn" 
              onClick={handleOpenWAModal} 
              disabled={!selectedGroup || loadingDetails}
              style={{ background: '#10b981', color: 'white' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              WhatsApp PDFs
            </button>
            <button className="pdf-download-btn" onClick={handleDownloadPDF} disabled={!selectedGroup || loadingDetails}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <polyline points="9 15 12 18 15 15"></polyline>
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        <div className="controls-section">
          {/* Group Selector — fully dynamic from API */}
          <div className="form-group" style={{ flex: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Select Group</label>
              <button 
                onClick={() => loadGroupDetails(selectedGroup)} 
                disabled={loadingDetails}
                style={{
                  background: 'none', border: 'none', color: '#0a78dc', fontSize: '0.85rem', 
                  fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
                title="Sync latest data from database"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loadingDetails ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                {loadingDetails ? 'Syncing...' : 'Sync Data'}
              </button>
            </div>
            <select
              value={selectedGroup?.id || ''}
              onChange={(e) => {
                const g = groups.find((x) => x.id === parseInt(e.target.value));
                setSelectedGroup(g || null);
                setSearchTerm('');
              }}
              className="modern-input"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.group_name || g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subscriber Search */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Search Subscriber</label>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="modern-input"
            />
            {showDropdown && searchTerm && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((res) => (
                  <div
                    key={`${res.groupId}-${res.id}`}
                    className="search-item"
                    onMouseDown={() => handleSelectSubscriber(res)}
                  >
                    <div className="search-name">{res.name} {res.phone ? `(${res.phone})` : ''}</div>
                    <div className="search-group">{res.groupName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loadingDetails ? (
          <p style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>Loading group data…</p>
        ) : selectedGroup && (
          <div className="report-container">
            <div className="report-header text-center">
              <h2>DEFAULTER LIST</h2>
            </div>

            {/* Group Details Table */}
            <div className="group-details-table">
              <div className="table-header-title">GROUP DETAILS</div>
              <table>
                <tbody>
                  <tr>
                    <td><strong>BRANCH CODE</strong></td><td>4550</td>
                    <td><strong>BRANCH NAME</strong></td><td>GOBICHETTIPALAYAM</td>
                  </tr>
                  <tr>
                    <td><strong>GROUP CODE</strong></td><td>{selectedGroup.id}</td>
                    <td><strong>GROUP NAME</strong></td><td>{groupName}</td>
                  </tr>
                  <tr>
                    <td><strong>CHIT VALUE</strong></td><td>₹{chitValue.toLocaleString('en-IN')}</td>
                    <td><strong>INSTALLMENT AMT</strong></td><td>₹{installmentAmt.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td><strong>START DATE</strong></td><td>{startDate}</td>
                    <td><strong>TOTAL MONTHS</strong></td><td>{totalMonths}</td>
                  </tr>
                  <tr>
                    <td><strong>TOTAL MEMBERS</strong></td><td>{totalSlots}</td>
                    <td><strong>DURATION</strong></td><td>{totalMonths} Months</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* NON PRIZED Table */}
            <div className="defaulters-table">
              <div className="table-header-title">
                <span>NON PRIZED</span>
                <span className="count-badge">Count: {nonPrized.length}</span>
              </div>
              <div className="table-scroll-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>TKT NO</th><th>NAME</th><th>PHONE NO</th><th>AGENT NAME</th>
                      <th>INST PAID</th><th>NO OF DUE INST</th><th>ARREARS AMT DUE</th><th>CURRENT AMT DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonPrized.length > 0 ? nonPrized.map((row, i) => (
                      <tr key={i}>
                        <td>{row.tktNo}</td><td>{row.name}</td><td>{row.phoneNo}</td><td>{row.agentName}</td>
                        <td>{row.instPaid}</td><td>{row.noOfDueInst}</td>
                        <td>₹{row.arrearsAmtDue.toFixed(2)}</td><td>₹{row.currentAmtDue.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="8" className="text-center">THERE IS NO NON PRIZED</td></tr>
                    )}
                  </tbody>
                  {nonPrized.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan="6" className="text-right"><strong>TOTAL</strong></td>
                        <td><strong>₹{nonPrized.reduce((a, c) => a + c.arrearsAmtDue, 0).toFixed(2)}</strong></td>
                        <td><strong>₹{nonPrized.reduce((a, c) => a + c.currentAmtDue, 0).toFixed(2)}</strong></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* PRIZED Table */}
            <div className="defaulters-table mt-4">
              <div className="table-header-title">
                <span>PRIZED</span>
                <span className="count-badge">Count: {prized.length}</span>
              </div>
              <div className="table-scroll-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>TKT NO</th><th>NAME</th><th>PHONE NO</th><th>AGENT NAME</th>
                      <th>INST PAID</th><th>NO OF DUE INST</th><th>ARREARS AMT DUE</th><th>CURRENT AMT DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prized.length > 0 ? prized.map((row, i) => (
                      <tr key={i}>
                        <td>{row.tktNo}</td><td>{row.name}</td><td>{row.phoneNo}</td><td>{row.agentName}</td>
                        <td>{row.instPaid}</td><td>{row.noOfDueInst}</td>
                        <td>₹{row.arrearsAmtDue.toFixed(2)}</td><td>₹{row.currentAmtDue.toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="8" className="text-center">THERE IS NO PRIZED</td></tr>
                    )}
                  </tbody>
                  {prized.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan="6" className="text-right"><strong>TOTAL</strong></td>
                        <td><strong>₹{prized.reduce((a, c) => a + c.arrearsAmtDue, 0).toFixed(2)}</strong></td>
                        <td><strong>₹{prized.reduce((a, c) => a + c.currentAmtDue, 0).toFixed(2)}</strong></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* WhatsApp Share Modal - Premium UI */}
      {showWAModal && (
        <div className="wa-modal-overlay" onClick={() => setShowWAModal(false)}>
          <div className="wa-modal-content" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Share Receipts via WhatsApp
              </h3>
              <button className="wa-modal-close" onClick={() => setShowWAModal(false)}>×</button>
            </div>
            
            <div className="wa-modal-body">
              <p style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Click <strong>Send</strong> to automatically open WhatsApp Web with a pre-filled payment receipt message for the member.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {defaulters.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#94a3b8', margin: '2rem 0' }}>No members found in this group.</p>
                ) : (
                  defaulters.map(m => {
                    const hasPhone = m.phoneNo && m.phoneNo !== 'N/A' && m.phoneNo !== '—';
                    return (
                      <div key={m.tktNo} className="wa-member-row">
                        <div className="wa-member-info">
                          <span className="wa-member-name">{m.name} (Tkt: {m.tktNo})</span>
                          <span className="wa-member-phone" style={{ color: hasPhone ? '#64748b' : '#ef4444' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            {hasPhone ? m.phoneNo : 'No valid phone number'}
                          </span>
                        </div>
                        <button 
                          className="wa-send-btn"
                          onClick={() => handleFrontendShareWhatsApp(m)}
                          disabled={!hasPhone}
                        >
                          Send
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FundCalculation;
