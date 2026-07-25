'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterEvent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    eventTitle: '',
    eventDept: '',
    eventType: 'workshop',
    eventTheme: '',
    eventDate: '',
    eventTime: '',
    eventEndTime: '',
    eventVenue: '',
    eventMode: 'offline',
    eventDesc: '',
    maxCapacity: 50,
    regDeadline: '',
    coordName: '',
    coordEmail: '',
    coordPhone: '',
    organizerName: '',
    eventFee: '',
    // Proposal-specific fields
    studentCoordinators: '',
    resourcePersonName: '',
    resourcePersonDesignation: '',
    resourcePersonOrganization: '',
    resourcePersonBio: '',
    budgetItems: '',
    logistics: {
      projector: false,
      mic: false,
      internet: false,
      certificates: false,
      refreshments: false,
      photography: false,
      volunteers: false
    },
    registrationLink: '',
    brochureLink: ''
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [proposalGenerated, setProposalGenerated] = useState(false);
  const [proposalUrl, setProposalUrl] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 3;

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);

          console.log('User role:', data.role); // Debug log

          // Check if user has permission to register events (staff roles only)
          const staffRoles = ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'];
          if (!staffRoles.includes(data.role)) {
            console.log('Access denied - user role not in staff roles');
            router.push('/dashboard');
          }
        } else if (response.status === 401) {
          // Unauthorized - redirect to login
          router.push('/login');
        } else if (response.status === 404) {
          // User not found in database - might need to register
          console.error('User not found in database');
          router.push('/login');
        } else {
          // Other error
          console.error('Failed to fetch user:', response.status);
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to check user role:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#C8920A', marginBottom: '16px' }}></i>
          <p style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const goToStep = (n: number, direction: 'forward' | 'backward' = 'forward') => {
    if (n < 1 || n > totalSteps) return;
    setCurrentStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleModeToggle = (mode: string) => {
    setFormData({ ...formData, eventMode: mode });
  };

  const handleCapacityChange = (delta: number) => {
    const newValue = Math.max(1, Math.min(5000, formData.maxCapacity + delta));
    setFormData({ ...formData, maxCapacity: newValue });
  };

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToastMsg('File too large (max 5 MB)', true);
      return;
    }
    setPosterFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPosterPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleQrCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToastMsg('Invalid file type. Please upload PNG, JPG, JPEG, or SVG', true);
      return;
    }
    
    // Validate file size (max 2MB for QR code)
    if (file.size > 2 * 1024 * 1024) {
      showToastMsg('File too large (max 2 MB for QR code)', true);
      return;
    }
    
    setQrCodeFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrCodePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeQrCode = () => {
    setQrCodeFile(null);
    setQrCodePreview(null);
  };

  const removePoster = () => {
    setPosterFile(null);
    setPosterPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showToastMsg = (msg: string, isError: boolean = false) => {
    setToastMessage(msg);
    setToastError(isError);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const validateStep1 = () => {
    const required = ['eventTitle', 'eventDept', 'eventDate', 'eventTime', 'eventVenue', 'eventDesc', 'regDeadline'];
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        showToastMsg('Please fill all required fields', true);
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    const required = ['coordName', 'coordEmail', 'coordPhone'];
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        showToastMsg('Please fill all required fields', true);
        return false;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.coordEmail)) {
      showToastMsg('Please enter a valid email', true);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) goToStep(2, 'forward');
    } else if (currentStep === 2) {
      if (validateStep2()) goToStep(3, 'forward');
    }
  };

  const handleCreateEvent = async () => {
    if (!validateStep1() || !validateStep2()) return;

    showToastMsg('Creating event and generating proposal...', false);

    try {
      // Get the authenticated user
      const userResponse = await fetch('/api/users/me');
      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }
      const userData = await userResponse.json();

      const eventResponse = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.eventTitle,
          description: formData.eventDesc,
          type: formData.eventType,
          theme: formData.eventTheme,
          startDate: formData.eventDate,
          endDate: formData.eventDate,
          venue: formData.eventVenue,
          mode: formData.eventMode,
          maxCapacity: formData.maxCapacity,
          clubId: formData.organizerName || undefined,
          qrCode: qrCodePreview || null
        })
      });

      if (!eventResponse.ok) {
        const errorData = await eventResponse.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const eventJson = await eventResponse.json();
      setCreatedEventId(eventJson.id);
      
      showToastMsg(`"${formData.eventTitle}" created successfully! 🎉`);
      
      // Go to Step 3 after event creation
      goToStep(3, 'forward');
    } catch (error) {
      console.error('Event creation error:', error);
      showToastMsg(error instanceof Error ? error.message : 'Failed to create event', true);
    }
  };

  const handleGenerateProposal = async (eventId?: string) => {
    const targetEventId = eventId || createdEventId;
    if (!targetEventId) {
      showToastMsg('Event was not saved — please go back and publish first', true);
      return;
    }

    setIsGeneratingProposal(true);

    try {
      const proposalData = {
        eventName: formData.eventTitle,
        eventType: formData.eventType,
        eventTheme: formData.eventTheme,
        proposedDate: formData.eventDate,
        eventTime: formData.eventTime,
        venue: formData.eventVenue,
        mode: formData.eventMode,
        facultyCoordinator: formData.coordName,
        studentCoordinators: formData.studentCoordinators.split(',').map(s => s.trim()),
        clubName: formData.organizerName,
        department: formData.eventDept,
        resourcePerson: formData.resourcePersonName ? {
          name: formData.resourcePersonName,
          designation: formData.resourcePersonDesignation,
          organization: formData.resourcePersonOrganization,
          shortBio: formData.resourcePersonBio
        } : undefined,
        expectedParticipants: formData.maxCapacity,
        budgetItems: formData.budgetItems.split('\n').map(line => {
          const [item, amount] = line.split(':').map(s => s.trim());
          return { item, amount: parseInt(amount) || 0 };
        }),
        logistics: formData.logistics,
        registrationLink: formData.registrationLink,
        brochureLink: formData.brochureLink
      };

      const response = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: targetEventId,
          formData: proposalData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Proposal generation API error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to generate proposal');
      }

      const result = await response.json();

      setProposalGenerated(true);
      setProposalUrl(result.pdfUrl || `/api/proposal/${targetEventId}/download`);
      if (!eventId) { // Only show toast if not auto-generating
        showToastMsg('Proposal generated successfully! 🎉');
      }

    } catch (error) {
      console.error('Proposal generation error:', error);
      if (!eventId) {
        showToastMsg('Failed to generate proposal', true);
      }
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  return (
    <div>
      {/* STEPPER */}
      <div className="stepper-wrap">
        <div className="stepper-inner">
          <div className="step-item" onClick={() => goToStep(1)}>
            <div className={`step-dot ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'done') : ''}`}>
              {currentStep > 1 ? <i className="fas fa-check" style={{fontSize:'12px'}}></i> : '1'}
            </div>
            <div className="step-label">
              <div className={`step-name ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'done') : ''}`}>Event Details</div>
              <div className="step-sub">Title, date, venue</div>
            </div>
          </div>
          <div className={`step-connector ${currentStep > 1 ? 'done' : ''}`}></div>
          <div className="step-item" onClick={() => goToStep(2)}>
            <div className={`step-dot ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'done') : ''}`}>
              {currentStep > 2 ? <i className="fas fa-check" style={{fontSize:'12px'}}></i> : '2'}
            </div>
            <div className="step-label">
              <div className={`step-name ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'done') : ''}`}>Organizer & Publish</div>
              <div className="step-sub">Contact & confirm</div>
            </div>
          </div>
          <div className={`step-connector ${currentStep > 2 ? 'done' : ''}`}></div>
          <div className="step-item" onClick={() => goToStep(3)}>
            <div className={`step-dot ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'done') : ''}`}>
              {currentStep > 3 ? <i className="fas fa-check" style={{fontSize:'12px'}}></i> : '3'}
            </div>
            <div className="step-label">
              <div className={`step-name ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'done') : ''}`}>Generate Proposal</div>
              <div className="step-sub">AI-powered document</div>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-inner">
          <div className="header-eyebrow">
            <i className="fas fa-calendar-plus"></i> NEW EVENT REGISTRATION
          </div>
          <div className="page-title">Create an <span>Event</span></div>
          <div className="page-subtitle">Fill in the essentials — quick, clean, done in 3 steps.</div>
        </div>
      </div>

      {/* FORM */}
      <div className="page-container">
        <form>
          {/* STEP 1: EVENT DETAILS */}
          <div className={`form-section step-active ${currentStep === 1 ? '' : 'hidden'}`}>
            <div className="section-card">
              <div className="section-head">
                <div className="section-icon-wrap gold"><i className="fas fa-calendar-alt"></i></div>
                <div className="section-title-group">
                  <div className="section-title">Event Details</div>
                  <div className="section-subtitle">The core info — keep it clear and accurate</div>
                </div>
                <span className="section-badge">STEP 1 / 3</span>
              </div>
              <div className="section-body">
                {/* Title */}
                <div className="form-grid col-1">
                  <div className="form-field">
                    <label className="form-label">Event Title <span className="form-label-req">*</span></label>
                    <input type="text" className="form-input" id="eventTitle" value={formData.eventTitle} onChange={handleInputChange} placeholder="e.g. Annual Tech Symposium 2026" required maxLength={100} />
                  </div>
                </div>

                {/* Dept + Type */}
                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Department <span className="form-label-req">*</span></label>
                    <div className="select-wrap">
                      <select className="form-select" id="eventDept" value={formData.eventDept} onChange={handleInputChange} required>
                        <option value="">Select Department</option>
                        <option value="computer-science">Computer Science</option>
                        <option value="mathematics">Mathematics</option>
                        <option value="physics">Physics</option>
                        <option value="chemistry">Chemistry</option>
                        <option value="biology">Biology</option>
                        <option value="english">English</option>
                        <option value="history">History</option>
                        <option value="management">Management</option>
                        <option value="commerce">Commerce</option>
                        <option value="arts">Arts &amp; Design</option>
                        <option value="law">Law</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Event Type</label>
                    <div className="select-wrap">
                      <select className="form-select" id="eventType" value={formData.eventType} onChange={handleInputChange}>
                        <option value="workshop">Workshop</option>
                        <option value="seminar">Seminar</option>
                        <option value="lecture">Lecture</option>
                        <option value="symposium">Symposium</option>
                        <option value="competition">Competition</option>
                        <option value="cultural">Cultural</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date + Time + Venue */}
                <div className="form-grid col-3">
                  <div className="form-field">
                    <label className="form-label">Date <span className="form-label-req">*</span></label>
                    <input type="date" className="form-input" id="eventDate" value={formData.eventDate} onChange={handleInputChange} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Start Time <span className="form-label-req">*</span></label>
                    <input type="time" className="form-input" id="eventTime" value={formData.eventTime} onChange={handleInputChange} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">End Time</label>
                    <input type="time" className="form-input" id="eventEndTime" value={formData.eventEndTime} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Venue <span className="form-label-req">*</span></label>
                    <input type="text" className="form-input" id="eventVenue" value={formData.eventVenue} onChange={handleInputChange} placeholder="e.g. Main Auditorium, Block A" required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Mode</label>
                    <div className="mode-toggle">
                      <button type="button" className={`mode-btn ${formData.eventMode === 'offline' ? 'active' : ''}`} onClick={() => handleModeToggle('offline')}>
                        <i className="fas fa-building"></i> Offline
                      </button>
                      <button type="button" className={`mode-btn ${formData.eventMode === 'online' ? 'active' : ''}`} onClick={() => handleModeToggle('online')}>
                        <i className="fas fa-wifi"></i> Online
                      </button>
                      <button type="button" className={`mode-btn ${formData.eventMode === 'hybrid' ? 'active' : ''}`} onClick={() => handleModeToggle('hybrid')}>
                        <i className="fas fa-layer-group"></i> Hybrid
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description + Poster */}
                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Description <span className="form-label-req">*</span></label>
                    <textarea className="form-textarea" id="eventDesc" value={formData.eventDesc} onChange={handleInputChange} placeholder="Brief description of the event…" required maxLength={500} style={{minHeight:'100px'}}></textarea>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Event Poster <span style={{color:'var(--text-pale)',fontWeight:500}}>(optional)</span></label>
                    <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                      <input type="file" ref={fileInputRef} id="posterInput" accept="image/*" onChange={handlePosterUpload} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
                      <div className="upload-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                      <div className="upload-text">Click or drag &amp; drop</div>
                      <div className="upload-hint">PNG, JPG, WEBP · Max 5 MB</div>
                    </div>
                    {posterPreview && (
                      <div className="upload-preview show">
                        <img className="upload-preview-img" src={posterPreview} alt="Preview" />
                        <div>
                          <div className="upload-preview-name">{posterFile?.name}</div>
                          <div className="upload-preview-size">{posterFile ? (posterFile.size / 1024).toFixed(0) + ' KB' : '—'}</div>
                        </div>
                        <button type="button" className="upload-preview-remove" onClick={removePoster}><i className="fas fa-times"></i></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity + Deadline */}
                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Max Capacity <span className="form-label-req">*</span></label>
                    <div className="counter-field">
                      <button type="button" className="counter-btn" onClick={() => handleCapacityChange(-1)}><i className="fas fa-minus"></i></button>
                      <input type="number" className="counter-input" id="maxCapacity" value={formData.maxCapacity} onChange={handleInputChange} min={1} max={5000} required />
                      <button type="button" className="counter-btn" onClick={() => handleCapacityChange(1)}><i className="fas fa-plus"></i></button>
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Registration Deadline <span className="form-label-req">*</span></label>
                    <input type="date" className="form-input" id="regDeadline" value={formData.regDeadline} onChange={handleInputChange} required />
                  </div>
                </div>
              </div>
            </div>

            {/* Wizard Nav */}
            <div className="wizard-nav" style={{'--prog-w':'33%'} as React.CSSProperties}>
              <button type="button" className="wizard-btn wizard-btn-back" disabled>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <div className="wizard-step-info">Step <strong>1</strong> of <strong>3</strong> — Event Details</div>
              <button type="button" className="wizard-btn wizard-btn-next" onClick={handleNext}>
                Next <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>

          {/* STEP 2: ORGANIZER & PUBLISH */}
          <div className={`form-section step-active ${currentStep === 2 ? '' : 'hidden'}`}>
            <div className="section-card">
              <div className="section-head">
                <div className="section-icon-wrap navy"><i className="fas fa-user-tie"></i></div>
                <div className="section-title-group">
                  <div className="section-title">Organizer Contact</div>
                  <div className="section-subtitle">Who to reach if there are questions</div>
                </div>
                <span className="section-badge">STEP 2 / 3</span>
              </div>
              <div className="section-body">
                <div className="highlight-banner">
                  <i className="fas fa-bolt highlight-icon"></i>
                  <div className="highlight-text">
                    <strong>Almost there!</strong> Just a name, email, and phone — then you're ready to publish.
                  </div>
                </div>

                <div className="form-grid col-3">
                  <div className="form-field">
                    <label className="form-label">Coordinator Name <span className="form-label-req">*</span></label>
                    <input type="text" className="form-input" id="coordName" value={formData.coordName} onChange={handleInputChange} placeholder="Dr. / Prof. Full Name" required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email <span className="form-label-req">*</span></label>
                    <input type="email" className="form-input" id="coordEmail" value={formData.coordEmail} onChange={handleInputChange} placeholder="coordinator@jainuniversity.ac.in" required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Phone <span className="form-label-req">*</span></label>
                    <input type="tel" className="form-input" id="coordPhone" value={formData.coordPhone} onChange={handleInputChange} placeholder="+91 98765 43210" required />
                  </div>
                </div>

                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Organizer / Club</label>
                    <input type="text" className="form-input" id="organizerName" value={formData.organizerName} onChange={handleInputChange} placeholder="e.g. CSE Dept / Tech Club" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Fee <span style={{color:'var(--text-pale)',fontWeight:500}}>(leave blank if free)</span></label>
                    <input type="text" className="form-input" id="eventFee" value={formData.eventFee} onChange={handleInputChange} placeholder="e.g. ₹200 / Free" />
                  </div>
                </div>
              </div>
            </div>

            {/* Wizard Nav */}
            <div className="wizard-nav" style={{'--prog-w':'66%'} as React.CSSProperties}>
              <button type="button" className="wizard-btn wizard-btn-back" onClick={() => goToStep(1, 'backward')}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <div className="wizard-step-info">Step <strong>2</strong> of <strong>3</strong> — Organizer & Publish</div>
              <button type="button" className="wizard-btn wizard-btn-next" onClick={handleNext}>
                Next <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>

          {/* STEP 3: PROPOSAL GENERATION */}
          <div className={`form-section step-active ${currentStep === 3 ? '' : 'hidden'}`}>
            <div className="section-card">
              <div className="section-head">
                <div className="section-icon-wrap gold"><i className="fas fa-file-alt"></i></div>
                <div className="section-title-group">
                  <div className="section-title">Generate Event Proposal</div>
                  <div className="section-subtitle">AI-powered document generation</div>
                </div>
                <span className="section-badge">STEP 3 / 3</span>
              </div>
              <div className="section-body">
                <div className="highlight-banner">
                  <i className="fas fa-magic highlight-icon"></i>
                  <div className="highlight-text">
                    <strong>AI will generate the proposal!</strong> Fill in the details below and let AI create a professional document.
                  </div>
                </div>

                {/* Theme */}
                <div className="form-grid col-1">
                  <div className="form-field">
                    <label className="form-label">Event Theme</label>
                    <input type="text" className="form-input" id="eventTheme" value={formData.eventTheme} onChange={handleInputChange} placeholder="e.g. Innovation in AI" />
                  </div>
                </div>

                {/* Student Coordinators */}
                <div className="form-grid col-1">
                  <div className="form-field">
                    <label className="form-label">Student Coordinators</label>
                    <input type="text" className="form-input" id="studentCoordinators" value={formData.studentCoordinators} onChange={handleInputChange} placeholder="e.g. John Doe, Jane Smith (comma-separated)" />
                  </div>
                </div>

                {/* Resource Person */}
                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Resource Person Name</label>
                    <input type="text" className="form-input" id="resourcePersonName" value={formData.resourcePersonName} onChange={handleInputChange} placeholder="Dr. / Prof. Name" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Designation</label>
                    <input type="text" className="form-input" id="resourcePersonDesignation" value={formData.resourcePersonDesignation} onChange={handleInputChange} placeholder="e.g. Senior Researcher" />
                  </div>
                </div>

                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Organization</label>
                    <input type="text" className="form-input" id="resourcePersonOrganization" value={formData.resourcePersonOrganization} onChange={handleInputChange} placeholder="e.g. Google, IISc" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Short Bio</label>
                    <input type="text" className="form-input" id="resourcePersonBio" value={formData.resourcePersonBio} onChange={handleInputChange} placeholder="Brief bio (100 chars)" maxLength={100} />
                  </div>
                </div>

                {/* Budget Items */}
                <div className="form-grid col-1">
                  <div className="form-field">
                    <label className="form-label">Budget Items</label>
                    <textarea className="form-textarea" id="budgetItems" value={formData.budgetItems} onChange={handleInputChange} placeholder="Item 1: 5000&#10;Item 2: 3000&#10;(one per line, format: Item Name: Amount)" style={{minHeight:'80px'}}></textarea>
                  </div>
                </div>

                {/* Logistics */}
                <div className="form-grid col-1">
                  <div className="form-field">
                    <label className="form-label">Logistics Required</label>
                    <div className="checkbox-group">
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.projector} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, projector: e.target.checked}})} />
                        <span>Projector</span>
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.mic} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, mic: e.target.checked}})} />
                        <span>Mic</span>
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.internet} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, internet: e.target.checked}})} />
                        <span>Internet</span>
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.certificates} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, certificates: e.target.checked}})} />
                        <span>Certificates</span>
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.refreshments} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, refreshments: e.target.checked}})} />
                        <span>Refreshments</span>
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.photography} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, photography: e.target.checked}})} />
                        <span>Photography</span>
                      </label>
                      <label className="checkbox-item">
                        <input type="checkbox" checked={formData.logistics.volunteers} onChange={(e) => setFormData({...formData, logistics: {...formData.logistics, volunteers: e.target.checked}})} />
                        <span>Volunteers</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="form-grid col-2">
                  <div className="form-field">
                    <label className="form-label">Registration Link</label>
                    <input type="url" className="form-input" id="registrationLink" value={formData.registrationLink} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Brochure Link</label>
                    <input type="url" className="form-input" id="brochureLink" value={formData.brochureLink} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                </div>

                {/* QR Code Upload */}
                <div className="form-grid col-1">
                  <div className="form-field">
                    <label className="form-label">QR Code <span style={{color:'var(--text-pale)',fontWeight:500}}>(optional)</span></label>
                    <div className="upload-area" style={{minHeight:'80px'}} onClick={() => document.getElementById('qrCodeInput')?.click()}>
                      <input type="file" id="qrCodeInput" accept="image/png,image/jpeg,image/jpg,image/svg+xml" onChange={handleQrCodeUpload} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
                      {!qrCodePreview ? (
                        <>
                          <div className="upload-icon"><i className="fas fa-qrcode"></i></div>
                          <div className="upload-text">Upload QR Code</div>
                          <div className="upload-hint">PNG, JPG, JPEG, SVG · Max 2 MB</div>
                        </>
                      ) : (
                        <div className="upload-preview show">
                          <img className="upload-preview-img" src={qrCodePreview} alt="QR Code Preview" style={{maxHeight:'60px'}} />
                          <div>
                            <div className="upload-preview-name">{qrCodeFile?.name}</div>
                            <div className="upload-preview-size">{qrCodeFile ? (qrCodeFile.size / 1024).toFixed(0) + ' KB' : '—'}</div>
                          </div>
                          <button type="button" className="upload-preview-remove" onClick={(e) => {e.stopPropagation(); removeQrCode();}}><i className="fas fa-times"></i></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Generated Proposal */}
                {proposalGenerated && (
                  <div className="success-banner">
                    <i className="fas fa-check-circle success-icon"></i>
                    <div className="success-text">
                      <strong>Proposal Generated!</strong> Your professional event proposal is ready.
                    </div>
                    {proposalUrl && (
                      <button type="button" className="btn btn-gold" onClick={() => window.open(proposalUrl, '_blank')}>
                        <i className="fas fa-download"></i> Download Proposal (PDF)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Wizard Nav */}
            <div className="wizard-nav" style={{'--prog-w':'100%'} as React.CSSProperties}>
              <button type="button" className="wizard-btn wizard-btn-back" onClick={() => goToStep(2, 'backward')}>
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <div className="wizard-step-info">Step <strong>3</strong> of <strong>3</strong> — Proposal Ready</div>
              <div style={{display:'flex',gap:'8px'}}>
                {createdEventId && !proposalGenerated ? (
                  <button
                    type="button"
                    className="wizard-btn wizard-btn-next"
                    onClick={() => handleGenerateProposal(createdEventId)}
                    disabled={isGeneratingProposal}
                    style={{
                      background: 'linear-gradient(135deg,var(--gold),var(--gold-light))',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(200,146,10,.4)'
                    }}
                  >
                    <i className="fas fa-file-pdf"></i> {isGeneratingProposal ? 'Generating...' : 'Generate Proposal'}
                  </button>
                ) : proposalGenerated && proposalUrl ? (
                  <>
                    <button
                      type="button"
                      className="wizard-btn wizard-btn-next"
                      onClick={() => window.open(proposalUrl, '_blank')}
                      style={{
                        background: 'linear-gradient(135deg,var(--gold),var(--gold-light))',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(200,146,10,.4)'
                      }}
                    >
                      <i className="fas fa-download"></i> Download Proposal
                    </button>
                    <button
                      type="button"
                      className="wizard-btn wizard-btn-next"
                      onClick={() => handleGenerateProposal(createdEventId)}
                      disabled={isGeneratingProposal}
                      style={{
                        background: 'linear-gradient(135deg,var(--navy),var(--navy-light))',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(28,43,74,.4)'
                      }}
                    >
                      <i className="fas fa-file-pdf"></i> {isGeneratingProposal ? 'Generating...' : 'Regenerate PDF'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="wizard-btn wizard-btn-next"
                    onClick={handleCreateEvent}
                    disabled={!!createdEventId}
                    style={{
                      background: createdEventId ? 'var(--success)' : 'linear-gradient(135deg,var(--navy),var(--navy-light))',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(28,43,74,.4)'
                    }}
                  >
                    {createdEventId ? (
                      <><i className="fas fa-check"></i> Created</>
                    ) : (
                      <><i className="fas fa-plus"></i> Create Event</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="actions-bar">
        <div className="actions-inner">
          <div className="actions-left">
            <button type="button" className="btn btn-danger" onClick={() => setFormData({
              eventTitle: '', eventDept: '', eventType: 'workshop', eventTheme: '', eventDate: '', eventTime: '', eventEndTime: '', eventVenue: '', eventMode: 'offline', eventDesc: '', maxCapacity: 50, regDeadline: '', coordName: '', coordEmail: '', coordPhone: '', organizerName: '', eventFee: '', studentCoordinators: '', resourcePersonName: '', resourcePersonDesignation: '', resourcePersonOrganization: '', resourcePersonBio: '', budgetItems: '', logistics: { projector: false, mic: false, internet: false, certificates: false, refreshments: false, photography: false, volunteers: false }, registrationLink: '', brochureLink: ''
            })}>
              <i className="fas fa-undo"></i> Clear
            </button>
          </div>
          <div className="actions-right">
            <button type="button" className="btn btn-ghost" onClick={() => showToastMsg('Draft saved!')}>
              <i className="fas fa-save"></i> Save Draft
            </button>
            <button type="button" className="btn btn-gold-outline" onClick={handlePreview}>
              <i className="fas fa-eye"></i> Preview
            </button>
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="preview-backdrop open" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-box" onClick={(e) => e.stopPropagation()}>
            <div className="preview-band">
              <button className="preview-close" onClick={() => setShowPreviewModal(false)}><i className="fas fa-times"></i></button>
              <div className="preview-band-overlay"></div>
              <div className="preview-band-icon"><i className="fas fa-calendar-star"></i></div>
            </div>
            <div className="preview-body">
              <div className="preview-chips">
                <span className="preview-chip" style={{background:'var(--navy)',color:'#fff'}}>{formData.eventType}</span>
                <span className="preview-chip" style={{background:'var(--gold-pale)',color:'var(--gold)'}}>{formData.eventDept}</span>
              </div>
              <div className="preview-title">{formData.eventTitle || '—'}</div>
              <div className="preview-grid">
                <div className="preview-cell">
                  <div className="preview-cell-label">DATE</div>
                  <div className="preview-cell-val">{formData.eventDate || '—'}</div>
                </div>
                <div className="preview-cell">
                  <div className="preview-cell-label">TIME</div>
                  <div className="preview-cell-val">{formData.eventTime || '—'}</div>
                </div>
                <div className="preview-cell">
                  <div className="preview-cell-label">VENUE</div>
                  <div className="preview-cell-val">{formData.eventVenue || '—'}</div>
                </div>
                <div className="preview-cell">
                  <div className="preview-cell-label">CAPACITY</div>
                  <div className="preview-cell-val">{formData.maxCapacity}</div>
                </div>
              </div>
              <div style={{fontSize:'12px',fontWeight:800,color:'var(--text-pale)',letterSpacing:'.8px',marginBottom:'8px'}}>ABOUT</div>
              <div className="preview-desc">{formData.eventDesc || '—'}</div>
              <div className="preview-actions">
                <button className="btn btn-gold" style={{flex:1}} onClick={handleCreateEvent}><i className="fas fa-plus"></i> Create Event</button>
                <button className="btn btn-ghost" onClick={() => setShowPreviewModal(false)}><i className="fas fa-pen"></i> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {showToast && (
        <div className={`toast show ${toastError ? 'error' : ''}`}>
          <i className={`fas ${toastError ? 'fa-exclamation-circle' : 'fa-check-circle'} toast-icon`}></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/*
        Fix: the toast popup and the info/success banners were rendering
        invisible (white text on white, or no background at all) whenever
        the external stylesheet didn't define solid colors for them. This
        block hard-codes readable, high-contrast styling for:
        - .toast / .toast.error  (the bottom popup for errors & confirmations)
        - .highlight-banner      (the amber "info" banner on steps 2 & 3)
        - .success-banner        (the green "proposal generated" banner)
      */}
      <style jsx>{`
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: #ffffff;
          padding: 14px 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          max-width: 90vw;
        }

        .toast.error {
          background: #dc2626;
        }

        .toast-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .highlight-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff7e0;
          border: 1px solid #f0cf6a;
          color: #7a5b00;
          padding: 14px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .highlight-icon {
          color: #c8920a;
          font-size: 18px;
          flex-shrink: 0;
        }

        .highlight-text {
          font-size: 14px;
          line-height: 1.4;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          background: #ecfdf5;
          border: 1px solid #6ee7b7;
          color: #065f46;
          padding: 14px 16px;
          border-radius: 10px;
          margin-top: 16px;
        }

        .success-icon {
          color: #059669;
          font-size: 20px;
          flex-shrink: 0;
        }

        .success-text {
          font-size: 14px;
          line-height: 1.4;
          flex: 1;
        }
      `}</style>
    </div>
  );
}