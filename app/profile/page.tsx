'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    skills: '',
    interests: '',
    linkedin: '',
    github: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            bio: data.bio || '',
            skills: data.skills?.join(', ') || '',
            interests: data.interests?.join(', ') || '',
            linkedin: data.linkedin || '',
            github: data.github || ''
          });
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
          interests: formData.interests.split(',').map(s => s.trim()).filter(s => s)
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setMessage({ text: 'Profile updated successfully!', error: false });
      } else {
        setMessage({ text: 'Failed to update profile', error: true });
      }
    } catch (error) {
      setMessage({ text: 'An error occurred', error: true });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#C8920A', marginBottom: '16px' }}></i>
          <p style={{ color: '#6B7280' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FC', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1A2744', marginBottom: '8px' }}>
            My Profile
          </h1>
          <p style={{ color: '#6B7280' }}>Manage your personal information and preferences</p>
        </div>

        {message && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: message.error ? '#FEE2E2' : '#DCFCE7',
            border: `1px solid ${message.error ? '#FCA5A5' : '#86EFAC'}`
          }}>
            <p style={{ margin: 0, color: message.error ? '#DC2626' : '#166534' }}>
              {message.text}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(15,27,51,0.08)' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                background: '#F8F9FC',
                color: '#6B7280'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              Skills (comma-separated)
            </label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g., JavaScript, Python, Design"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              Interests (comma-separated)
            </label>
            <input
              type="text"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              placeholder="e.g., Technology, Sports, Music"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              name="linkedin"
              value={formData.linkedin}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/yourprofile"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#1A2744', marginBottom: '8px' }}>
              GitHub Profile URL
            </label>
            <input
              type="url"
              name="github"
              value={formData.github}
              onChange={handleChange}
              placeholder="https://github.com/yourusername"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#C8920A',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '14px 24px',
                borderRadius: '8px',
                border: '1px solid #E8EAF0',
                background: '#FFFFFF',
                color: '#1A2744',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
