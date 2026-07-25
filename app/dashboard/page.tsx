'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';

const DEPT_ICONS = {'computer-science':'fa-laptop-code','mathematics':'fa-square-root-alt','physics':'fa-atom','chemistry':'fa-flask','biology':'fa-dna','english':'fa-book-open','history':'fa-landmark'};
const DEPT_COLORS = {'computer-science':'#6366f1','mathematics':'#8b5cf6','physics':'#ec4899','chemistry':'#f59e0b','biology':'#10b981','english':'#3b82f6','history':'#ef4444'};
const TIMELINE_LABELS = { all: 'Timeline', future: 'Upcoming', present: 'Today', past: 'Past' } as const;

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

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
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

export default function Dashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedTimeline, setSelectedTimeline] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('grid');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
          setFilteredEvents(data);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
    };

    fetchEvents();
    fetchUserRole();
  }, []);

  const handleEventClick = (eventId: string) => {
    router.push(`/bento?id=${eventId}`);
  };

  useEffect(() => {
    let filtered = [...events];

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(e => e.department === selectedDepartment);
    }

    if (selectedTimeline !== 'all') {
      filtered = filtered.filter(e => getEventTimeline(e.date) === selectedTimeline);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
      );
    }

    setFilteredEvents(filtered);
  }, [selectedDepartment, selectedTimeline, searchQuery, events]);

  const activeFilterCount = Number(selectedDepartment !== 'all') + Number(selectedTimeline !== 'all') + Number(Boolean(searchQuery.trim()));

  const renderGridView = () => {
    return (
      <div className="events-grid">
        {filteredEvents.map((event: any, index: number) => {
          const timeline = getEventTimeline(event.date);

          return (
            <div
              key={event.id}
              className="event-card"
              onClick={() => handleEventClick(event.id)}
              style={{cursor:'pointer', animationDelay: `${index * 0.05}s`}}
            >
              <div className="card-img-wrap">
                <img src={event.poster} alt={event.name} className="card-real-img" />
                <div className="card-img-grad"></div>
                <span className={`card-badge ${timeline}`}>
                  {timeline === 'future' ? 'Upcoming' : timeline === 'present' ? 'Today' : 'Past'}
                </span>
              </div>
              <div className="card-body">
                <div className="card-dept-badge" style={{background: getDeptColor(event.department)}}>
                  <i className={`fas ${DEPT_ICONS[event.department as keyof typeof DEPT_ICONS] || 'fa-calendar'}`}></i>
                  {getDepartmentName(event.department)}
                </div>
                <h3 className="card-title">{event.name}</h3>
                <p className="card-desc">{event.description}</p>
                <div className="card-meta">
                  <span className="card-date"><i className="far fa-calendar"></i>{formatDate(event.date)}</span>
                  <span className="card-time"><i className="far fa-clock"></i>{formatTime(event.time)}</span>
                  <span className="card-location"><i className="fas fa-map-marker-alt"></i>{event.location}</span>
                  <span className="card-capacity"><i className="fas fa-users" style={{fontSize:'10px'}}></i>{event.capacity || '—'} seats</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="events-list">
        {filteredEvents.map((event: any) => {
          const timeline = getEventTimeline(event.date);

          return (
            <div
              key={event.id}
              className="event-list-item"
              onClick={() => handleEventClick(event.id)}
              style={{cursor:'pointer'}}
            >
              <div className="list-item-img">
                <img src={event.poster} alt={event.name} />
              </div>
              <div className="list-item-content">
                <div className="list-item-header">
                  <span className={`list-badge ${timeline}`}>
                    {timeline === 'future' ? 'Upcoming' : timeline === 'present' ? 'Today' : 'Past'}
                  </span>
                  <span className="list-dept" style={{color: getDeptColor(event.department)}}>
                    <i className={`fas ${DEPT_ICONS[event.department as keyof typeof DEPT_ICONS] || 'fa-calendar'}`}></i>
                    {getDepartmentName(event.department)}
                  </span>
                </div>
                <h3 className="list-title">{event.name}</h3>
                <p className="list-desc">{event.description}</p>
                <div className="list-meta">
                  <span><i className="far fa-calendar"></i>{formatDate(event.date)}</span>
                  <span><i className="far fa-clock"></i>{formatTime(event.time)}</span>
                  <span><i className="fas fa-map-marker-alt"></i>{event.location}</span>
                  <span><i className="fas fa-users"></i>{event.capacity || '—'} seats</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendarView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="big-cal-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      const dayEvents = filteredEvents.filter(e => e.date === dateStr);

      days.push(
        <div
          key={day}
          className={`big-cal-day ${isToday ? 'is-today' : ''} ${dayEvents.length ? 'has-event' : ''}`}
          onClick={() => dayEvents.length > 0 && handleEventClick(dayEvents[0].id)}
          style={{cursor: dayEvents.length ? 'pointer' : 'default'}}
        >
          <div className="big-cal-day-num">{day}</div>
          {dayEvents.length > 0 && (
            <div className="big-cal-dots">
              {dayEvents.slice(0, 4).map(e => (
                <div
                  key={e.id}
                  className="cal-dot"
                  style={{background: getDeptColor(e.department)}}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    return (
      <div className="calendar-section active">
        <div className="big-calendar-wrap">
          <div className="big-cal-header">
            <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="big-cal-month">{monthNames[month]} {year}</div>
            <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
          <div className="big-cal-body">
            <div className="big-cal-day-headers">
              {dayNames.map(d => <div key={d} className="big-cal-day-header-cell">{d}</div>)}
            </div>
            <div className="big-cal-grid">
              {days}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const deptCounts = events.reduce((acc: any, e: any) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextEvent = [...events]
    .filter(e => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div className="dashboard-page">
      <div className="hero-section">
        <div className="hero-mesh"></div>
        <div className="hero-dots"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-tag">
              <span className="hero-tag-dot"></span>
              Academic Year 2025–26
            </div>
            <h1 className="hero-heading">
              Campus Events <em>Portal</em>
            </h1>
            <p className="hero-sub">
              Discover workshops, seminars, symposiums, and more — all your department events in one place.
            </p>
            <div className="hero-cta-row">
              {userRole && ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'].includes(userRole) && (
                <a href="/register-event" className="hero-cta hero-cta-primary">
                  <i className="fas fa-plus"></i> Register Event
                </a>
              )}
              <a href="/suggest-idea" className="hero-cta hero-cta-secondary">
                <i className="fas fa-lightbulb"></i> Get Suggestions
              </a>
            </div>
            <div className="hero-stats-inline">
              <div className="hero-stat-inline">
                <div className="hero-stat-inline-num">{events.length}</div>
                <div className="hero-stat-inline-label">Total Events</div>
              </div>
              <div className="hero-stat-inline-sep"></div>
              <div className="hero-stat-inline">
                <div className="hero-stat-inline-num gold">{Object.keys(DEPT_COLORS).length}</div>
                <div className="hero-stat-inline-label">Departments</div>
              </div>
              <div className="hero-stat-inline-sep"></div>
              <div className="hero-stat-inline">
                <div className="hero-stat-inline-num">1</div>
                <div className="hero-stat-inline-label">Campus</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-illustration">
              <svg className="hero-illus-svg" viewBox="0 0 480 290" xmlns="http://www.w3.org/2000/svg" fill="none">
                <ellipse cx="240" cy="260" rx="220" ry="60" fill="rgba(200,146,10,0.06)"/>
                <ellipse cx="240" cy="270" rx="160" ry="35" fill="rgba(99,102,241,0.07)"/>
                <line x1="20" y1="255" x2="460" y2="255" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                <rect x="160" y="155" width="160" height="100" rx="3" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
                <rect x="172" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <rect x="192" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <rect x="212" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <rect x="232" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <rect x="252" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <rect x="272" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <rect x="292" y="165" width="8" height="90" fill="rgba(255,255,255,0.06)"/>
                <polygon points="150,155 240,105 330,155" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
                <ellipse cx="240" cy="105" rx="28" ry="16" fill="rgba(200,146,10,0.2)" stroke="rgba(200,146,10,0.4)" strokeWidth="1.5"/>
                <ellipse cx="240" cy="100" rx="18" ry="10" fill="rgba(200,146,10,0.3)" stroke="rgba(200,146,10,0.5)" strokeWidth="1"/>
                <rect x="236" y="88" width="8" height="12" rx="2" fill="rgba(200,146,10,0.5)"/>
                <line x1="240" y1="82" x2="240" y2="76" stroke="rgba(200,146,10,0.7)" strokeWidth="1.5"/>
                <circle cx="240" cy="74" r="3" fill="var(--gold)" opacity="0.9">
                  <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>
                </circle>
                <rect x="222" y="215" width="36" height="40" rx="18" fill="rgba(200,146,10,0.15)" stroke="rgba(200,146,10,0.3)" strokeWidth="1"/>
                <rect x="210" y="250" width="60" height="5" rx="1" fill="rgba(255,255,255,0.07)"/>
                <rect x="205" y="253" width="70" height="4" rx="1" fill="rgba(255,255,255,0.05)"/>
                <rect x="60" y="190" width="95" height="65" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
                <rect x="70" y="200" width="14" height="14" rx="2" fill="rgba(200,146,10,0.15)" stroke="rgba(200,146,10,0.2)" strokeWidth="1"/>
                <rect x="92" y="200" width="14" height="14" rx="2" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.25)" strokeWidth="1"/>
                <rect x="114" y="200" width="14" height="14" rx="2" fill="rgba(200,146,10,0.15)" stroke="rgba(200,146,10,0.2)" strokeWidth="1"/>
                <rect x="70" y="222" width="14" height="14" rx="2" fill="rgba(255,255,255,0.06)"/>
                <rect x="92" y="222" width="14" height="14" rx="2" fill="rgba(200,146,10,0.1)"/>
                <rect x="114" y="222" width="14" height="14" rx="2" fill="rgba(255,255,255,0.06)"/>
                <rect x="55" y="186" width="105" height="6" rx="1" fill="rgba(255,255,255,0.09)"/>
                <rect x="82" y="170" width="8" height="18" rx="1" fill="rgba(255,255,255,0.07)"/>
                <rect x="104" y="175" width="6" height="13" rx="1" fill="rgba(255,255,255,0.05)"/>
                <rect x="325" y="185" width="95" height="70" rx="2" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
                <rect x="335" y="195" width="14" height="14" rx="2" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.25)" strokeWidth="1"/>
                <rect x="357" y="195" width="14" height="14" rx="2" fill="rgba(200,146,10,0.15)"/>
                <rect x="379" y="195" width="14" height="14" rx="2" fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.25)" strokeWidth="1"/>
                <rect x="401" y="195" width="14" height="14" rx="2" fill="rgba(255,255,255,0.06)"/>
                <rect x="335" y="217" width="14" height="14" rx="2" fill="rgba(255,255,255,0.06)"/>
                <rect x="357" y="217" width="14" height="14" rx="2" fill="rgba(200,146,10,0.1)"/>
                <rect x="379" y="217" width="14" height="14" rx="2" fill="rgba(255,255,255,0.06)"/>
                <rect x="320" y="181" width="105" height="6" rx="1" fill="rgba(255,255,255,0.09)"/>
                <rect x="395" y="155" width="18" height="32" rx="2" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                <circle cx="404" cy="168" r="6" fill="none" stroke="rgba(200,146,10,0.5)" strokeWidth="1.5"/>
                <line x1="404" y1="168" x2="404" y2="163" stroke="rgba(200,146,10,0.8)" strokeWidth="1">
                  <animateTransform attributeName="transform" type="rotate" from="0 404 168" to="360 404 168" dur="10s" repeatCount="indefinite"/>
                </line>
                <line x1="404" y1="168" x2="408" y2="168" stroke="rgba(200,146,10,0.6)" strokeWidth="1">
                  <animateTransform attributeName="transform" type="rotate" from="0 404 168" to="360 404 168" dur="120s" repeatCount="indefinite"/>
                </line>
                <rect x="36" y="225" width="6" height="30" rx="2" fill="rgba(255,255,255,0.1)"/>
                <ellipse cx="39" cy="218" rx="16" ry="20" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.15)" strokeWidth="1"/>
                <rect x="128" y="228" width="5" height="27" rx="2" fill="rgba(255,255,255,0.08)"/>
                <ellipse cx="130" cy="220" rx="13" ry="16" fill="rgba(16,185,129,0.15)"/>
                <rect x="436" y="222" width="6" height="33" rx="2" fill="rgba(255,255,255,0.1)"/>
                <ellipse cx="439" cy="214" rx="16" ry="20" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.15)" strokeWidth="1"/>
                <rect x="308" y="228" width="5" height="27" rx="2" fill="rgba(255,255,255,0.08)"/>
                <ellipse cx="311" cy="220" rx="12" ry="15" fill="rgba(16,185,129,0.15)"/>
                <path d="M200 255 Q240 250 280 255" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round"/>
                <circle cx="50" cy="40" r="1.5" fill="rgba(255,255,255,0.5)">
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="3s" repeatCount="indefinite"/>
                </circle>
                <circle cx="120" cy="25" r="1" fill="rgba(255,255,255,0.4)">
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" begin="0.5s"/>
                </circle>
                <circle cx="380" cy="30" r="1.5" fill="rgba(255,255,255,0.4)">
                  <animate attributeName="opacity" values="0.4;0.1;0.4" dur="4s" repeatCount="indefinite" begin="1s"/>
                </circle>
                <circle cx="450" cy="55" r="1" fill="rgba(255,255,255,0.35)">
                  <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2.8s" repeatCount="indefinite" begin="0.3s"/>
                </circle>
                <circle cx="310" cy="18" r="1" fill="rgba(200,146,10,0.6)">
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3.5s" repeatCount="indefinite" begin="0.8s"/>
                </circle>
                <circle cx="170" cy="35" r="1.5" fill="rgba(200,146,10,0.5)">
                  <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.2s" repeatCount="indefinite" begin="1.2s"/>
                </circle>
                <ellipse cx="240" cy="102" rx="35" ry="18" fill="rgba(200,146,10,0.08)">
                  <animate attributeName="rx" values="35;40;35" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite"/>
                </ellipse>
              </svg>
              <div className="hi-badge hi-badge-1">
                <div className="hi-badge-icon" style={{background:'rgba(200,146,10,.25)', color:'var(--gold-light)'}}>
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="hi-badge-text-wrap">
                  <div className="hi-badge-title">{events.length || 11} Events This Year</div>
                  <div className="hi-badge-sub">{Object.keys(DEPT_COLORS).length} departments · all levels</div>
                </div>
              </div>
              <div className="hi-badge hi-badge-2">
                <div className="hi-badge-icon" style={{background:'rgba(16,185,129,.25)', color:'#34d399'}}>
                  <i className="fas fa-users"></i>
                </div>
                <div className="hi-badge-text-wrap">
                  <div className="hi-badge-title">Open Registrations</div>
                  <div className="hi-badge-sub">Seats filling fast</div>
                </div>
              </div>
              <div className="hi-badge hi-badge-3">
                <div className="hi-badge-icon" style={{background:'rgba(99,102,241,.25)', color:'#818cf8'}}>
                  <i className="fas fa-trophy"></i>
                </div>
                <div className="hi-badge-text-wrap">
                  <div className="hi-badge-title">{nextEvent ? nextEvent.name : 'No Upcoming Events'}</div>
                  <div className="hi-badge-sub">{nextEvent ? formatShortDate(nextEvent.date) : 'Check back soon'}</div>
                </div>
              </div>
              <div className="hi-dot" style={{width:'6px', height:'6px', top:'12%', left:'48%', background:'var(--gold)', animationDuration:'3s', animationDelay:'0s'}}></div>
              <div className="hi-dot" style={{width:'4px', height:'4px', top:'25%', left:'72%', background:'#818cf8', animationDuration:'4s', animationDelay:'.7s'}}></div>
              <div className="hi-dot" style={{width:'5px', height:'5px', top:'65%', left:'55%', background:'#34d399', animationDuration:'3.5s', animationDelay:'1.2s'}}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-inner">
          <div className="search-wrap">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search events by title, description, or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="view-toggles">
            <button
              className={`vt-btn ${currentView === 'grid' ? 'active' : ''}`}
              onClick={() => setCurrentView('grid')}
              title="Grid View"
            >
              <i className="fas fa-th-large"></i>
            </button>
            <button
              className={`vt-btn ${currentView === 'list' ? 'active' : ''}`}
              onClick={() => setCurrentView('list')}
              title="List View"
            >
              <i className="fas fa-list"></i>
            </button>
            <button
              className={`vt-btn ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => setCurrentView('calendar')}
              title="Calendar View"
            >
              <i className="fas fa-calendar-alt"></i>
            </button>
          </div>
          <button className="export-pill"><i className="fas fa-download"></i>Export</button>
        </div>

        <div className="unstop-filter-row">
          <button className={`uf-pill uf-pill-filters ${activeFilterCount ? 'has-filters' : ''}`}>
            <i className="fas fa-filter"></i>
            Filters
            <span className="uf-badge">{activeFilterCount}</span>
          </button>
          <div className="uf-divider"></div>
          <div className="uf-pill-dropdown-wrap">
            <button className={`uf-pill uf-pill-dropdown ${selectedDepartment !== 'all' ? 'applied' : ''}`}>
              <i className="fas fa-chevron-down uf-chevron"></i>
              <span>{selectedDepartment === 'all' ? 'Department' : getDepartmentName(selectedDepartment)}</span>
            </button>
            <select
              className="uf-dropdown-select"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              <option value="computer-science">Computer Science</option>
              <option value="mathematics">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="english">English</option>
              <option value="history">History</option>
            </select>
          </div>
          <div className="uf-divider"></div>
          <div className="uf-pill-dropdown-wrap">
            <button className={`uf-pill uf-pill-dropdown ${selectedTimeline !== 'all' ? 'applied' : ''}`}>
              <i className="fas fa-chevron-down uf-chevron"></i>
              <span>{TIMELINE_LABELS[selectedTimeline as keyof typeof TIMELINE_LABELS] || 'Timeline'}</span>
            </button>
            <select
              className="uf-dropdown-select"
              value={selectedTimeline}
              onChange={(e) => setSelectedTimeline(e.target.value)}
              aria-label="Filter by timeline"
            >
              <option value="all">All Time</option>
              <option value="future">Upcoming</option>
              <option value="present">Today</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>
      </div>

      <div className="results-bar">
        <span className="results-count">
          <strong>{isLoading ? 'Loading…' : filteredEvents.length}</strong> {isLoading ? 'events' : 'events found'}
        </span>
      </div>

      <div className="page-body">
        <div className="content-layout">
          <div className="events-column">
            {currentView === 'grid' && renderGridView()}
            {currentView === 'list' && renderListView()}
            {currentView === 'calendar' && renderCalendarView()}

            {filteredEvents.length === 0 && currentView !== 'calendar' && !isLoading && (
              <div className="empty-state visible">
                <div className="empty-icon"><i className="fas fa-calendar-times"></i></div>
                <h3 style={{fontSize:'18px',color:'var(--text-mid)',fontWeight:'700'}}>No events found</h3>
                <p style={{fontSize:'14px',color:'var(--text-soft)'}}>Try adjusting your filters or search.</p>
                {userRole && ['FACULTY', 'COORDINATOR', 'ADMIN', 'HOD', 'DEAN'].includes(userRole) && (
                  <a href="/register-event" className="nav-action-btn nav-btn-gold" style={{marginTop:'8px',textDecoration:'none'}}>
                    <i className="fas fa-plus"></i> Register Event
                  </a>
                )}
                <a href="/suggest-idea" className="nav-action-btn nav-btn-gold" style={{marginTop:'8px',marginLeft:'8px',textDecoration:'none'}}>
                  <i className="fas fa-lightbulb"></i> Get Suggestions
                </a>
              </div>
            )}
          </div>

          {currentView !== 'calendar' && (
            <aside className="calendar-column">
              <div className="cal-panel-card">
                <div className="cal-panel-header">
                  <div className="cal-month-title">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div className="cal-grid-container">
                  <div className="cal-day-headers">
                    {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="cal-day-header-cell">{d}</div>)}
                  </div>
                  <div className="cal-days-grid">
                    {(() => {
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const calDays = [];
                      for (let i = 0; i < firstDay; i++) {
                        calDays.push(<div key={`empty-${i}`} className="cal-day-cell empty"></div>);
                      }

                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(year, month, day);
                        const dateStr = date.toISOString().split('T')[0];
                        const isToday = date.getTime() === today.getTime();
                        const dayEvents = filteredEvents.filter(e => e.date === dateStr);

                        calDays.push(
                          <div
                            key={day}
                            className={`cal-day-cell ${isToday ? 'is-today' : ''}`}
                          >
                            <span className="cal-day-number">{day}</span>
                            {dayEvents.length > 0 && (
                              <div className="cal-event-dots">
                                {dayEvents.slice(0, 3).map(e => (
                                  <div
                                    key={e.id}
                                    className={`cal-dot dot-${getEventTimeline(e.date)}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return calDays;
                    })()}
                  </div>
                </div>
              </div>

              <div className="quick-stats">
                <h4 className="quick-stats-title">Quick Stats</h4>
                {Object.entries(deptCounts).map(([dept, count]) => (
                  <div key={dept} className="quick-stat-item">
                    <div className="quick-stat-dot" style={{background: getDeptColor(dept)}}></div>
                    <span className="quick-stat-name">{getDepartmentName(dept)}</span>
                    <span className="quick-stat-count">{count as number}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}