'use client';

import { useState, useEffect } from 'react';

export default function Navigation() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const openSidebar = () => {
    setIsSidebarOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    document.body.style.overflow = '';
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = () => closeDropdown();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="hamburger-btn" onClick={openSidebar}>
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
          </div>
          <div className="nav-logo-badge">JU</div>
          <div className="nav-brand-text">
            <div className="nav-university-name">Jain University</div>
            <div className="nav-portal-name">Events Portal</div>
          </div>
          <div className="nav-spacer"></div>
          <a href="/register-event" className="nav-action-btn nav-btn-gold">
            <i className="fas fa-plus"></i> Add Event
          </a>
          <div className="profile-wrapper">
            <div className="profile-avatar-btn" onClick={toggleDropdown}>
              <span>JU</span>
              <div className="profile-online-dot"></div>
            </div>
            <div className={`profile-dropdown ${isDropdownOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-header">
                <div className="dropdown-header-name">Jain University</div>
                <div className="dropdown-header-role">Administrator</div>
                <div style={{fontSize:'10px',color:'var(--text-pale)',marginTop:'2px'}}></div>
              </div>
              <a href="#" className="dropdown-item"><i className="fas fa-user"></i>My Profile</a>
              <a href="#" className="dropdown-item"><i className="fas fa-cog"></i>Settings</a>
              <div className="dropdown-divider"></div>
              <a href="/login" className="dropdown-item" style={{color:'#ef4444'}}>
                <i className="fas fa-sign-out-alt" style={{color:'#ef4444'}}></i>Sign Out
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* SIDEBAR BACKDROP */}
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`} 
        onClick={closeSidebar}
      ></div>

      {/* SIDEBAR */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-group">
            <div className="sidebar-logo-badge">JU</div>
            <div style={{display:'flex',flexDirection:'column',gap:'1px'}}>
              <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:'14px',fontWeight:'800',color:'#fff'}}>Jain University</div>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,.5)',letterSpacing:'.6px',fontWeight:'500'}}>Events Portal</div>
            </div>
          </div>
          <div className="sidebar-close-btn" onClick={closeSidebar}>
            <i className="fas fa-times"></i>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="sidebar-section-label">MAIN</div>
          <a href="/dashboard" className="sidebar-nav-item active">
            <i className="fas fa-th-large"></i>
            <span>Dashboard</span>
          </a>
          <a href="/register-event" className="sidebar-nav-item">
            <i className="fas fa-calendar-plus"></i>
            <span>Create Event</span>
          </a>
          <a href="/manage-event" className="sidebar-nav-item">
            <i className="fas fa-images"></i>
            <span>Manage Events</span>
          </a>
          <a href="/suggest-idea" className="sidebar-nav-item">
            <i className="fas fa-lightbulb"></i>
            <span>Get Suggestions</span>
          </a>
          <div className="sidebar-section-label">DEPARTMENTS</div>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-laptop-code"></i>
            <span>Computer Science</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-square-root-alt"></i>
            <span>Mathematics</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-atom"></i>
            <span>Physics</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-flask"></i>
            <span>Chemistry</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-dna"></i>
            <span>Biology</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-book-open"></i>
            <span>English</span>
          </a>
          <a href="#" className="sidebar-nav-item">
            <i className="fas fa-landmark"></i>
            <span>History</span>
          </a>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">JU</div>
            <div style={{flex:1,minWidth:0}}>
              <div className="sidebar-user-name">Jain University</div>
              <div className="sidebar-user-role">Student</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
