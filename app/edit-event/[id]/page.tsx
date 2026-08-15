'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditEvent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'workshop',
    theme: '',
    startDate: '',
    endDate: '',
    venue: '',
    mode: 'offline',
    maxCapacity: 50,
    currentCapacity: 0,
    budget: '',
    actualCost: '',
    status: 'UPCOMING',
    approvalStatus: 'PENDING',
    poster: '',
    qrCode: '',
    tags: '',
    studentCoordinators: '',
    facultyCoordinator: '',
    facultyIncharge: '',
    resourcePersonName: '',
    resourcePersonDesignation: '',
    resourcePersonOrganization: '',
    resourcePersonBio: ''
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);

          const staffRoles = ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'];
          if (!staffRoles.includes(data.role)) {
            router.push('/dashboard');
          }
        } else if (response.status === 401) {
          router.push('/login');
        } else {
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

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return;

      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (response.ok) {
          const data = await response.json();
          setEventData(data);
          
          console.log('[EDIT-EVENT] Full event data from API:', JSON.stringify(data, null, 2));
          console.log('[EDIT-EVENT] Contact info:', data.contactInfo);
          console.log('[EDIT-EVENT] Budget:', data.budget);
          console.log('[EDIT-EVENT] Actual cost:', data.actualCost);
          console.log('[EDIT-EVENT] Current capacity:', data.currentCapacity);
          console.log('[EDIT-EVENT] Tags:', data.tags);
          
          // Pre-populate form with existing data
          setFormData({
            title: data.title || '',
            description: data.description || '',
            type: data.type?.toLowerCase() || 'workshop',
            theme: data.theme || '',
            startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
            endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
            venue: data.venue || '',
            mode: data.mode?.toLowerCase() || 'offline',
            maxCapacity: data.maxCapacity || 50,
            currentCapacity: data.currentCapacity || 0,
            budget: data.budget?.toString() || '',
            actualCost: data.actualCost?.toString() || '',
            status: data.status || 'UPCOMING',
            approvalStatus: data.approvalStatus || 'PENDING',
            poster: data.poster || '',
            qrCode: data.qrCode || '',
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
            studentCoordinators: Array.isArray(data.studentCoordinators)
              ? data.studentCoordinators.join(', ')
              : '',
            facultyCoordinator: data.facultyCoordinator || '',
            facultyIncharge: data.facultyIncharge || '',
            resourcePersonName: (data.contactInfo as any)?.resourcePerson?.name || '',
            resourcePersonDesignation: (data.contactInfo as any)?.resourcePerson?.designation || '',
            resourcePersonOrganization: (data.contactInfo as any)?.resourcePerson?.organization || '',
            resourcePersonBio: (data.contactInfo as any)?.resourcePerson?.shortBio || ''
          });

          setPosterUrl(data.poster || null);
          setQrCodeUrl(data.qrCode || null);
          
          if (data.poster) {
            setPosterPreview(data.poster);
          }
          if (data.qrCode) {
            setQrCodePreview(data.qrCode);
          }
        } else {
          showToastMsg('Failed to load event data', true);
          router.push('/manage-event');
        }
      } catch (error) {
        console.error('Failed to fetch event:', error);
        showToastMsg('Failed to load event data', true);
      }
    };

    fetchEventData();
  }, [eventId, router]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleModeToggle = (mode: string) => {
    setFormData({ ...formData, mode });
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'poster');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosterUrl(data.url);
      } else {
        showToastMsg('Failed to upload poster', true);
      }
    } catch (error) {
      console.error('Poster upload error:', error);
      showToastMsg('Failed to upload poster', true);
    }
  };

  const handleQrCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToastMsg('Invalid file type. Please upload PNG, JPG, JPEG, or SVG', true);
      return;
    }
    
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
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'qr');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.url);
      } else {
        showToastMsg('Failed to upload QR code', true);
      }
    } catch (error) {
      console.error('QR code upload error:', error);
      showToastMsg('Failed to upload QR code', true);
    }
  };

  const removePoster = () => {
    setPosterFile(null);
    setPosterPreview(null);
    setPosterUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeQrCode = () => {
    setQrCodeFile(null);
    setQrCodePreview(null);
    setQrCodeUrl(null);
  };

  const showToastMsg = (msg: string, isError: boolean = false) => {
    setToastMessage(msg);
    setToastError(isError);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSave = async () => {
    if (!eventId) return;
    if (isSaving) return;

    setIsSaving(true);

    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        theme: formData.theme,
        startDate: formData.startDate,
        endDate: formData.endDate,
        venue: formData.venue,
        mode: formData.mode,
        maxCapacity: formData.maxCapacity,
        currentCapacity: formData.currentCapacity,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        actualCost: formData.actualCost ? parseFloat(formData.actualCost) : null,
        status: formData.status,
        approvalStatus: formData.approvalStatus,
        poster: posterUrl || formData.poster,
        qrCode: qrCodeUrl || formData.qrCode,
        tags: formData.tags.split(',').map(s => s.trim()).filter(s => s),
        studentCoordinators: formData.studentCoordinators.split(',').map(s => s.trim()).filter(s => s),
        facultyCoordinator: formData.facultyCoordinator,
        facultyIncharge: formData.facultyIncharge
      };

      if (formData.resourcePersonName) {
        updateData.contactInfo = {
          resourcePerson: {
            name: formData.resourcePersonName,
            designation: formData.resourcePersonDesignation,
            organization: formData.resourcePersonOrganization,
            shortBio: formData.resourcePersonBio
          }
        };
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      showToastMsg('Event updated successfully! 🎉');
      
      // Optionally regenerate proposal
      const shouldRegenerateProposal = confirm('Would you like to regenerate the proposal with the updated data?');
      if (shouldRegenerateProposal) {
        await regenerateProposal();
      }
    } catch (error) {
      console.error('Event update error:', error);
      showToastMsg(error instanceof Error ? error.message : 'Failed to update event', true);
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateProposal = async () => {
    if (!eventId) return;

    try {
      const proposalData = {
        eventName: formData.title,
        eventType: formData.type,
        eventTheme: formData.theme,
        proposedDate: formData.startDate,
        eventTime: '09:00',
        venue: formData.venue,
        mode: formData.mode,
        facultyCoordinator: formData.facultyCoordinator,
        studentCoordinators: formData.studentCoordinators.split(',').map(s => s.trim()).filter(s => s),
        clubName: eventData?.club?.name || 'Club',
        department: eventData?.club?.department || 'Department',
        resourcePerson: formData.resourcePersonName ? {
          name: formData.resourcePersonName,
          designation: formData.resourcePersonDesignation,
          organization: formData.resourcePersonOrganization,
          shortBio: formData.resourcePersonBio
        } : undefined,
        expectedParticipants: formData.maxCapacity,
        budgetItems: [],
        logistics: {},
        registrationLink: undefined,
        brochureLink: undefined
      };

      const response = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          formData: proposalData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate proposal');
      }

      showToastMsg('Proposal regenerated successfully! 🎉');
    } catch (error) {
      console.error('Proposal regeneration error:', error);
      showToastMsg('Failed to regenerate proposal', true);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <div className="header-eyebrow">
            <i className="fas fa-edit"></i> EDIT EVENT
          </div>
          <div className="page-title">Edit <span>{formData.title || 'Event'}</span></div>
          <div className="page-subtitle">Update event details and regenerate proposal if needed</div>
        </div>
      </div>

      <div className="page-container">
        <div className="section-card">
          <div className="section-head">
            <div className="section-icon-wrap gold"><i className="fas fa-calendar-alt"></i></div>
            <div className="section-title-group">
              <div className="section-title">Event Details</div>
              <div className="section-subtitle">Update the core event information</div>
            </div>
          </div>
          <div className="section-body">
            <div className="form-grid col-1">
              <div className="form-field">
                <label className="form-label">Event Title</label>
                <input type="text" className="form-input" id="title" value={formData.title} onChange={handleInputChange} maxLength={100} />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Event Type</label>
                <div className="select-wrap">
                  <select className="form-select" id="type" value={formData.type} onChange={handleInputChange}>
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
              <div className="form-field">
                <label className="form-label">Event Theme</label>
                <input type="text" className="form-input" id="theme" value={formData.theme} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" id="startDate" value={formData.startDate} onChange={handleInputChange} />
              </div>
              <div className="form-field">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" id="endDate" value={formData.endDate} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Venue</label>
                <input type="text" className="form-input" id="venue" value={formData.venue} onChange={handleInputChange} />
              </div>
              <div className="form-field">
                <label className="form-label">Mode</label>
                <div className="mode-toggle">
                  <button type="button" className={`mode-btn ${formData.mode === 'offline' ? 'active' : ''}`} onClick={() => handleModeToggle('offline')}>
                    <i className="fas fa-building"></i> Offline
                  </button>
                  <button type="button" className={`mode-btn ${formData.mode === 'online' ? 'active' : ''}`} onClick={() => handleModeToggle('online')}>
                    <i className="fas fa-wifi"></i> Online
                  </button>
                  <button type="button" className={`mode-btn ${formData.mode === 'hybrid' ? 'active' : ''}`} onClick={() => handleModeToggle('hybrid')}>
                    <i className="fas fa-layer-group"></i> Hybrid
                  </button>
                </div>
              </div>
            </div>

            <div className="form-grid col-1">
              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" id="description" value={formData.description} onChange={handleInputChange} style={{ minHeight: '100px' }} maxLength={500}></textarea>
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Max Capacity</label>
                <input type="number" className="form-input" id="maxCapacity" value={formData.maxCapacity} onChange={handleInputChange} min={1} max={10000} />
              </div>
              <div className="form-field">
                <label className="form-label">Current Capacity</label>
                <input type="number" className="form-input" id="currentCapacity" value={formData.currentCapacity} onChange={handleInputChange} min={0} max={10000} />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Budget</label>
                <input type="number" className="form-input" id="budget" value={formData.budget} onChange={handleInputChange} step="0.01" />
              </div>
              <div className="form-field">
                <label className="form-label">Actual Cost</label>
                <input type="number" className="form-input" id="actualCost" value={formData.actualCost} onChange={handleInputChange} step="0.01" />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Status</label>
                <div className="select-wrap">
                  <select className="form-select" id="status" value={formData.status} onChange={handleInputChange}>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Approval Status</label>
                <div className="select-wrap">
                  <select className="form-select" id="approvalStatus" value={formData.approvalStatus} onChange={handleInputChange}>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-grid col-1">
              <div className="form-field">
                <label className="form-label">Tags (comma-separated)</label>
                <input type="text" className="form-input" id="tags" value={formData.tags} onChange={handleInputChange} placeholder="e.g. workshop, technical, free" />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Faculty Coordinator</label>
                <input type="text" className="form-input" id="facultyCoordinator" value={formData.facultyCoordinator} onChange={handleInputChange} />
              </div>
              <div className="form-field">
                <label className="form-label">Faculty In-charge</label>
                <input type="text" className="form-input" id="facultyIncharge" value={formData.facultyIncharge} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-grid col-1">
              <div className="form-field">
                <label className="form-label">Student Coordinators (comma-separated)</label>
                <input type="text" className="form-input" id="studentCoordinators" value={formData.studentCoordinators} onChange={handleInputChange} placeholder="e.g. John Doe, Jane Smith" />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Resource Person Name</label>
                <input type="text" className="form-input" id="resourcePersonName" value={formData.resourcePersonName} onChange={handleInputChange} />
              </div>
              <div className="form-field">
                <label className="form-label">Designation</label>
                <input type="text" className="form-input" id="resourcePersonDesignation" value={formData.resourcePersonDesignation} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Organization</label>
                <input type="text" className="form-input" id="resourcePersonOrganization" value={formData.resourcePersonOrganization} onChange={handleInputChange} />
              </div>
              <div className="form-field">
                <label className="form-label">Short Bio</label>
                <input type="text" className="form-input" id="resourcePersonBio" value={formData.resourcePersonBio} onChange={handleInputChange} maxLength={100} />
              </div>
            </div>

            <div className="form-grid col-2">
              <div className="form-field">
                <label className="form-label">Event Poster</label>
                <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePosterUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  {posterPreview ? (
                    <div className="upload-preview show">
                      <img className="upload-preview-img" src={posterPreview} alt="Preview" />
                      <button type="button" className="upload-preview-remove" onClick={(e) => { e.stopPropagation(); removePoster(); }}><i className="fas fa-times"></i></button>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon"><i className="fas fa-cloud-upload-alt"></i></div>
                      <div className="upload-text">Click or drag & drop</div>
                      <div className="upload-hint">PNG, JPG, WEBP · Max 5 MB</div>
                    </>
                  )}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">QR Code</label>
                <div className="upload-area" onClick={() => qrInputRef.current?.click()}>
                  <input type="file" ref={qrInputRef} accept="image/png,image/jpeg,image/jpg,image/svg+xml" onChange={handleQrCodeUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                  {qrCodePreview ? (
                    <div className="upload-preview show">
                      <img className="upload-preview-img" src={qrCodePreview} alt="QR Preview" style={{ maxHeight: '60px' }} />
                      <button type="button" className="upload-preview-remove" onClick={(e) => { e.stopPropagation(); removeQrCode(); }}><i className="fas fa-times"></i></button>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon"><i className="fas fa-qrcode"></i></div>
                      <div className="upload-text">Upload QR Code</div>
                      <div className="upload-hint">PNG, JPG, JPEG, SVG · Max 2 MB</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="actions-bar">
          <div className="actions-inner">
            <div className="actions-left">
              <button type="button" className="btn btn-danger" onClick={() => router.push('/manage-event')}>
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
            <div className="actions-right">
              <button type="button" className="btn btn-gold" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><i className="fas fa-spinner fa-spin"></i> Updating...</> : <><i className="fas fa-save"></i> Update Event</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className={`toast show ${toastError ? 'error' : ''}`}>
          <i className={`fas ${toastError ? 'fa-exclamation-circle' : 'fa-check-circle'} toast-icon`}></i>
          <span>{toastMessage}</span>
        </div>
      )}

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
        }
        .toast.error {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
}
