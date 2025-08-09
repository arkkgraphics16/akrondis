// src/pages/NewGoalPage/NewGoalPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import './NewGoalPage.css';
import { toUTCDate, toISOStringUTC } from '../../utils/timeUtils';
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
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ discordName, content, deadline, type }));
  }, [discordName, content, deadline, type]);

  const validate = () => {
    if (!user) return 'Please sign in with Google first';
    if (!content.trim()) return 'Goal content required';
    if (!deadline) return 'Deadline required';
    const utc = toUTCDate(deadline);
    if (utc <= new Date()) return 'Deadline can’t be in the past';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);

    setError('');
    setLoading(true);
    try {
      // our firestoreService will convert the ISO string to Timestamp
      await addGoal({
        ownerUid: user.uid,
        ownerDisplayName: user.displayName || user.email || 'NoName',
        discordNick: user.discordNick || discordName || '',
        content,
        utcDeadline: toISOStringUTC(toUTCDate(deadline)),
        status: 'Doing It',
        type
      });
      localStorage.removeItem(DRAFT_KEY);
      setContent('');
      setDeadline('');
      setName('');
      addToast('Goal added successfully!');
      navigate('/lists');
    } catch (e) {
      console.error(e);
      setError('Save failed, try again');
    }
    setLoading(false);
  };

  const openDatePicker = () => {
    const el = dtRef.current;
    if (!el) return;
    // preferred modern API
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.focus();
    }
  };

  if (!user) {
    return (
      <main className="page new-goal-page">
        <h1>Create New Goal</h1>
        <p>You must sign in with Google to create goals.</p>
        <button onClick={() => signInWithGoogle()}>Sign in with Google</button>
      </main>
    );
  }

  return (
    <main className="page new-goal-page">
      <h1>Create New Goal</h1>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={loading}>
          <label>
            Discord Nick (optional)
            <input value={discordName} onChange={e => setName(e.target.value)} placeholder="optional: arkk" />
          </label>

          <label>
            Goal Content *
            <textarea value={content} onChange={e => setContent(e.target.value)} required />
          </label>

          <label className="deadline-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Deadline *</span>
              <small className="hint">click calendar to open picker</small>
            </div>

            <div className="datetime-wrap">
              <input
                ref={dtRef}
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                required
              />
              <button type="button" className="calendar-btn" onClick={openDatePicker} aria-label="open calendar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 11H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M11 11H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M15 11H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M16 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </label>

          <label>
            Type
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
