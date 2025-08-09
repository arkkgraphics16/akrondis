// src/pages/NewGoalPage/NewGoalPage.jsx
import React, { useState, useEffect } from 'react';
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

  const [discordName, setName]     = useState('');
  const [content, setContent]      = useState('');
  const [deadline, setDeadline]    = useState('');
  const [type, setType]            = useState('One-Time');
  const [error, setError]          = useState('');
  const [loading, setLoading]      = useState(false);

  // Load draft
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
      const utc = toISOStringUTC(toUTCDate(deadline));
      await addGoal({
        ownerUid: user.uid,
        ownerDisplayName: user.displayName || user.email || 'NoName',
        discordNick: user.discordNick || discordName || '',
        content,
        utcDeadline: utc,
        status: 'Doing It',
        type
      });
      localStorage.removeItem(DRAFT_KEY);
      setContent('');
      setDeadline('');
      setName('');
      addToast('Goal added successfully!');
      // navigate to lists
      navigate('/lists');
    } catch (e) {
      console.error(e);
      setError('Save failed, try again');
    }
    setLoading(false);
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

          <label>
            Deadline *
            <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} required />
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
