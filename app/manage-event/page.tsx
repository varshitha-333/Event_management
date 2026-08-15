'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  department: string;
  date: string;
  location: string;
  description?: string;
  type?: string;
  category?: string;
  theme?: string;
  school?: string;
  venue?: string;
  mode?: string;
  maxCapacity?: number;
  currentCapacity?: number;
  status?: string;
  approvalStatus?: string;
  poster?: string;
  qrCode?: string;
  facultyCoordinator?: string;
  facultyIncharge?: string;
  studentCoordinators?: string[];
  contactInfo?: any;
  sponsorshipDetails?: any;
  proposalStatus?: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'REJECTED';
  reportStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

interface Photo {
  id: string;
  url: string;
  caption: string;
  albumTag: string;
}

interface Review {
  id: string;
  name: string;
  dept: string;
  rating: number;
  text: string;
  date: string;
  initials: string;
  color: string;
}

const DEPT_COLORS: Record<string, string> = {
  'computer-science': '#6366f1',
  'mathematics': '#8b5cf6',
  'physics': '#ec4899',
  'chemistry': '#f59e0b',
  'biology': '#10b981',
  'english': '#3b82f6',
  'history': '#ef4444'
};

const DEPT_NAMES: Record<string, string> = {
  'computer-science': 'Computer Science',
  'mathematics': 'Mathematics',
  'physics': 'Physics',
  'chemistry': 'Chemistry',
  'biology': 'Biology',
  'english': 'English',
  'history': 'History'
};

const DEPT_ICONS: Record<string, string> = {
  'computer-science': 'fa-laptop-code',
  'mathematics': 'fa-square-root-alt',
  'physics': 'fa-atom',
  'chemistry': 'fa-flask',
  'biology': 'fa-dna',
  'english': 'fa-book-open',
  'history': 'fa-landmark'
};

function getDepartmentColor(dept: string): string {
  return DEPT_COLORS[dept] || '#6366f1';
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AN';
}


export default function ManageEvent() {
  const router = useRouter();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPhotos, setPendingPhotos] = useState<Array<{ id: string; file: File; url: string; caption: string; albumTag: string }>>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerDept, setReviewerDept] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [feedbackSummary, setFeedbackSummary] = useState<string>('');
  const [albumTag, setAlbumTag] = useState('General');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  const [eventData, setEventData] = useState<Record<string, { photos: Photo[]; reviews: Review[] }>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idCounterRef = useRef(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [originalEventData, setOriginalEventData] = useState<Record<string, any>>({});

  // Function to check if event data has been modified
  const isEventModified = (eventId: string): boolean => {
    const currentEvent = events.find(e => e.id === eventId);
    const original = originalEventData[eventId];
    
    if (!currentEvent || !original) return false;
    
    // Compare key fields
    const fieldsToCompare = [
      'title', 'description', 'type', 'theme', 'startDate', 'endDate',
      'venue', 'mode', 'maxCapacity', 'currentCapacity', 'budget', 'actualCost',
      'status', 'approvalStatus', 'tags', 'facultyCoordinator', 'facultyIncharge',
      'studentCoordinators', 'contactInfo'
    ];
    
    for (const field of fieldsToCompare) {
      const currentValue = currentEvent[field as keyof Event];
      const originalValue = original[field];
      
      // Handle array comparison
      if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
        if (JSON.stringify(currentValue) !== JSON.stringify(originalValue)) {
          return true;
        }
      } else if (currentValue !== originalValue) {
        return true;
      }
    }
    
    return false;
  };
  const [reportData, setReportData] = useState({
    eventName: '',
    date: '',
    time: '',
    venue: '',
    eventType: '',
    organizer: '',
    facultyCoordinator: '',
    studentCoordinators: '',
    resourcePerson: '',
    actualParticipants: '',
    budgetUtilized: '',
    links: '',
    socialMediaLinks: '',
    photos: '',
    clubHead: 'Dr. Sharma',
    departmentHead: 'Dr. Patel',
    contactInformation: 'Email: event.club@jainuniversity.ac.in | Phone: +91-1234567890',
    additionalDocuments: 'Event photos, attendance sheets, feedback forms',
    attachmentNotes: 'All documents attached as per university guidelines',
    qrCode: 'QR Code for Event Report'
  });

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);

          // Check if user has permission to manage events (staff roles only)
          const staffRoles = ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'];
          if (!staffRoles.includes(data.role)) {
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
        setIsAuthLoading(false);
      }
    };

    checkUserRole();
  }, [router]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const data = await response.json();
          const transformedEvents = data.map((event: any) => ({
            id: event.id,
            name: event.title || event.name,
            department: event.club?.department || event.department,
            date: event.startDate || event.date,
            location: event.venue || event.location,
            description: event.description,
            type: event.type,
            category: event.category,
            theme: event.theme,
            school: event.school,
            venue: event.venue,
            mode: event.mode,
            maxCapacity: event.maxCapacity,
            currentCapacity: event.currentCapacity,
            status: event.status,
            approvalStatus: event.approvalStatus,
            poster: event.poster,
            qrCode: event.qrCode,
            facultyCoordinator: event.facultyCoordinator,
            facultyIncharge: event.facultyIncharge,
            studentCoordinators: event.studentCoordinators,
            contactInfo: event.contactInfo,
            sponsorshipDetails: event.sponsorshipDetails,
            proposalStatus: event.proposalStatus || 'DRAFT',
            reportStatus: event.reportStatus || 'DRAFT'
          }));
          setEvents(transformedEvents);

          // Store original event data for modification detection
          const originalData: Record<string, any> = {};
          data.forEach((event: any) => {
            originalData[event.id] = {
              title: event.title,
              description: event.description,
              type: event.type,
              theme: event.theme,
              startDate: event.startDate,
              endDate: event.endDate,
              venue: event.venue,
              mode: event.mode,
              maxCapacity: event.maxCapacity,
              currentCapacity: event.currentCapacity,
              budget: event.budget,
              actualCost: event.actualCost,
              status: event.status,
              approvalStatus: event.approvalStatus,
              tags: event.tags,
              facultyCoordinator: event.facultyCoordinator,
              facultyIncharge: event.facultyIncharge,
              studentCoordinators: event.studentCoordinators,
              contactInfo: event.contactInfo
            };
          });
          setOriginalEventData(originalData);
          
          const initialEventData: Record<string, { photos: Photo[]; reviews: Review[] }> = {};
          transformedEvents.forEach((ev: Event) => {
            initialEventData[ev.id] = {
              photos: [],
              reviews: []
            };
          });
          setEventData(initialEventData);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    setReviewDate(`${now.getFullYear()}-${mm}`);
  }, []);

  // Refresh events when page gains focus (e.g., returning from Edit Event)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const fetchEvents = async () => {
          try {
            const response = await fetch('/api/events');
            if (response.ok) {
              const data = await response.json();
              const transformedEvents = data.map((event: any) => ({
                id: event.id,
                name: event.title || event.name,
                department: event.club?.department || event.department,
                date: event.startDate || event.date,
                location: event.venue || event.location,
                description: event.description,
                type: event.type,
                category: event.category,
                theme: event.theme,
                school: event.school,
                venue: event.venue,
                mode: event.mode,
                maxCapacity: event.maxCapacity,
                currentCapacity: event.currentCapacity,
                status: event.status,
                approvalStatus: event.approvalStatus,
                poster: event.poster,
                qrCode: event.qrCode,
                facultyCoordinator: event.facultyCoordinator,
                facultyIncharge: event.facultyIncharge,
                studentCoordinators: event.studentCoordinators,
                contactInfo: event.contactInfo,
                sponsorshipDetails: event.sponsorshipDetails,
                proposalStatus: event.proposal?.status || 'DRAFT',
                reportStatus: event.report?.status || 'DRAFT'
              }));
              setEvents(transformedEvents);
              
              // Preserve existing event data for selected event
              if (selectedEventId) {
                const existingData = eventData[selectedEventId];
                const initialEventData: Record<string, { photos: Photo[]; reviews: Review[] }> = {};
                transformedEvents.forEach((ev: Event) => {
                  initialEventData[ev.id] = {
                    photos: ev.id === selectedEventId && existingData ? existingData.photos : [],
                    reviews: ev.id === selectedEventId && existingData ? existingData.reviews : []
                  };
                });
                setEventData(prev => ({ ...prev, ...initialEventData }));
              }
            }
          } catch (error) {
            console.error('Failed to refresh events:', error);
          }
        };

        fetchEvents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedEventId, eventData]);

  if (isAuthLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#C8920A', marginBottom: '16px' }}></i>
          <p style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const getTimeline = (date: string): 'past' | 'present' | 'future' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < today) return 'past';
    if (eventDate.getTime() === today.getTime()) return 'present';
    return 'future';
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const generateId = (): string => {
    // Use crypto.randomUUID if available, otherwise fallback to a robust random string
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: timestamp + random string + counter
    idCounterRef.current += 1;
    return `${idCounterRef.current}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`;
  };

  const getInitials = (name: string): string => {
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRandomColor = (): string => {
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const showToastMsg = (msg: string, isError: boolean = false) => {
    setToastMessage(msg);
    setToastError(isError);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3200);
  };

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (DEPT_NAMES[e.department] || e.department).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const currentEventData = selectedEventId ? eventData[selectedEventId] : null;

  const handleSelectEvent = async (id: string) => {
    setSelectedEventId(id);
    setPendingPhotos([]);
    setStarRating(0);
    setReviewerName('');
    setReviewerDept('');
    setReviewText('');
    setPhotoCaption('');
    setFeedbackSummary('');

    // Fetch photos and reviews for this event from database
    try {
      const [photosResponse, reviewsResponse, reportResponse] = await Promise.all([
        fetch(`/api/events/${id}/photos`),
        fetch(`/api/events/${id}/reviews`),
        fetch(`/api/report/${id}`)
      ]);

      const photos = photosResponse.ok ? await photosResponse.json() : [];
      const reviews = reviewsResponse.ok ? await reviewsResponse.json() : [];
      const reportData = reportResponse.ok ? await reportResponse.json() : null;

      if (reportData?.feedbackSummary) {
        setFeedbackSummary(reportData.feedbackSummary);
      }

      setEventData(prev => ({
        ...prev,
        [id]: {
          photos: photos.map((p: any) => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
            albumTag: p.albumTag
          })),
          reviews: reviews.map((r: any) => ({
            id: r.id,
            name: r.name || r.userId || 'Anonymous',
            dept: r.department || 'N/A',
            rating: r.rating,
            text: r.text || r.freeText || r.suggestions || '',
            date: r.date || new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            color: getDepartmentColor(r.department),
            initials: getInitials(r.name || r.userId || 'Anonymous')
          }))
        }
      }));
    } catch (error) {
      console.error('Failed to fetch event data:', error);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    addFiles(Array.from(files));
  };

  const addFiles = (files: File[]) => {
    files.forEach(file => {
      if (file.size > 8 * 1024 * 1024) {
        showToastMsg(`${file.name} is too large (max 8 MB)`, true);
        return;
      }
      const url = URL.createObjectURL(file);
      const newId = generateId();
      console.log('Adding photo with ID:', newId); // Debug log
      setPendingPhotos(prev => {
        // Check if this photo (by URL) already exists
        if (prev.some(p => p.url === url)) {
          console.log('Photo already exists, skipping');
          return prev;
        }
        return [...prev, { id: newId, file, url, caption: '', albumTag: 'General' }];
      });
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(files);
  };

  const removePendingPhoto = (id: string) => {
    setPendingPhotos(prev => prev.filter(p => p.id !== id));
  };

  const uploadPhotos = async () => {
    if (!selectedEventId || !pendingPhotos.length || isUploadingPhotos) return;

    setIsUploadingPhotos(true);

    try {
      const uploadPromises = pendingPhotos.map(async (photo) => {
        // Convert File to base64 for storage (in production, this should upload to cloud storage)
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(photo.file);
        });
        const base64 = await base64Promise;

        const response = await fetch(`/api/events/${selectedEventId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: base64,
            caption: photo.caption,
            albumTag: photo.albumTag
          })
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        return response.json();
      });

      const uploadedPhotos = await Promise.all(uploadPromises);

      // Update event data with uploaded photos, avoiding duplicates
      setEventData(prev => {
        const updated = { ...prev };
        const existingPhotoIds = new Set(updated[selectedEventId].photos.map(p => p.id));
        const newPhotos = uploadedPhotos
          .filter(p => !existingPhotoIds.has(p.id))
          .map(p => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
            albumTag: p.albumTag
          }));
        updated[selectedEventId].photos = [...updated[selectedEventId].photos, ...newPhotos];
        return updated;
      });

      setPendingPhotos([]);
      setPhotoCaption('');
      showToastMsg(`Photos added to "${selectedEvent?.name}" successfully!`);
    } catch (error) {
      console.error('Photo upload error:', error);
      showToastMsg('Failed to upload photos', true);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!selectedEventId) return;

    try {
      const response = await fetch(`/api/events/${selectedEventId}/photos?photoId=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      setEventData(prev => {
        const updated = { ...prev };
        updated[selectedEventId].photos = updated[selectedEventId].photos.filter(p => p.id !== id);
        return updated;
      });
      showToastMsg('Photo removed.');
    } catch (error) {
      console.error('Photo delete error:', error);
      showToastMsg('Failed to delete photo', true);
    }
  };

  const addReview = async () => {
    if (!selectedEventId) return;
    if (!reviewerName) { showToastMsg('Please enter the reviewer name.', true); return; }
    if (!reviewerDept) { showToastMsg('Please enter department / year.', true); return; }
    if (!starRating) { showToastMsg('Please select a star rating.', true); return; }
    if (!reviewText) { showToastMsg('Please enter the review text.', true); return; }
    if (isSubmittingReview) return;

    setIsSubmittingReview(true);

    try {
      const response = await fetch(`/api/events/${selectedEventId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: starRating,
          suggestions: reviewText,
          freeText: reviewText,
          isAnonymous: false,
          name: reviewerName,
          department: reviewerDept
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }

      // Refetch reviews from database to get the authoritative list
      const reviewsResponse = await fetch(`/api/events/${selectedEventId}/reviews`);
      if (reviewsResponse.ok) {
        const reviews = await reviewsResponse.json();
        setEventData(prev => {
          const updated = { ...prev };
          updated[selectedEventId].reviews = reviews.map((r: any) => ({
            id: r.id,
            name: r.name || r.userId || 'Anonymous',
            dept: r.department || 'N/A',
            rating: r.rating,
            text: r.text || r.freeText || r.suggestions || '',
            date: r.date || new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            color: getDepartmentColor(r.department),
            initials: getInitials(r.name || r.userId || 'Anonymous')
          }));
          return updated;
        });
      }

      setReviewerName('');
      setReviewerDept('');
      setReviewText('');
      setStarRating(0);
      showToastMsg('Review added successfully!');
    } catch (error) {
      console.error('Review submission error:', error);
      showToastMsg(error instanceof Error ? error.message : 'Failed to submit review', true);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const clearReviewForm = () => {
    setReviewerName('');
    setReviewerDept('');
    setReviewText('');
    setStarRating(0);
  };

  const deleteReview = (id: string) => {
    if (!selectedEventId) return;
    setEventData(prev => {
      const updated = { ...prev };
      updated[selectedEventId].reviews = updated[selectedEventId].reviews.filter(r => r.id !== id);
      return updated;
    });
    showToastMsg('Review removed.');
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId || !userRole) return;
    
    const staffRoles = ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'];
    if (!staffRoles.includes(userRole)) {
      showToastMsg('Only staff members can delete events', true);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${selectedEvent?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${selectedEventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete event');
      }

      showToastMsg('Event deleted successfully! 🗑️');
      
      // Remove event from local state
      setEvents(prev => prev.filter(e => e.id !== selectedEventId));
      setSelectedEventId(null);
      setEventData(prev => {
        const newState = { ...prev };
        delete newState[selectedEventId];
        return newState;
      });
    } catch (error) {
      console.error('Delete error:', error);
      showToastMsg(error instanceof Error ? error.message : 'Failed to delete event', true);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedEvent) return;
    setIsGeneratingReport(true);
    setGenerationProgress(0);
    setGenerationStep('Initializing...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });

        if (generationProgress < 30) setGenerationStep('Fetching event data and photos...');
        else if (generationProgress < 60) setGenerationStep('Generating AI content...');
        else if (generationProgress < 90) setGenerationStep('Compiling PDF...');
      }, 500);

      const response = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          formData: {
            ...reportData,
            photos: selectedPhotoIds.map(id => {
              const photo = currentEventData?.photos.find(p => p.id === id);
              return photo ? { url: photo.url, caption: photo.caption, albumTag: photo.albumTag } : null;
            }).filter(Boolean)
          }
        })
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStep('Complete!');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate report');
      }
      const result = await response.json();
      setReportGenerated(true);
      showToastMsg('Post-event report generated successfully! 🎉');
    } catch (error) {
      console.error('Generation error:', error);
      showToastMsg(error instanceof Error ? error.message : 'Failed to generate report', true);
    } finally {
      setIsGeneratingReport(false);
      setGenerationProgress(0);
      setGenerationStep('');
    }
  };

  const handleOpenReportModal = () => {
    if (!selectedEvent) return;
    console.log('[REPORT-MODAL] Opening report modal for event:', selectedEvent.id);
    console.log('[REPORT-MODAL] Event QR code:', selectedEvent.qrCode);
    
    setReportData(prev => ({
      ...prev,
      eventName: selectedEvent.name,
      date: selectedEvent.date,
      time: '09:00',
      venue: selectedEvent.location,
      eventType: selectedEvent.type || '',
      organizer: '',
      facultyCoordinator: selectedEvent.facultyCoordinator || '',
      studentCoordinators: Array.isArray(selectedEvent.studentCoordinators) 
        ? selectedEvent.studentCoordinators.join(', ') 
        : '',
      resourcePerson: (selectedEvent.contactInfo as any)?.resourcePerson?.name || '',
      actualParticipants: '',
      budgetUtilized: '',
      links: '',
      socialMediaLinks: '',
      photos: '',
      qrCode: selectedEvent.qrCode || ''
    }));
    setReportGenerated(false);
    setShowReportModal(true);
  };


  return (
    <div className="main-wrap">
      {/* LEFT: EVENT SELECTOR */}
      <div className="event-panel">
        <div className="panel-header">
          <div className="panel-header-icon"><i className="fas fa-calendar-days"></i></div>
          <div className="panel-header-text">
            <h3>Select Event</h3>
            <p>Choose from existing events</p>
          </div>
        </div>
        <div className="panel-search">
          <i className="fas fa-search panel-search-icon"></i>
          <input 
            type="text" 
            className="panel-search-input" 
            placeholder="Search events…" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="event-list">
          {isLoading ? (
            <div className="empty-state"><i className="fas fa-spinner fa-spin"></i><p>Loading events...</p></div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty-state"><i className="fas fa-search"></i><p>No events found</p></div>
          ) : (
            filteredEvents.map(ev => {
              const timeline = getTimeline(ev.date);
              const badgeText = { past: 'Past', present: 'Today', future: 'Upcoming' }[timeline];
              const badgeClass = { past: 'badge-past', present: 'badge-present', future: 'badge-future' }[timeline];
              const color = DEPT_COLORS[ev.department] || '#6366f1';
              const active = ev.id === selectedEventId ? ' active' : '';
              return (
                <div key={ev.id} className={`event-item${active}`} onClick={() => handleSelectEvent(ev.id)}>
                  <div className="event-item-dot" style={{ background: color }}></div>
                  <div className="event-item-info">
                    <div className="event-item-name">{ev.name}</div>
                    <div className="event-item-meta">{formatDate(ev.date)} · {DEPT_NAMES[ev.department]}</div>
                  </div>
                  <span className={`event-item-badge ${badgeClass}`}>{badgeText}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: CONTENT */}
      <div className="content-area">
        {!selectedEvent ? (
          <div className="card">
            <div className="card-body no-selection">
              <i className="fas fa-hand-pointer"></i>
              <p>Select an event from the left to manage its photos and reviews.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Selected Event Header */}
            <div className="selected-event-card">
              <div className="sel-event-icon" style={{ background: DEPT_COLORS[selectedEvent.department] }}>
                <i className={`fas ${DEPT_ICONS[selectedEvent.department]}`}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sel-event-name">{selectedEvent.name}</div>
                <div className="sel-event-meta">
                  <span><i className="fas fa-calendar"></i>{formatDate(selectedEvent.date)}</span>
                  <span><i className="fas fa-location-dot"></i>{selectedEvent.location}</span>
                  <span><i className="fas fa-tag"></i>{DEPT_NAMES[selectedEvent.department]}</span>
                  {selectedEvent.category && <span><i className="fas fa-folder"></i>{selectedEvent.category}</span>}
                  {selectedEvent.approvalStatus && <span><i className="fas fa-check-circle"></i>{selectedEvent.approvalStatus}</span>}
                </div>
 {selectedEvent.theme && (
                  <div style={{ fontSize: '12px', color: 'var(--text-pale)', marginTop: '4px' }}>
                    <i className="fas fa-palette"></i> {selectedEvent.theme}
                  </div>
                )}
                {selectedEvent.school && (
                  <div style={{ fontSize: '12px', color: 'var(--text-pale)', marginTop: '2px' }}>
                    <i className="fas fa-school"></i> {selectedEvent.school}
                  </div>
                )}
                {selectedEvent.facultyCoordinator && (
                  <div style={{ fontSize: '12px', color: 'var(--text-pale)', marginTop: '2px' }}>
                    <i className="fas fa-user-tie"></i> Coordinator: {selectedEvent.facultyCoordinator}
                  </div>
                )}
                {selectedEvent.studentCoordinators && selectedEvent.studentCoordinators.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-pale)', marginTop: '2px' }}>
                    <i className="fas fa-users"></i> Students: {selectedEvent.studentCoordinators.join(', ')}
                  </div>
                )}
              </div>
              {userRole && ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'].includes(userRole) && (
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={handleDeleteEvent}
                  title="Delete Event"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>

            {/* Proposal & Report Status */}
            <div className="card">
              <div className="card-body" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Proposal Status */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-pale)', marginBottom: '8px' }}>EVENT PROPOSAL</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className={`status-badge ${selectedEvent.proposalStatus?.toLowerCase() || 'draft'}`}>
                        {selectedEvent.proposalStatus || 'DRAFT'}
                      </span>
                      {(selectedEvent.proposalStatus === 'GENERATED' || selectedEvent.proposalStatus === 'APPROVED') && !isEventModified(selectedEvent.id) ? (
                        <button
                          className="btn btn-gold-outline btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            console.log(`[MANAGE-EVENT] Downloading proposal for event ${selectedEvent.id}`);
                            const link = document.createElement('a');
                            link.href = `/api/proposal/${selectedEvent.id}/download`;
                            link.download = `proposal_${selectedEvent.name.replace(/\s+/g, '_')}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <i className="fas fa-download"></i> Download Proposal
                        </button>
                      ) : (selectedEvent.proposalStatus === 'GENERATED' || selectedEvent.proposalStatus === 'APPROVED') && isEventModified(selectedEvent.id) ? (
                        <button
                          className="btn btn-warning btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            console.log(`[MANAGE-EVENT] Regenerating proposal for modified event ${selectedEvent.id}`);
                            setIsGeneratingProposal(true);
                            setGenerationProgress(0);
                            setGenerationStep('Initializing...');
                            
                            try {
                              const progressInterval = setInterval(() => {
                                setGenerationProgress(prev => {
                                  if (prev >= 90) return prev;
                                  return prev + 10;
                                });
                                
                                if (generationProgress < 30) setGenerationStep('Fetching event data...');
                                else if (generationProgress < 60) setGenerationStep('Generating AI content...');
                                else if (generationProgress < 90) setGenerationStep('Compiling PDF...');
                              }, 500);

                              const response = await fetch('/api/proposal/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  eventId: selectedEvent.id,
                                formData: {
                                  eventName: selectedEvent.name,
                                  eventType: selectedEvent.type || 'workshop',
                                  eventTheme: selectedEvent.theme || 'General',
                                  proposedDate: selectedEvent.date,
                                  eventTime: '09:00',
                                  venue: selectedEvent.location,
                                  mode: selectedEvent.mode || 'offline',
                                  facultyCoordinator: 'Faculty Coordinator',
                                  studentCoordinators: [],
                                  clubName: 'Event Club',
                                  department: selectedEvent.department,
                                  expectedParticipants: 50,
                                  budgetItems: [],
                                  logistics: {}
                                }
                              })
                              });
                              
                              clearInterval(progressInterval);
                              setGenerationProgress(100);
                              setGenerationStep('Complete!');
                              
                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.details || 'Failed to regenerate proposal');
                              }
                              
                              // Update original data after successful regeneration
                              const eventsResponse = await fetch('/api/events');
                              if (eventsResponse.ok) {
                                const data = await eventsResponse.json();
                                const transformedEvents = data.map((event: any) => ({
                                  id: event.id,
                                  name: event.title || event.name,
                                  department: event.club?.department || event.department,
                                  date: event.startDate || event.date,
                                  location: event.venue || event.location,
                                  description: event.description,
                                  type: event.type,
                                  category: event.category,
                                  theme: event.theme,
                                  school: event.school,
                                  venue: event.venue,
                                  mode: event.mode,
                                  maxCapacity: event.maxCapacity,
                                  currentCapacity: event.currentCapacity,
                                  status: event.status,
                                  approvalStatus: event.approvalStatus,
                                  poster: event.poster,
                                  qrCode: event.qrCode,
                                  facultyCoordinator: event.facultyCoordinator,
                                  facultyIncharge: event.facultyIncharge,
                                  studentCoordinators: event.studentCoordinators,
                                  contactInfo: event.contactInfo,
                                  sponsorshipDetails: event.sponsorshipDetails,
                                  proposalStatus: event.proposalStatus || 'DRAFT',
                                  reportStatus: event.reportStatus || 'DRAFT'
                                }));
                                setEvents(transformedEvents);
                                
                                // Update original data
                                const originalData: Record<string, any> = {};
                                data.forEach((event: any) => {
                                  originalData[event.id] = {
                                    title: event.title,
                                    description: event.description,
                                    type: event.type,
                                    theme: event.theme,
                                    startDate: event.startDate,
                                    endDate: event.endDate,
                                    venue: event.venue,
                                    mode: event.mode,
                                    maxCapacity: event.maxCapacity,
                                    currentCapacity: event.currentCapacity,
                                    budget: event.budget,
                                    actualCost: event.actualCost,
                                    status: event.status,
                                    approvalStatus: event.approvalStatus,
                                    tags: event.tags,
                                    facultyCoordinator: event.facultyCoordinator,
                                    facultyIncharge: event.facultyIncharge,
                                    studentCoordinators: event.studentCoordinators,
                                    contactInfo: event.contactInfo
                                  };
                                });
                                setOriginalEventData(originalData);
                              }
                              
                              showToastMsg('Proposal regenerated successfully! 🎉');
                            } catch (error) {
                              console.error('Proposal regeneration error:', error);
                              showToastMsg(error instanceof Error ? error.message : 'Failed to regenerate proposal', true);
                            } finally {
                              setIsGeneratingProposal(false);
                              setGenerationProgress(0);
                              setGenerationStep('');
                            }
                          }}
                          disabled={isGeneratingProposal}
                        >
                          {isGeneratingProposal ? (
                            <>
                              <i className="fas fa-spinner fa-spin"></i> Regenerating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sync-alt"></i> Regenerate Proposal
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            console.log(`[MANAGE-EVENT] Generating proposal for event ${selectedEvent.id}`);
                            setIsGeneratingProposal(true);
                            setGenerationProgress(0);
                            setGenerationStep('Initializing...');
                            
                            try {
                              // Simulate progress updates
                              const progressInterval = setInterval(() => {
                                setGenerationProgress(prev => {
                                  if (prev >= 90) return prev;
                                  return prev + 10;
                                });
                                
                                if (generationProgress < 30) setGenerationStep('Fetching event data...');
                                else if (generationProgress < 60) setGenerationStep('Generating AI content...');
                                else if (generationProgress < 90) setGenerationStep('Compiling PDF...');
                              }, 500);

                              const response = await fetch('/api/proposal/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  eventId: selectedEvent.id,
                                  formData: {
                                    eventName: selectedEvent.name,
                                    eventType: selectedEvent.type || 'workshop',
                                    eventTheme: selectedEvent.theme || 'General',
                                    proposedDate: selectedEvent.date,
                                    eventTime: '09:00',
                                    venue: selectedEvent.location,
                                    mode: selectedEvent.mode || 'offline',
                                    facultyCoordinator: 'Faculty Coordinator',
                                    studentCoordinators: [],
                                    clubName: 'Event Club',
                                    department: selectedEvent.department,
                                    expectedParticipants: 50,
                                    budgetItems: [],
                                    logistics: {}
                                  }
                                })
                              });
                              
                              clearInterval(progressInterval);
                              setGenerationProgress(100);
                              setGenerationStep('Complete!');
                              
                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.details || 'Failed to generate proposal');
                              }
                              
                              // Refresh events to update status
                              const eventsResponse = await fetch('/api/events');
                              if (eventsResponse.ok) {
                                const data = await eventsResponse.json();
                                const transformedEvents = data.map((event: any) => ({
                                  id: event.id,
                                  name: event.title || event.name,
                                  department: event.club?.department || event.department,
                                  date: event.startDate || event.date,
                                  location: event.venue,
                                  description: event.description,
                                  type: event.type,
                                  category: event.category,
                                  theme: event.theme,
                                  school: event.school,
                                  venue: event.venue,
                                  mode: event.mode,
                                  maxCapacity: event.maxCapacity,
                                  currentCapacity: event.currentCapacity,
                                  status: event.status,
                                  approvalStatus: event.approvalStatus,
                                  poster: event.poster,
                                  qrCode: event.qrCode,
                                  facultyCoordinator: event.facultyCoordinator,
                                  facultyIncharge: event.facultyIncharge,
                                  studentCoordinators: event.studentCoordinators,
                                  contactInfo: event.contactInfo,
                                  sponsorshipDetails: event.sponsorshipDetails,
                                  proposalStatus: event.proposalStatus || 'DRAFT',
                                  reportStatus: event.reportStatus || 'DRAFT'
                                }));
                                setEvents(transformedEvents);
                                // Update the current event data cache
                                const updatedEvent = transformedEvents.find((e: any) => e.id === selectedEvent.id);
                                if (updatedEvent) {
                                  setEventData(prev => ({
                                    ...prev,
                                    [selectedEvent.id]: {
                                      photos: eventData[selectedEvent.id]?.photos || [],
                                      reviews: eventData[selectedEvent.id]?.reviews || []
                                    }
                                  }));
                                }
                              }
                              
                              showToastMsg('Proposal generated successfully! 🎉');
                            } catch (error) {
                              console.error('Proposal generation error:', error);
                              showToastMsg(error instanceof Error ? error.message : 'Failed to generate proposal', true);
                            } finally {
                              setIsGeneratingProposal(false);
                              setGenerationProgress(0);
                              setGenerationStep('');
                            }
                          }}
                          disabled={isGeneratingProposal}
                        >
                          {isGeneratingProposal ? (
                            <>
                              <i className="fas fa-spinner fa-spin"></i> Generating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-magic"></i> Generate Proposal
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Modal */}
                  {(isGeneratingProposal || isGeneratingReport) && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '30px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        minWidth: '300px'
                      }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#e5e7eb',
                          borderRadius: '4px',
                          marginBottom: '16px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${generationProgress}%`,
                            height: '100%',
                            background: 'var(--gold)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                          {generationStep}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {generationProgress}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Post Event Proposal Status */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-pale)', marginBottom: '8px' }}>POST EVENT PROPOSAL</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className={`status-badge ${selectedEvent.reportStatus?.toLowerCase() || 'draft'}`}>
                        {selectedEvent.reportStatus || 'DRAFT'}
                      </span>
                      {(selectedEvent.reportStatus === 'SUBMITTED' || selectedEvent.reportStatus === 'APPROVED') && !isEventModified(selectedEvent.id) ? (
                        <button
                          className="btn btn-gold-outline btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={async () => {
                            const link = document.createElement('a');
                            link.href = `/api/report/${selectedEvent.id}/download`;
                            link.download = `post_event_report_${selectedEvent.name.replace(/\s+/g, '_')}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <i className="fas fa-download"></i> Download Post Event Report
                        </button>
                      ) : (selectedEvent.reportStatus === 'SUBMITTED' || selectedEvent.reportStatus === 'APPROVED') && isEventModified(selectedEvent.id) ? (
                        <button
                          className="btn btn-warning btn-sm"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => handleOpenReportModal()}
                        >
                          <i className="fas fa-sync-alt"></i> Regenerate Post Event Report
                        </button>
                      ) : null}
                    </div>
                    {selectedEvent.reportStatus === 'DRAFT' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleOpenReportModal()}
                      >
                        <i className="fas fa-magic"></i> Generate Post Event Report
                      </button>
                    )}
                  </div>

                  {/* Edit Event */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-pale)', marginBottom: '8px' }}>EVENT MANAGEMENT</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <button
                        className="btn btn-gold-outline btn-sm"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => router.push(`/edit-event/${selectedEvent.id}`)}
                      >
                        <i className="fas fa-edit"></i> Edit Event
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* PHOTOS CARD */}
            <div className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <div className="card-head-icon icon-photo"><i className="fas fa-images"></i></div>
                  <div className="card-head-text">
                    <h3>Event Photos</h3>
                    <p>Upload images from this event</p>
                  </div>
                </div>
                <span className="card-count">{currentEventData?.photos.length || 0} uploaded</span>
              </div>
              <div className="card-body">
                {/* Drop zone */}
                <div 
                  className={`photo-drop ${dragOver ? 'dragover' : ''}`} 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*" 
                    multiple 
                    onChange={handlePhotoSelect}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                  <div className="photo-drop-icon"><i className="fas fa-cloud-arrow-up"></i></div>
                  <div className="photo-drop-title">Drop photos here</div>
                  <div className="photo-drop-sub">or <b>browse to upload</b> · JPG, PNG, WEBP · Max 8 MB each</div>
                </div>

                {/* Preview grid (pending) */}
                {pendingPhotos.length > 0 && (
                  <div className="photo-preview-grid">
                    {pendingPhotos.map((p, index) => (
                      <div key={`${p.id}-${index}`} className="photo-thumb">
                        <img src={p.url} alt="preview" />
                        <div className="photo-thumb-overlay">
                          <button className="photo-thumb-del" onClick={() => removePendingPhoto(p.id)}><i className="fas fa-trash"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Per-upload meta */}
                {pendingPhotos.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div className="photo-meta-row">
                      <div>
                        <label className="form-label">Album / Category</label>
                        <select className="form-select" value={albumTag} onChange={(e) => setAlbumTag(e.target.value)}>
                          <option key="general" value="General">General</option>
                          <option key="opening" value="Opening Session">Opening Session</option>
                          <option key="ceremony" value="Ceremony">Ceremony</option>
                          <option key="networking" value="Networking">Networking</option>
                          <option key="lab" value="Lab Session">Lab Session</option>
                          <option key="panel" value="Panel Discussion">Panel Discussion</option>
                          <option key="closing" value="Closing Ceremony">Closing Ceremony</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Caption <span style={{ fontWeight: 400, color: 'var(--text-pale)' }}>(optional)</span></label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={photoCaption}
                          onChange={(e) => setPhotoCaption(e.target.value)}
                          placeholder="Brief caption for these photos…" 
                          maxLength={80} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Already-uploaded photos */}
                {currentEventData?.photos && currentEventData.photos.length > 0 && (
                  <div className="photo-preview-grid">
                    {currentEventData.photos.map((p, index) => (
                      <div key={`${p.id}-${index}`} className="photo-thumb" title={p.caption || p.albumTag}>
                        <img src={p.url} alt={p.caption} />
                        <div className="photo-thumb-overlay">
                          <button className="photo-thumb-del" onClick={() => deletePhoto(p.id)}><i className="fas fa-trash"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action bar */}
                <div className="upload-bar">
                  <span className="upload-count">
                    {pendingPhotos.length > 0 ? <><b>{pendingPhotos.length}</b> photo{pendingPhotos.length !== 1 ? 's' : ''} ready to upload</> : ''}
                  </span>
                  {pendingPhotos.length > 0 && (
                    <button className="btn btn-primary" onClick={uploadPhotos}>
                      <i className="fas fa-cloud-arrow-up"></i> Upload Photos
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* REVIEWS CARD */}
            <div className="card">
              <div className="card-head">
                <div className="card-head-left">
                  <div className="card-head-icon icon-review"><i className="fas fa-star"></i></div>
                  <div className="card-head-text">
                    <h3>Attendee Reviews</h3>
                    <p>Add feedback from event participants</p>
                  </div>
                </div>
                <span className="card-count">{currentEventData?.reviews.length || 0} review{(currentEventData?.reviews.length || 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="card-body">
                {/* Reviewer info */}
                <div className="reviewer-row">
                  <div>
                    <label className="form-label">Reviewer Name <span className="req">*</span></label>
                    <div className="input-icon-wrap">
                      <i className="fas fa-user input-icon"></i>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="e.g. Ananya Menon" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Department / Year <span className="req">*</span></label>
                    <div className="input-icon-wrap">
                      <i className="fas fa-graduation-cap input-icon"></i>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={reviewerDept}
                        onChange={(e) => setReviewerDept(e.target.value)}
                        placeholder="e.g. Physics, 2nd Year" 
                      />
                    </div>
                  </div>
                </div>

                {/* Star rating */}
                <div className="star-field">
                  <div className="star-label">Rating <span className="req">*</span></div>
                  <div className="star-row">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button 
                        key={n} 
                        type="button" 
                        className={`star-btn ${n <= starRating ? 'active' : ''}`} 
                        onClick={() => setStarRating(n)}
                      >★</button>
                    ))}
                    <span className="star-val">{starRating > 0 ? `${starRating}.0` : '–'}</span>
                  </div>
                </div>

                {/* Review text */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label">Review <span className="req">*</span></label>
                  <textarea 
                    className="form-textarea" 
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share what made this event stand out…" 
                    maxLength={400} 
                  />
                  <div className="char-count">{reviewText.length}/400</div>
                </div>

                {/* Date month */}
                <div style={{ marginBottom: '18px' }}>
                  <label className="form-label">Review Date <span className="req">*</span></label>
                  <div className="input-icon-wrap" style={{ maxWidth: '220px' }}>
                    <i className="fas fa-calendar input-icon"></i>
                    <input 
                      type="month" 
                      className="form-input" 
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={clearReviewForm}><i className="fas fa-rotate-left"></i> Clear</button>
                  <button className="btn btn-primary btn-sm" onClick={addReview}><i className="fas fa-plus"></i> Add Review</button>
                </div>

                {/* Existing reviews */}
                <div className="reviews-list">
                  {feedbackSummary && (
                    <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-chart-line" style={{ color: 'var(--gold)' }}></i>
                        AI-Generated Feedback Summary
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-mid)', lineHeight: '1.5' }}>{feedbackSummary}</p>
                    </div>
                  )}
                  {currentEventData?.reviews && currentEventData.reviews.length > 0 ? (
                    <>
                      <div className="reviews-list-label">
                        {currentEventData.reviews.length} review{currentEventData.reviews.length !== 1 ? 's' : ''} · Avg {(currentEventData.reviews.reduce((s, r) => s + r.rating, 0) / currentEventData.reviews.length).toFixed(1)} ★
                      </div>
                      {currentEventData.reviews.map((r, index) => (
                        <div key={`${r.id}-${index}`} className="review-item">
                          <div className="review-item-top">
                            <div className="review-author">
                              <div className="review-avatar" style={{ background: r.color }}>{r.initials}</div>
                              <div>
                                <div className="review-author-name">{r.name}</div>
                                <div className="review-author-dept">{r.dept}</div>
                              </div>
                            </div>
                            <div className="review-stars">
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} className={n <= r.rating ? '' : 'empty'}>★</span>
                              ))}
                            </div>
                          </div>
                          <div className="review-text">{r.text}</div>
                          <div className="review-date">{r.date}</div>
                          <button className="review-del-btn" onClick={() => deleteReview(r.id)} title="Remove"><i className="fas fa-trash"></i></button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="empty-state"><i className="fas fa-comment-slash"></i><p>No reviews yet for this event.</p></div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TOAST */}
      {showToast && (
        <div className={`toast ${toastError ? 'toast-error' : 'toast-success'} show`}>
          <i className={toastError ? 'fas fa-circle-exclamation' : 'fas fa-circle-check'}></i>
          <span className="toast-msg">{toastMessage}</span>
        </div>
      )}

      {/* REPORT GENERATION MODAL - POST EVENT ONLY */}
      {showReportModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-card" style={{ background: 'var(--white)', borderRadius: '16px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
                Generate Post-Event Report
              </h2>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-soft)' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {reportGenerated ? (
              <>
                <div className="success-banner" style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <i className="fas fa-check-circle success-icon" style={{ fontSize: '24px' }}></i>
                  <div className="success-text">
                    <div style={{ fontWeight: 700 }}>Report Generated Successfully!</div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>The event report has been created and is ready for download.</div>
                  </div>
                </div>

                {/* Feedback Summary */}
                {currentEventData?.reviews && currentEventData.reviews.length > 0 && (
                  <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-star" style={{ color: 'var(--gold)' }}></i>
                      Feedback Summary
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '8px' }}>
                      <strong>{currentEventData.reviews.length} review{currentEventData.reviews.length !== 1 ? 's' : ''}</strong> · 
                      Average Rating: <strong>{(currentEventData.reviews.reduce((s, r) => s + r.rating, 0) / currentEventData.reviews.length).toFixed(1)} ★</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {currentEventData.reviews.slice(0, 3).map(r => (
                        <div key={r.id} style={{ background: 'var(--white)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{r.name}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{r.date}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-mid)' }}>{r.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowReportModal(false)}
                    style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--white)', color: 'var(--text-mid)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => selectedEvent && window.open(`/api/report/${selectedEvent.id}/download`, '_blank')}
                    style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: 'var(--gold)', color: 'var(--navy)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <i className="fas fa-download"></i> Download Report
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Photo Selection for Post-Event Reports */}
                {currentEventData?.photos && currentEventData.photos.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '8px' }}>
                      Select Photos for Report ({selectedPhotoIds.length} selected)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '200px', overflow: 'auto', padding: '8px', background: 'var(--surface)', borderRadius: '8px' }}>
                      {currentEventData.photos.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => {
                            setSelectedPhotoIds(prev => 
                              prev.includes(photo.id) 
                                ? prev.filter(id => id !== photo.id)
                                : [...prev, photo.id]
                            );
                          }}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: selectedPhotoIds.includes(photo.id) ? '3px solid var(--gold)' : '2px solid var(--border)',
                            aspectRatio: '16/9'
                          }}
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {selectedPhotoIds.includes(photo.id) && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'var(--gold)',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <i className="fas fa-check" style={{ fontSize: '12px', color: 'var(--navy)' }}></i>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => setSelectedPhotoIds(currentEventData.photos.map(p => p.id))}
                        style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--white)', cursor: 'pointer' }}
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedPhotoIds([])}
                        style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--white)', cursor: 'pointer' }}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Actual Participants</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.actualParticipants}
                    onChange={(e) => setReportData({ ...reportData, actualParticipants: e.target.value })}
                    placeholder="Number of attendees"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Budget Utilized</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.budgetUtilized}
                    onChange={(e) => setReportData({ ...reportData, budgetUtilized: e.target.value })}
                    placeholder="₹10,000"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Event Links</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.links}
                    onChange={(e) => setReportData({ ...reportData, links: e.target.value })}
                    placeholder="https://example.com/event"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Social Media Links (comma-separated)</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.socialMediaLinks}
                    onChange={(e) => setReportData({ ...reportData, socialMediaLinks: e.target.value })}
                    placeholder="https://twitter.com/..., https://instagram.com/..."
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Number of Photos</label>
                  <input
                    type="number"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.photos}
                    onChange={(e) => setReportData({ ...reportData, photos: e.target.value })}
                    placeholder="Total photos uploaded"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Club Head</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.clubHead}
                    onChange={(e) => setReportData({ ...reportData, clubHead: e.target.value })}
                    placeholder="Dr. Sharma"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Department Head</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.departmentHead}
                    onChange={(e) => setReportData({ ...reportData, departmentHead: e.target.value })}
                    placeholder="Dr. Patel"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Contact Information</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.contactInformation}
                    onChange={(e) => setReportData({ ...reportData, contactInformation: e.target.value })}
                    placeholder="Email: club@jainuniversity.ac.in | Phone: +91-1234567890"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Additional Documents</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.additionalDocuments}
                    onChange={(e) => setReportData({ ...reportData, additionalDocuments: e.target.value })}
                    placeholder="Event photos, attendance sheets, feedback forms"
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>Attachment Notes</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.attachmentNotes}
                    onChange={(e) => setReportData({ ...reportData, attachmentNotes: e.target.value })}
                    placeholder="All documents attached as per university guidelines"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '6px' }}>QR Code Description</label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    value={reportData.qrCode}
                    onChange={(e) => setReportData({ ...reportData, qrCode: e.target.value })}
                    placeholder="QR Code for Event Report"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowReportModal(false)}
                    style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--white)', color: 'var(--text-mid)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: 'var(--gold)', color: 'var(--navy)', fontSize: '14px', fontWeight: 600, cursor: isGeneratingReport ? 'not-allowed' : 'pointer', opacity: isGeneratingReport ? 0.7 : 1 }}
                  >
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
