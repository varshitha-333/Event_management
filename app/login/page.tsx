'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Background Blobs */}
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>
      <div className="bg-grid"></div>

      {/* Left Branding Panel */}
      <div className="brand-panel">
        <div className="brand-deco-circle-1"></div>
        <div className="brand-deco-circle-2"></div>
        <div className="brand-dots"></div>

        <div className="brand-logo">
          <div className="brand-logo-badge">JU</div>
          <div className="brand-logo-text">
            <div className="brand-logo-name">Jain University</div>
            <div className="brand-logo-sub">Events Portal</div>
          </div>
        </div>

        <div className="brand-main">
          <div className="brand-badge">
            <div className="brand-badge-dot"></div>
            <span className="brand-badge-text">Academic Year 2025–26</span>
          </div>
          <h1 className="brand-heading">
            Welcome to <span className="brand-heading-accent">Campus Events</span>
          </h1>
          <p className="brand-sub">
            Discover workshops, seminars, symposiums, and more — all your department events in one place.
          </p>
          <div className="brand-features">
            <div className="brand-feature">
              <div className="brand-feature-dot"><i className="fas fa-check"></i></div>
              <span className="brand-feature-text">11 Events Across 7 Departments</span>
            </div>
            <div className="brand-feature">
              <div className="brand-feature-dot"><i className="fas fa-check"></i></div>
              <span className="brand-feature-text">Easy Registration Process</span>
            </div>
            <div className="brand-feature">
              <div className="brand-feature-dot"><i className="fas fa-check"></i></div>
              <span className="brand-feature-text">Real-time Event Updates</span>
            </div>
          </div>
        </div>

        <div className="brand-stats">
          <div className="brand-stat">
            <div className="brand-stat-icon"><i className="fas fa-calendar"></i></div>
            <div className="brand-stat-value">11</div>
            <div className="brand-stat-label">Total Events</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon"><i className="fas fa-users"></i></div>
            <div className="brand-stat-value">7</div>
            <div className="brand-stat-label">Departments</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon"><i className="fas fa-building"></i></div>
            <div className="brand-stat-value">1</div>
            <div className="brand-stat-label">Campus</div>
          </div>
        </div>
      </div>

      {/* Right Auth Area */}
      <div className="auth-area">
        {/* Mobile Logo */}
        <div className="mobile-logo">
          <div className="mobile-logo-badge">JU</div>
          <div className="mobile-logo-name">Jain University</div>
        </div>

        {/* Role Toggle */}
        <div className="role-toggle">
          <button
            className={`role-btn ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            <i className="fas fa-user-graduate"></i>
            Student
          </button>
          <button
            className={`role-btn ${role === 'staff' ? 'active' : ''}`}
            onClick={() => setRole('staff')}
          >
            <i className="fas fa-chalkboard-teacher"></i>
            Staff
          </button>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="auth-card-accent"></div>
          <div className="auth-card-header">
            <h2 className="auth-card-title">
              {role === 'student' ? 'Student Login' : 'Staff Login'}
            </h2>
            <p className="auth-card-sub">Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleLogin}>
            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="form-input-wrap">
                <i className="fas fa-envelope form-input-icon"></i>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your.email@jainuniversity.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-wrap">
                <i className="fas fa-lock form-input-icon"></i>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-text">Remember me for 7 days</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
              <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}></i>
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">
            <button className="social-btn google-btn">
              <i className="fab fa-google"></i>
              <span>Google</span>
            </button>
            <button className="social-btn microsoft-btn">
              <i className="fab fa-microsoft"></i>
              <span>Microsoft</span>
            </button>
          </div>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Don't have an account? <a href="/register" className="auth-footer-link">Register here</a>
            </p>
          </div>
        </div>
      </div>

      {/*
        Fix: input icon (envelope/lock) was overlapping the placeholder/typed text.
        This overrides .form-input-wrap / .form-input-icon / .form-input so the icon
        sits in a fixed left slot and the text starts with a proper gap after it,
        regardless of what's already defined in your global stylesheet.
      */}
      <style jsx>{`
        .form-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          font-size: 14px;
          pointer-events: none;
          z-index: 1;
        }

        .form-input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px 12px 44px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          background: #f9fafb;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          background: #fff;
        }
      `}</style>
    </div>
  );
}
