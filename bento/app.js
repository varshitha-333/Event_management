// =====================================================================
// app.js — Shared Event Data & Utilities
// Jain University Department Events Portal
// Used by: bento.html + bento.js
// =====================================================================

/* ─── EVENT DATA ─── */
const sampleEvents = [
  {
    id: '1',
    name: 'AI & Machine Learning Workshop',
    department: 'computer-science',
    date: '2024-12-20',
    time: '14:00',
    location: 'CS Lab 301',
    description: 'Learn the fundamentals of AI and Machine Learning with hands-on examples. Topics include neural networks, deep learning, and practical applications.',
    capacity: 50,
    organizer: 'Dr. Sarah Johnson',
    color: '#6366f1',
    poster: '/design/posters/event1.jpg',
    regCloseDate: '2024-12-18',
    tags: ['AI', 'Machine Learning', 'Workshop'],
  },
  {
    id: '2',
    name: 'Calculus Study Session',
    department: 'mathematics',
    date: '2024-12-25',
    time: '10:00',
    location: 'Math Building Room 205',
    description: 'Comprehensive review session covering derivatives, integrals, and applications. Bring your questions and study materials for this interactive session.',
    capacity: 30,
    organizer: 'Prof. Michael Chen',
    color: '#8b5cf6',
    poster: '/design/posters/event2.jpg',
    regCloseDate: '2024-12-23',
    tags: ['Calculus', 'Mathematics', 'Study'],
  },
  {
    id: '3',
    name: 'Quantum Physics Lecture',
    department: 'physics',
    date: '2024-12-18',
    time: '15:30',
    location: 'Physics Auditorium',
    description: 'Explore the fascinating world of quantum mechanics, wave-particle duality, and quantum computing. Guest speakers from leading research institutes will present.',
    capacity: 100,
    organizer: 'Dr. Emily Watson',
    color: '#ec4899',
    poster: '/design/posters/event3.jpg',
    regCloseDate: '2024-12-16',
    tags: ['Quantum Physics', 'Lecture', 'Research'],
  },
  {
    id: '4',
    name: 'Organic Chemistry Lab',
    department: 'chemistry',
    date: '2024-12-28',
    time: '13:00',
    location: 'Chemistry Lab B',
    description: 'Hands-on laboratory session focusing on organic synthesis and reaction mechanisms. Students will conduct practical experiments with guided supervision.',
    capacity: 25,
    organizer: 'Dr. Robert Lee',
    color: '#f59e0b',
    poster: '/design/posters/event4.jpg',
    regCloseDate: '2024-12-26',
    tags: ['Chemistry', 'Lab', 'Organic'],
  },
  {
    id: '5',
    name: 'Cell Biology Seminar',
    department: 'biology',
    date: '2024-12-22',
    time: '11:00',
    location: 'Biology Hall 102',
    description: 'Latest research in cellular processes, genetics, and biotechnology applications. Featuring cutting-edge discoveries in cell signaling and gene expression.',
    capacity: 40,
    organizer: 'Dr. Lisa Anderson',
    color: '#10b981',
    poster: '/design/posters/event5.jpg',
    regCloseDate: '2024-12-20',
    tags: ['Biology', 'Cell Biology', 'Seminar'],
  },
  {
    id: '6',
    name: 'Shakespeare Reading Group',
    department: 'english',
    date: '2025-01-05',
    time: '16:00',
    location: 'Library Reading Room',
    description: 'Discussion and analysis of Hamlet with focus on literary themes and character development. An interactive session for literature enthusiasts of all levels.',
    capacity: 20,
    organizer: 'Prof. James Wilson',
    color: '#3b82f6',
    poster: '/design/posters/event6.jpg',
    regCloseDate: '2025-01-03',
    tags: ['English', 'Shakespeare', 'Literature'],
  },
  {
    id: '7',
    name: 'World War II History Discussion',
    department: 'history',
    date: '2025-01-08',
    time: '14:30',
    location: 'History Department Room 401',
    description: 'Examining the causes, events, and aftermath of World War II with primary source analysis. Students will engage with historical documents and multimedia presentations.',
    capacity: 35,
    organizer: 'Dr. Patricia Brown',
    color: '#ef4444',
    poster: '/design/posters/event7.jpg',
    regCloseDate: '2025-01-06',
    tags: ['History', 'WWII', 'Discussion'],
  },
  {
    id: '8',
    name: 'Web Development Bootcamp',
    department: 'computer-science',
    date: '2025-01-10',
    time: '09:00',
    location: 'Computer Lab A',
    description: 'Intensive full-day workshop on HTML, CSS, JavaScript, and modern web frameworks. Build real projects and gain hands-on experience with the latest web technologies.',
    capacity: 30,
    organizer: 'Dr. Sarah Johnson',
    color: '#6366f1',
    poster: '/design/posters/event8.jpg',
    regCloseDate: '2025-01-08',
    tags: ['Web Dev', 'JavaScript', 'Bootcamp'],
  },
  {
    id: '9',
    name: 'Statistics & Data Analysis',
    department: 'mathematics',
    date: '2024-12-15',
    time: '10:30',
    location: 'Math Building Room 310',
    description: 'Applied statistics for research, including hypothesis testing and regression analysis. Practical exercises using real-world datasets and statistical software.',
    capacity: 45,
    organizer: 'Prof. Michael Chen',
    color: '#8b5cf6',
    poster: '/design/posters/event9.jpg',
    regCloseDate: '2024-12-13',
    tags: ['Statistics', 'Data Analysis', 'Research'],
  },
  {
    id: '10',
    name: 'Environmental Science Field Trip',
    department: 'biology',
    date: '2025-01-15',
    time: '08:00',
    location: 'Campus Parking Lot (Bus Departure)',
    description: 'Full-day field trip to study local ecosystems, biodiversity, and environmental conservation. Students will collect samples and document findings in field journals.',
    capacity: 30,
    organizer: 'Dr. Lisa Anderson',
    color: '#10b981',
    poster: '/design/posters/event10.jpg',
    regCloseDate: '2025-01-12',
    tags: ['Biology', 'Field Trip', 'Environment'],
  },
  {
    id: '11',
    name: 'Annual Tech Symposium 2026',
    department: 'computer-science',
    date: '2026-03-11',
    time: '10:00',
    location: 'Main Auditorium',
    description: 'Flagship annual tech event featuring student projects, industry talks and competitions. Network with professionals, showcase innovations, and compete for awards.',
    capacity: 200,
    organizer: 'Dr. Sarah Johnson',
    color: '#6366f1',
    poster: '/design/posters/event11.jpg',
    regCloseDate: '2026-03-07',
    tags: ['Technology', 'Symposium', 'Innovation'],
  },
];

/* ─── GLOBAL STATE (used by bento.js) ─── */
const state = {
  events:            [...sampleEvents],
  filteredEvents:    [...sampleEvents],
  selectedDepartment: 'all',
  selectedTimeline:  'all',
  searchQuery:       '',
  currentView:       'grid',
  currentMonth:      new Date(),
  editingEventId:    null,
  openDetailId:      null,
};

/* ─── CONSTANTS ─── */
const posterImages = [
  '/design/posters/event1.jpg',  '/design/posters/event2.jpg',  '/design/posters/event3.jpg',
  '/design/posters/event4.jpg',  '/design/posters/event5.jpg',  '/design/posters/event6.jpg',
  '/design/posters/event7.jpg',  '/design/posters/event8.jpg',  '/design/posters/event9.jpg',
  '/design/posters/event10.jpg', '/design/posters/event11.jpg',
];

const DEPT_ICONS = {
  'computer-science': 'fa-laptop-code',
  'mathematics':      'fa-square-root-alt',
  'physics':          'fa-atom',
  'chemistry':        'fa-flask',
  'biology':          'fa-dna',
  'english':          'fa-book-open',
  'history':          'fa-landmark',
};

/* ─── UTILITY FUNCTIONS ─── */

/**
 * Returns 'past', 'present', or 'future' for a given date string.
 */
function getEventTimeline(dateString) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ev    = new Date(dateString); ev.setHours(0, 0, 0, 0);
  if (ev < today) return 'past';
  if (ev.getTime() === today.getTime()) return 'present';
  return 'future';
}

/**
 * Returns a status object { label, tl } for an event.
 */
function getEventStatus(ev) {
  const tl = getEventTimeline(ev.date);
  const labels = { past: 'Past', present: 'Today', future: 'Upcoming' };
  return { label: labels[tl] || 'Upcoming', tl };
}

/**
 * Maps a department slug to a display name.
 */
function getDepartmentName(dept) {
  const names = {
    'computer-science': 'Computer Science',
    'mathematics':      'Mathematics',
    'physics':          'Physics',
    'chemistry':        'Chemistry',
    'biology':          'Biology',
    'english':          'English',
    'history':          'History',
  };
  return names[dept] || dept;
}

/**
 * Returns the brand colour for a department.
 */
function getDeptColor(dept) {
  const colors = {
    'computer-science': '#6366f1',
    'mathematics':      '#8b5cf6',
    'physics':          '#ec4899',
    'chemistry':        '#f59e0b',
    'biology':          '#10b981',
    'english':          '#3b82f6',
    'history':          '#ef4444',
  };
  return colors[dept] || '#6366f1';
}

/**
 * Short date format – e.g. "Fri, Dec 20, 2024"
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

/**
 * Long date format – e.g. "Friday, December 20, 2024"
 */
function formatDateLong(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/**
 * Converts "14:00" → "2:00 PM"
 */
function formatTime(timeString) {
  if (!timeString) return '—';
  const [hours, minutes] = timeString.split(':');
  const h    = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
}

/**
 * Returns the poster path for an event (fallback to cyclic posterImages array).
 */
function getEventPoster(ev) {
  if (ev.poster) return ev.poster;
  const idx = (parseInt(ev.id, 10) - 1) % posterImages.length;
  return posterImages[idx < 0 ? 0 : idx];
}
