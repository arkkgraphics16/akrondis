import React, { useState, useEffect, useRef } from 'react';
import './NewGoalPage.css';
import { msLeft } from '../../utils/timeUtils';   // ← new helper
import { addGoal } from '../../utils/firestoreService';
import { Spinner } from '../../components/Spinner/Spinner';
import { useToast } from '../../components/Toast/ToastContext';
import { useAuth } from '../../components/Auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const DRAFT_KEY = 'akrondis:newGoalDraft';

export function NewGoalPage() {
  const addToast = useToast();
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [discordName, setName] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [type, setType] = useState('One-Time');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dtRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const { discordName, content, deadline, type } = JSON.parse(saved);
        setName(discordName || '');
        setContent(content || '');
        setDeadline(deadline || '');
        setType(type || 'One-Time');
      } catch {}
    }
  }, []);

  useEffect(() => {
    const draft = { discordName, content, deadline, type };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [discordName, content, deadline, type]);

  const validate = () => {
    if (!user) return 'Please sign in with Google first';
    if (!content.trim()) return 'Goal content required';
    if (!deadline) return 'Deadline required';
    const ms = new Date(deadline) - Date.now();            
    if (ms <= 0) return "Deadline can't be in the past";
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);

    setError('');
    setLoading(true);
    try {
      // Store the raw local ISO string
      await addGoal({
        ownerUid: user.uid,
        ownerDisplayName: user.displayName || user.email || 'NoName',
        discordNick: user.discordNick || discordName || '',
        content,
        utcDeadline: deadline,     // ← local ISO string
        status: 'Doing It',
        type
      });
      localStorage.removeItem(DRAFT_KEY);
      setContent(''); setDeadline(''); setName('');
      addToast('Goal added successfully!');
      navigate('/lists');
    } catch (e) {
      console.error(e);
      setError('Save failed, try again');
    }
    setLoading(false);
  };

  const handleCalendarClick = () => {
    if (dtRef.current) {
      dtRef.current.showPicker?.();
    }
  };

  // ... rest unchanged ...
  return (
    <main className="page new-goal-page">
      <h1>Create New Goal</h1>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={loading}>
          <label>Discord Nick (optional)
            <input value={discordName} onChange={e => setName(e.target.value)} placeholder="optional: arkk" />
          </label>

          <label>Goal Content *
            <textarea value={content} onChange={e => setContent(e.target.value)} required />
          </label>

          <label>
            Deadline *
            <div className="deadline-instruction">Pick a date & time</div>
            <div className="datetime-wrap">
              <input 
                ref={dtRef}
                type="datetime-local" 
                value={deadline} 
                onChange={e => setDeadline(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="calendar-btn" 
                onClick={handleCalendarClick}
                aria-label="Open date picker"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <circle cx="8" cy="14" r="1"></circle>
                  <circle cx="12" cy="14" r="1"></circle>
                  <circle cx="16" cy="14" r="1"></circle>
                  <circle cx="8" cy="18" r="1"></circle>
                  <circle cx="12" cy="18" r="1"></circle>
                </svg>
              </button>
            </div>
          </label>

          <label>Type
            <select value={type} onChange={e => setType(e.target.value)}>
              <option>One-Time</option>
              <option>Daily</option>
              <option>Weekly</option>
            </select>
          </label>
        </fieldset>

        {error && <p className="error">{error}</p>}
        <button type="submit">{loading ? <Spinner /> : 'Save Goal'}</button>
      </form>
    </main>
  );
}