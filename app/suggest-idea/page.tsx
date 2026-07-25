'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EventSuggestion {
  title: string;
  description: string;
  purpose: string;
  benefits: string;
  skillsDeveloped: {
    technical: string[];
    professional: string[];
    leadership: string[];
    communication: string[];
    innovation: string[];
  };
  suitableAudience: string;
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedBudget: string;
  duration: string;
  teamSize: string;
  resourcesRequired: string[];
  expectedOutcome: string;
  previousSuccess: string[];
  whyStudentsWillLikeIt: string;
  futureScope: string;
}

export default function SuggestIdeaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    theme: '',
    department: 'computer-science',
    guests: '',
    audience: '',
    tone: 'professional'
  });
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetSuggestions = async () => {
    if (!formData.theme) {
      alert('Please enter a theme first');
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/events/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: formData.theme,
          department: formData.department,
          guests: formData.guests,
          audience: formData.audience,
          tone: formData.tone
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        alert('Failed to get suggestions');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button 
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: 'var(--text-soft)', fontSize: '14px', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '48px' }}>💡</div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Event Ideas to Conduct</h1>
              <p style={{ color: 'var(--text-soft)', margin: '4px 0 0 0' }}>Get curated event suggestions based on your department and interests</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {/* Theme */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '8px' }}>
              Event Theme <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              placeholder="e.g. Artificial Intelligence, Sustainability, Innovation"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          {/* Department */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '8px' }}>
              Department <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="computer-science">Computer Science</option>
              <option value="mathematics">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="english">English</option>
              <option value="history">History</option>
            </select>
          </div>

          {/* Guests */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '8px' }}>
              Guest Speakers (Optional)
            </label>
            <input
              type="text"
              name="guests"
              value={formData.guests}
              onChange={handleChange}
              placeholder="e.g. Industry experts, professors, alumni"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          {/* Audience */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '8px' }}>
              Target Audience (Optional)
            </label>
            <input
              type="text"
              name="audience"
              value={formData.audience}
              onChange={handleChange}
              placeholder="e.g. Students, faculty, industry professionals"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          {/* Tone */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-mid)', marginBottom: '8px' }}>
              Event Tone
            </label>
            <select
              name="tone"
              value={formData.tone}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="professional">Professional & Knowledgeable</option>
              <option value="entertaining">Entertaining & Fun</option>
              <option value="educational">Educational & Academic</option>
              <option value="casual">Casual & Informal</option>
            </select>
          </div>

          {/* Get Suggestions Button */}
          <button
            type="button"
            onClick={handleGetSuggestions}
            disabled={isLoadingSuggestions}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'var(--gold)',
              color: 'var(--navy)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isLoadingSuggestions ? 'not-allowed' : 'pointer',
              opacity: isLoadingSuggestions ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <i className={`fas ${isLoadingSuggestions ? 'fa-spinner fa-spin' : 'fa-lightbulb'}`}></i>
            {isLoadingSuggestions ? 'Generating suggestions...' : 'Get Event Suggestions'}
          </button>

          {/* Suggestions Display */}
          {suggestions.length > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '24px',
              background: 'var(--gold-pale)',
              border: '1px solid var(--gold-bdr)',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <i className="fas fa-magic" style={{ color: 'var(--gold)', fontSize: '20px' }}></i>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)' }}>Suggested Events to Conduct</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      background: 'var(--white)',
                      borderRadius: '8px',
                      border: '1px solid var(--gold-bdr)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => router.push(`/register-event?theme=${encodeURIComponent(formData.theme)}&idea=${encodeURIComponent(suggestion.title)}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <i className="fas fa-calendar-check" style={{ color: 'var(--gold)' }}></i>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy)' }}>{suggestion.title}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '8px', lineHeight: '1.5' }}>{suggestion.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-soft)', marginBottom: '8px' }}>{suggestion.purpose}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--gold-pale)', borderRadius: '4px', color: 'var(--navy)', fontWeight: 600 }}>
                        {suggestion.difficultyLevel}
                      </span>
                      <span style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--surface2)', borderRadius: '4px', color: 'var(--text-mid)', fontWeight: 600 }}>
                        {suggestion.duration}
                      </span>
                      <span style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--surface2)', borderRadius: '4px', color: 'var(--text-mid)', fontWeight: 600 }}>
                        {suggestion.estimatedBudget}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>Click to create this event</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
