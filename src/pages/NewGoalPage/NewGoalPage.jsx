// src/pages/NewGoalPage/NewGoalPage.jsx
import React, { useState, useEffect } from 'react';
import './NewGoalPage.css';
import { toUTCDate, toISOStringUTC } from '../../utils/timeUtils';
import { addGoal } from '../../utils/firestoreService';
import { Spinner } from '../../components/Spinner/Spinner';
import { useToast } from '../../components/Toast/ToastContext';

const DRAFT_KEY = 'akrondis:newGoalDraft';

export function NewGoalPage() {
  const addToast = useToast();
  const [discordTag, setTag]       = useState('');
  const [discordName, setName]     = useState('');
  const [content, setContent]      = useState('');
  const [deadline, setDeadline]    = useState('');
  const [error, setError]          = useState('');
  const [loading, setLoading]      = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const { discordTag, discordName, content, deadline } = JSON.parse(saved);
        setTag(discordTag);
        setName(discordName);
        setContent(content);
        setDeadline(deadline);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const draft = { discordTag, discordName, content, deadline };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [discordTag, discordName, content, deadline]);

  const validate = () => {
    if (!/^[\w]{2,32}#[0-9]{4}$/.test(discordTag)) {
      return 'Tag must be like arkk#1234';
    }
    if (!content.trim()) {
      return 'Goal content required';
    }
    if (!deadline) {
      return 'Deadline required';
    }
    const utc = toUTCDate(deadline);
    if (utc <= new Date()) {
      return 'Deadline can’t be in the past';
    }
    return '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);

    setError('');
    setLoading(true);
    try {
      const utc = toISOStringUTC(toUTCDate(deadline));
      await addGoal({
        discordName,
        discordTag,
        content,
        utcDeadline: utc,
        status: 'Doing It',
      });
      localStorage.removeItem(DRAFT_KEY);
      setTag('');
      setName('');
      setContent('');
      setDeadline('');
      addToast('Goal added successfully!');
    } catch (e) {
      console.error(e);
      setError('Save failed, try again');
    }
    setLoading(false);
  };

  return (
    <main className="page new-goal-page">
      <h1>Create New Goal</h1>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={loading}>
          <label>
            Discord Tag *
            <input
              autoFocus
              value={discordTag}
              onChange={e => setTag(e.target.value)}
              placeholder="arkk#1234"
              required
            />
          </label>
          <label>
            Discord Name (optional)
            <input
              value={discordName}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Arkks"
            />
          </label>
          <label>
            Goal Content *
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </label>
          <label>
            Deadline *
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              required
            />
          </label>
        </fieldset>
        {error && <p className="error">{error}</p>}
        <button type="submit">
          {loading ? <Spinner /> : 'Save Goal'}
        </button>
      </form>
    </main>
);
}
