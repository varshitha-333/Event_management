'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'student',
    department: 'computer-science',
    year: '',
    branch: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    setPasswordStrength(getPasswordStrength(password));
  };

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: `${formData.firstName} ${formData.lastName}`,
          password: formData.password,
          role: formData.role.toUpperCase(),
          department: formData.department,
          year: formData.year ? parseInt(formData.year) : null,
          branch: formData.branch || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setStep(3);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthClass = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'weak';
    if (passwordStrength === 2) return 'fair';
    if (passwordStrength === 3) return 'good';
    return 'strong';
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

      {/* Brand Panel */}
      <div className="brand-panel">
        <div className="brand-deco-circle-1"></div>
        <div className="brand-deco-circle-2"></div>
        <div className="brand-dots"></div>
        
        <div className="brand-logo">
          <div className="brand-logo-badge">JGI</div>
          <div className="brand-logo-text">
            <div className="brand-logo-name">Jain University</div>
            <div className="brand-logo-sub">Student Portal</div>
          </div>
        </div>

        <div className="brand-main">
          <div className="brand-badge">
            <div className="brand-badge-dot"></div>
            <span className="brand-badge-text">Academic Year 2025–26</span>
          </div>
          <h1 className="brand-heading">
            Join the <span className="brand-heading-accent">Community</span>
          </h1>
          <p className="brand-sub">
            Create your account to access events, register for workshops, and stay connected with campus activities.
          </p>
        </div>

        <div className="brand-stats">
          <div className="brand-stat">
            <div className="brand-stat-icon"><i className="fas fa-users"></i></div>
            <div className="brand-stat-value">500+</div>
            <div className="brand-stat-label">Students</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon"><i className="fas fa-calendar"></i></div>
            <div className="brand-stat-value">11</div>
            <div className="brand-stat-label">Events</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon"><i className="fas fa-building"></i></div>
            <div className="brand-stat-value">7</div>
            <div className="brand-stat-label">Departments</div>
          </div>
        </div>
      </div>

      {/* Auth Area */}
      <div className="auth-area">
        {/* Mobile Logo */}
        <div className="mobile-logo">
          <div className="mobile-logo-badge">JGI</div>
          <div className="mobile-logo-name">Jain University</div>
        </div>

        {step === 1 && (
          <div className="auth-card panel">
            <div className="auth-card-accent"></div>
            <div className="card-badge">
              <i className="fas fa-user-plus"></i>
              <span>Step 1 of 2</span>
            </div>
            <h2 className="card-title">Create Account</h2>
            <p className="card-sub">Enter your personal information to get started</p>

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

            <div className="steps">
              <div className="step-dot active">1</div>
              <div className="step-label active">Personal Info</div>
              <div className="step-connector"></div>
              <div className="step-dot pending">2</div>
              <div className="step-label pending">Password</div>
            </div>

            <form onSubmit={handleSubmitStep1}>
              <div className="field-group">
                <label className="field-label">First Name <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-user field-icon"></i>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Last Name <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-user field-icon"></i>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Email Address <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-envelope field-icon"></i>
                  <input
                    type="email"
                    className="field-input"
                    placeholder="john.doe@jainuniversity.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Role <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-user-graduate field-icon"></i>
                  <select
                    className="field-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="staff">Staff</option>
                  </select>
                  <i className="fas fa-chevron-down chevron"></i>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Department <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-building field-icon"></i>
                  <select
                    className="field-select"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="computer-science">Computer Science</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="biology">Biology</option>
                    <option value="english">English</option>
                    <option value="history">History</option>
                  </select>
                  <i className="fas fa-chevron-down chevron"></i>
                </div>
              </div>

              {formData.role === 'student' && (
                <div className="field-group">
                  <label className="field-label">Year <span>*</span></label>
                  <div className="field-wrap">
                    <i className="fas fa-graduation-cap field-icon"></i>
                    <select
                      className="field-select"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                    <i className="fas fa-chevron-down chevron"></i>
                  </div>
                </div>
              )}

              {(formData.role === 'student' || formData.role === 'faculty') && (
                <div className="field-group">
                  <label className="field-label">Branch</label>
                  <div className="field-wrap">
                    <i className="fas fa-code-branch field-icon"></i>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="e.g. CSE, ECE, ME"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary">
                Continue
                <i className="fas fa-arrow-right"></i>
              </button>
            </form>

            <div className="page-footer">
              Already have an account? <a href="/login" className="auth-footer-link">Sign in</a>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="auth-card panel">
            <div className="auth-card-accent"></div>
            <div className="card-badge">
              <i className="fas fa-lock"></i>
              <span>Step 2 of 2</span>
            </div>
            <h2 className="card-title">Set Password</h2>
            <p className="card-sub">Create a secure password for your account</p>

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

            <div className="steps">
              <div className="step-dot done"><i className="fas fa-check"></i></div>
              <div className="step-label done">Personal Info</div>
              <div className="step-connector"></div>
              <div className="step-dot active">2</div>
              <div className="step-label active">Password</div>
            </div>

            {/* User Info Preview */}
            <div className="info-preview">
              <div className="info-avatar">
                {formData.firstName[0]}{formData.lastName[0]}
              </div>
              <div>
                <div className="info-name">{formData.firstName} {formData.lastName}</div>
                <div className="info-email">{formData.email}</div>
              </div>
              <button 
                className="info-edit-btn"
                onClick={() => setStep(1)}
              >
                <i className="fas fa-edit"></i>
                Edit
              </button>
            </div>

            <form onSubmit={handleSubmitStep2}>
              <div className="field-group">
                <label className="field-label">Password <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-lock field-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="field-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button
                    type="button"
                    className="pwd-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {formData.password && (
                  <div className="strength-bar-wrap">
                    <div className="strength-bars">
                      <div className={`strength-bar ${passwordStrength >= 1 ? getStrengthClass() : ''}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 2 ? getStrengthClass() : ''}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 3 ? getStrengthClass() : ''}`}></div>
                      <div className={`strength-bar ${passwordStrength >= 4 ? getStrengthClass() : ''}`}></div>
                    </div>
                    <span className={`strength-label ${getStrengthClass()}`}>{getStrengthLabel()}</span>
                  </div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Confirm Password <span>*</span></label>
                <div className="field-wrap">
                  <i className="fas fa-lock field-icon"></i>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="field-input"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="pwd-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <label className="checkbox-label">
                <div className={`checkbox-box ${formData.agreeTerms ? 'checked' : ''}`} onClick={() => setFormData({ ...formData, agreeTerms: !formData.agreeTerms })}>
                </div>
                <span>I agree to the Terms of Service and Privacy Policy</span>
              </label>

              <div className="btn-row">
                <button type="button" className="btn-back" onClick={() => setStep(1)} disabled={isLoading}>
                  <i className="fas fa-arrow-left"></i>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={!formData.agreeTerms || formData.password !== formData.confirmPassword || isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                  <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="success-card panel">
            <div className="success-icon-wrap">
              <i className="fas fa-check"></i>
            </div>
            <h2 className="success-title">Account Created!</h2>
            <p className="success-sub">Your account has been successfully created.</p>
            <p className="success-email-note">A confirmation email has been sent to {formData.email}</p>
            
            <div className="success-info-box">
              <div className="success-info-lbl">Account Details</div>
              <div className="success-info-name">{formData.firstName} {formData.lastName}</div>
              <div className="success-info-meta">{formData.email} · {formData.role}</div>
            </div>

            <button className="btn btn-primary" onClick={() => window.location.href = '/login'}>
              Go to Login
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
