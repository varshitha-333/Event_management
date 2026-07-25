'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import './bento.css';

const DEPT_ICONS = {'computer-science':'fa-laptop-code','mathematics':'fa-square-root-alt','physics':'fa-atom','chemistry':'fa-flask','biology':'fa-dna','english':'fa-book-open','history':'fa-landmark'};
const DEPT_COLORS = {'computer-science':'#6366f1','mathematics':'#8b5cf6','physics':'#ec4899','chemistry':'#f59e0b','biology':'#10b981','english':'#3b82f6','history':'#ef4444'};

function getEventTimeline(date: string) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const eventDate = new Date(date);
  eventDate.setHours(0,0,0,0);
  if (eventDate < today) return 'past';
  if (eventDate.getTime() === today.getTime()) return 'present';
  return 'future';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'});
}

function formatTime(time: string) {
  if (!time) return '—';
  const [h, m] = time.split(':');
  const hh = parseInt(h);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`;
}

function getDepartmentName(dept: string) {
  const names = {'computer-science':'Computer Science','mathematics':'Mathematics','physics':'Physics','chemistry':'Chemistry','biology':'Biology','english':'English','history':'History'};
  return names[dept as keyof typeof names] || dept;
}

function getDeptColor(dept: string) {
  return DEPT_COLORS[dept as keyof typeof DEPT_COLORS] || '#6366f1';
}

export default function BentoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('id');
  const [event, setEvent] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [similarEvents, setSimilarEvents] = useState<any[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<string>('');

  useEffect(() => {
    const fetchEvent = async () => {
      if (eventId) {
        try {
          const response = await fetch(`/api/events/${eventId}`);
          if (response.ok) {
            const data = await response.json();
            setEvent(data);
            setReviews(data.reviews || []);

            // Fetch photos
            const photosResponse = await fetch(`/api/events/${eventId}/photos`);
            if (photosResponse.ok) {
              const photosData = await photosResponse.json();
              setPhotos(photosData.photos || []);
            }

            // Fetch similar events
            const similarResponse = await fetch(`/api/events?department=${data.department}&limit=3`);
            if (similarResponse.ok) {
              const similarData = await similarResponse.json();
              setSimilarEvents(similarData.filter((e: any) => e.id !== eventId).slice(0, 3));
            }

            // Fetch report data to get AI-generated feedback summary
            try {
              const reportResponse = await fetch(`/api/report/${eventId}`);
              if (reportResponse.ok) {
                const reportData = await reportResponse.json();
                if (reportData.feedbackSummary) {
                  setFeedbackSummary(reportData.feedbackSummary);
                }
              }
            } catch (error) {
              console.log('No report data available yet');
            }

            // Generate feedback summary from reviews if no AI summary available
            if (!feedbackSummary && data.reviews && data.reviews.length > 0) {
              const avgRating = data.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / data.reviews.length;
              const positiveCount = data.reviews.filter((r: any) => r.rating >= 4).length;
              const summary = `Average rating: ${avgRating.toFixed(1)}/5.0 (${positiveCount} positive reviews out of ${data.reviews.length})`;
              setFeedbackSummary(summary);
            }
          } else {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Failed to fetch event:', error);
          router.push('/dashboard');
        } finally {
          setIsLoading(false);
        }
      } else {
        router.push('/dashboard');
      }
    };

    fetchEvent();
  }, [eventId, router]);

  const carouselImages = [
    'https://sspark.genspark.ai/cfimages?u1=6ZHoRqBYokv%2BZuaUVAWJ59RhekCSxFublXKKKy%2FcTpcDzZpMTSK%2F80NXLQxSP6k9KFExevXL4hkQ7YgdiQqrnjA36nb9QYZjN8bkBDH4y8q0rjNDkARk2Z6oSJln1%2BXI2vctkzhZfRaX1UBZwRsxYq2QdyaMOSLW&u2=Rx8s3FHU4dO%2BBOVm&width=2560',
    'https://sspark.genspark.ai/cfimages?u1=bLrv5Y5vv%2FSFxWzBC5nIjTc5CTfNuHbT0QIBMolripsDWBHQPG8y9ODD%2BLcogjzA4jwfA5oVSoLWR7MK5jwfW3j2%2FdDPihywZsBGLBiTD0H9qK%2F9X6gbGMZCUCA%3D&u2=MjLTrwv2UWFpSCra&width=2560',
    'https://sspark.genspark.ai/cfimages?u1=LMVuXcNKrG1413inO%2FkNNWf291a44MrdfVMAnnilLziVYAWnBMR4V9WadaNyFqCNsEOA9vGfJnh2EwISaFr04BSyLz8Jb7pL3c%2Fa91EaXfskKUvfzMVGr8%2B9nTGWxyTJd9d9DFJyqVpTH9Je&u2=FvhvlnkUSQZMDHbp&width=2560',
  ];

  const galleryImages = photos.length > 0
    ? photos.map((photo: any, index: number) => ({
        src: photo.url,
        alt: photo.caption || `Photo ${index + 1}`,
        cat: photo.category || 'session'
      }))
    : [
        { src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&auto=format&fit=crop&q=80', alt: 'Opening session', cat: 'session' },
        { src: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&auto=format&fit=crop&q=80', alt: 'Award ceremony', cat: 'ceremony' },
        { src: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=80', alt: 'Networking', cat: 'networking' },
        { src: 'https://images.unsplash.com/photo-1605711285791-0219e80e43a3?w=600&auto=format&fit=crop&q=80', alt: 'Lab session', cat: 'session' },
        { src: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80', alt: 'Panel discussion', cat: 'session' },
        { src: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=900&auto=format&fit=crop&q=80', alt: 'Group networking', cat: 'networking' },
        { src: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80', alt: 'Closing ceremony', cat: 'ceremony' },
      ];

  // Default reviews if no real reviews exist
  const defaultReviews = [
    {
      id: '1',
      name: 'Rahul Sharma',
      department: 'Computer Science',
      rating: 5,
      text: 'Excellent event! Very well organized and informative. Learned a lot from the speakers.',
      date: 'January 2025',
      color: '#6366f1'
    },
    {
      id: '2',
      name: 'Priya Patel',
      department: 'Mathematics',
      rating: 4,
      text: 'Great content and networking opportunities. Would definitely attend future events.',
      date: 'January 2025',
      color: '#8b5cf6'
    },
    {
      id: '3',
      name: 'Amit Kumar',
      department: 'Physics',
      rating: 5,
      text: 'Outstanding organization and very knowledgeable speakers. Highly recommended!',
      date: 'January 2025',
      color: '#ec4899'
    }
  ];

  const displayReviews = reviews.length > 0 ? reviews : defaultReviews;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextLightbox = () => {
    setLightboxIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevLightbox = () => {
    setLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  if (isLoading || !event) {
    return (
      <div className="bento-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
        <div style={{textAlign:'center'}}>
          <i className="fas fa-spinner fa-spin" style={{fontSize:'32px',color:'var(--gold)',marginBottom:'16px'}}></i>
          <p style={{color:'var(--text-mid)'}}>{isLoading ? 'Loading event details…' : 'Event not found'}</p>
        </div>
      </div>
    );
  }

  const timeline = getEventTimeline(event.date);
  const statusLabel = {past:'Past', present:'Today', future:'Upcoming'}[timeline];
  const statusClass = {past:'past', present:'present', future:'upcoming'}[timeline];
  const deptColor = getDeptColor(event.department);
  const icon = DEPT_ICONS[event.department as keyof typeof DEPT_ICONS] || 'fa-calendar';

  const seatsFilled = Math.floor(event.capacity * 0.75);
  const seatsPct = Math.round((seatsFilled / event.capacity) * 100);

  return (
    <div className="bento-page">
      <section className="bento-toolbar">
        <div className="bento-toolbar-inner">
          <div className="bento-toolbar-copy">
            <span className="bento-toolbar-label">
              <i className="fas fa-sparkles"></i>
              Event Spotlight
            </span>
            <h1 className="bento-toolbar-title">{isLoading ? 'Loading event details…' : event.name}</h1>
            <p className="bento-toolbar-subtitle">
              Explore the event story, registrations, photos, and attendee feedback in a cleaner single-column-to-two-column responsive layout.
            </p>
          </div>
          <div className="bento-toolbar-actions">
            <span className="bento-toolbar-chip">
              <i className={`fas ${icon}`}></i>
              {getDepartmentName(event.department)}
            </span>
            <span className="bento-toolbar-chip">
              <i className="fas fa-calendar-day"></i>
              {formatDate(event.date)}
            </span>
            <a href="/dashboard" className="bento-back-link">
              <i className="fas fa-arrow-left"></i>
              Back to all events
            </a>
          </div>
        </div>
      </section>

      <section className="hero-section">
        <div className="hero-carousel">
          <div className="hero-carousel-track">
            {carouselImages.map((img, index) => (
              <figure
                key={index}
                className={`hero-slide ${index === currentSlide ? 'is-active' : ''}`}
              >
                <img src={img} alt="Event atmosphere" />
              </figure>
            ))}
          </div>
          <div className="hero-grad"></div>
        </div>

        <div className="hero-controls">
          <button className="h-ctrl" onClick={prevSlide}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="h-ctrl" onClick={nextSlide}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="hero-dots">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <div className="hero-content-overlay">
          <div className="hero-content-inner">
            <div className="hero-tag-row">
              <span className="hero-tag">{getDepartmentName(event.department)}</span>
              <span className="hero-tag">Lecture</span>
              <span className="hero-tag">Research</span>
            </div>
            <h1 className="hero-title">{event.name}</h1>
            <p className="hero-tagline">Science. Discovery. Innovation.</p>
            <div className="hero-meta-row">
              <span className={`hero-badge ${statusClass}`}>{statusLabel}</span>
              <span className="hero-meta-item">
                <i className="fas fa-building"></i>
                {getDepartmentName(event.department)}
              </span>
              <span className="hero-meta-item">
                <i className="fas fa-calendar-day"></i>
                {formatDate(event.date)}
              </span>
              <span className="hero-meta-item">
                <i className="fas fa-clock"></i>
                {formatTime(event.time)}
              </span>
              <span className="hero-meta-item">
                <i className="fas fa-map-marker-alt"></i>
                {event.location}
              </span>
              <span className="hero-meta-item">
                <i className="fas fa-user-tie"></i>
                {event.organizer}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-progress-strip">
          <div className="hero-progress-fill-bar" style={{ width: `${seatsPct}%` }}></div>
        </div>
      </section>

      <div className="page-wrapper">
        <div className="page-layout">
          <main className="content-col">
            <section className="sec-card">
              <div className="sec-header">
                <div className="sec-icon"><i className="fas fa-images"></i></div>
                <h2 className="sec-title">Event Photos</h2>
                <div className="sec-count-pill">
                  <i className="fas fa-photo-video"></i> {photos.length > 0 ? photos.length : 7} photos
                </div>
              </div>
              <div className="sec-body">
                {/* Photo Folder Blocks */}
                <div className="photo-folders-grid">
                  <div className="photo-folder-block" onClick={() => openLightbox(0)}>
                    <div className="photo-folder-preview">
                      <img src={galleryImages[0]?.src || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&auto=format&fit=crop&q=80'} alt="Sessions" />
                      <div className="photo-folder-count">
                        <i className="fas fa-images"></i>
                        <span>{Math.ceil(galleryImages.length / 2)}</span>
                      </div>
                    </div>
                    <div className="photo-folder-info">
                      <h3 className="photo-folder-title">Sessions</h3>
                      <p className="photo-folder-desc">Main event sessions and presentations</p>
                    </div>
                  </div>

                  <div className="photo-folder-block" onClick={() => openLightbox(Math.ceil(galleryImages.length / 2))}>
                    <div className="photo-folder-preview">
                      <img src={galleryImages[1]?.src || 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&auto=format&fit=crop&q=80'} alt="Ceremony" />
                      <div className="photo-folder-count">
                        <i className="fas fa-images"></i>
                        <span>{Math.floor(galleryImages.length / 2)}</span>
                      </div>
                    </div>
                    <div className="photo-folder-info">
                      <h3 className="photo-folder-title">Ceremony</h3>
                      <p className="photo-folder-desc">Opening and closing ceremonies</p>
                    </div>
                  </div>

                  <div className="photo-folder-block" onClick={() => openLightbox(0)}>
                    <div className="photo-folder-preview">
                      <img src={galleryImages[2]?.src || 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&auto=format&fit=crop&q=80'} alt="Networking" />
                      <div className="photo-folder-count">
                        <i className="fas fa-images"></i>
                        <span>{galleryImages.length}</span>
                      </div>
                    </div>
                    <div className="photo-folder-info">
                      <h3 className="photo-folder-title">Networking</h3>
                      <p className="photo-folder-desc">Attendee interactions and networking</p>
                    </div>
                  </div>
                </div>

                <div className="gallery-folder-bar">
                  <div className="gallery-folder-info">
                    <i className="fas fa-folder-open"></i>
                    <div>
                      <span className="gf-folder-title">Complete Photo Gallery</span>
                      <span className="gf-folder-meta">
                        {photos.length > 0
                          ? `${photos.length} photos · Uploaded by ${event.organizer} · ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
                          : 'No photos uploaded yet · Default placeholder images shown'
                        }
                      </span>
                    </div>
                  </div>
                  <a href="#" className="gf-folder-btn">
                    <i className="fas fa-external-link-alt"></i> View All Photos
                  </a>
                </div>
              </div>
            </section>

            <section className="sec-card">
              <div className="sec-header">
                <div className="sec-icon"><i className="fas fa-lightbulb"></i></div>
                <h2 className="sec-title">Event Highlights</h2>
              </div>
              <div className="sec-body">
                <div className="highlights-grid">
                  <div className="highlight-item">
                    <div className="highlight-icon" style={{ background: 'var(--gold-pale)', color: 'var(--gold)' }}>
                      <i className="fas fa-users"></i>
                    </div>
                    <div className="highlight-content">
                      <h3 className="highlight-title">Expert Speakers</h3>
                      <p className="highlight-desc">Industry leaders sharing insights</p>
                    </div>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon" style={{ background: '#DCFCE7', color: '#166534' }}>
                      <i className="fas fa-handshake"></i>
                    </div>
                    <div className="highlight-content">
                      <h3 className="highlight-title">Networking</h3>
                      <p className="highlight-desc">Connect with peers and mentors</p>
                    </div>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                      <i className="fas fa-certificate"></i>
                    </div>
                    <div className="highlight-content">
                      <h3 className="highlight-title">Certificates</h3>
                      <p className="highlight-desc">Receive participation certificates</p>
                    </div>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                      <i className="fas fa-gift"></i>
                    </div>
                    <div className="highlight-content">
                      <h3 className="highlight-title">Goodies</h3>
                      <p className="highlight-desc">Event merchandise and materials</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="sec-card">
              <div className="sec-header">
                <div className="sec-icon"><i className="fas fa-comment-dots"></i></div>
                <h2 className="sec-title">What Attendees Say</h2>
                <div className="sec-rating-pill">
                  <i className="fas fa-star"></i> {feedbackSummary || '4.7 · Based on default reviews'}
                </div>
              </div>
              <div className="sec-body">
                {feedbackSummary && reviews.length > 0 && (
                  <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--fill)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--navy)' }}>Feedback Summary:</strong>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-mid)' }}>{feedbackSummary}</p>
                  </div>
                )}
                <div className="review-list">
                  {displayReviews.map((review: any) => (
                    <div key={review.id} className="review-card">
                      <div className="review-card-top">
                        <div className="reviewer-avatar" style={{background: review.color || deptColor}}>
                          {review.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'AN'}
                        </div>
                        <div className="reviewer-info">
                          <span className="reviewer-name">{review.name || 'Anonymous'}</span>
                          <span className="reviewer-dept">{review.department || getDepartmentName(event.department)}</span>
                        </div>
                        <div className="review-stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <i key={star} className={star <= review.rating ? 'fas fa-star' : 'far fa-star'}></i>
                          ))}
                        </div>
                      </div>
                      <p className="review-text">{review.text || review.suggestions || 'No review text provided'}</p>
                      <span className="review-date">{review.date || new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="sec-card">
              <div className="sec-header">
                <div className="sec-icon"><i className="fas fa-calendar-alt"></i></div>
                <h2 className="sec-title">Similar Events</h2>
              </div>
              <div className="sec-body">
                {similarEvents.length > 0 ? (
                  <div className="similar-events-grid">
                    {similarEvents.map((similarEvent: any) => (
                      <div
                        key={similarEvent.id}
                        className="similar-event-card"
                        onClick={() => router.push(`/bento?id=${similarEvent.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="similar-event-poster" style={{ background: getDeptColor(similarEvent.department) }}>
                          <i className={`fas ${DEPT_ICONS[similarEvent.department as keyof typeof DEPT_ICONS] || 'fa-calendar'}`}></i>
                        </div>
                        <div className="similar-event-info">
                          <h3 className="similar-event-title">{similarEvent.name}</h3>
                          <p className="similar-event-meta">
                            <i className="fas fa-calendar-day"></i> {formatDate(similarEvent.date)}
                          </p>
                          <p className="similar-event-meta">
                            <i className="fas fa-building"></i> {getDepartmentName(similarEvent.department)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-soft)' }}>
                    <i className="fas fa-calendar-times" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                    <p>No similar events found.</p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="details-sidebar">
            <div className="sb-card sb-card--reg">
              <div className="sb-card-header">
                <i className="fas fa-ticket-alt"></i>
                Registration
              </div>
              <div className="sb-seats-wrap">
                <div className="sb-seats-top">
                  <div className="sb-seats-big">
                    <span className="seats-num">{seatsFilled}</span>
                    <span className="seats-unit">/ {event.capacity}</span>
                  </div>
                </div>
                <div className="sb-progress-track">
                  <div className="sb-progress-fill" style={{ width: `${seatsPct}%` }}></div>
                </div>
                <div className="sb-seats-sub">{event.capacity - seatsFilled} seats remaining</div>
              </div>
              <div className="sb-status-wrap">
                <span className={`sb-status ${timeline === 'future' ? 'open' : timeline === 'present' ? 'open' : 'closed'}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="sb-deadline">
                <i className="fas fa-clock"></i>
                <div className="sb-deadline-inner">
                  <span className="sb-deadline-date">{formatDate(event.date)}</span>
                  <span className="sb-deadline-rem">Registration closes soon</span>
                </div>
              </div>
              <div className="sb-meta-grid">
                <div className="sb-meta-item">
                  <span className="sb-meta-key">Department</span>
                  <span className="sb-meta-val">{getDepartmentName(event.department)}</span>
                </div>
                <div className="sb-meta-item">
                  <span className="sb-meta-key">Mode</span>
                  <span className="sb-meta-val">Hybrid</span>
                </div>
                <div className="sb-meta-item span2">
                  <span className="sb-meta-key">Fee</span>
                  <span className="sb-meta-val">Free</span>
                </div>
              </div>
              <button className="btn-register">
                <i className="fas fa-user-plus"></i> Register Now
              </button>
              <button className="btn-wishlist">
                <i className="far fa-heart"></i> Add to Wishlist
              </button>
            </div>

            <div className="sb-card">
              <div className="sb-venue-block">
                <div className="sb-venue-name">{event.location}</div>
                <div className="sb-venue-sub">Main Campus Building</div>
              </div>
              <div className="sb-times">
                <div className="sb-time-row">
                  <span className="sb-time-key">Start</span>
                  <span className="sb-time-val">{formatTime(event.time)}</span>
                </div>
                <div className="sb-time-row">
                  <span className="sb-time-key">End</span>
                  <span className="sb-time-val">04:00 PM</span>
                </div>
              </div>
            </div>

            <div className="sb-share">
              <span className="sb-share-lbl">Share Event</span>
              <div className="sb-share-btns">
                <button className="share-btn"><i className="fab fa-twitter"></i></button>
                <button className="share-btn"><i className="fab fa-facebook"></i></button>
                <button className="share-btn"><i className="fab fa-linkedin"></i></button>
                <button className="share-btn"><i className="fas fa-link"></i></button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {lightboxOpen && (
        <div className="lightbox open">
          <button className="lightbox-close" onClick={closeLightbox}>
            <i className="fas fa-times"></i>
          </button>
          <button className="lightbox-nav lightbox-prev" onClick={prevLightbox}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="lightbox-nav lightbox-next" onClick={nextLightbox}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <div className="lightbox-content">
            <img src={galleryImages[lightboxIndex].src} alt={galleryImages[lightboxIndex].alt} />
            <div className="lightbox-caption">{galleryImages[lightboxIndex].alt}</div>
          </div>
        </div>
      )}
    </div>
  );
}
