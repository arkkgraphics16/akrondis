// src/pages/NewGoalPage/NewGoalPage.jsx
import React, { useState } from 'react';
import './NewGoalPage.css';
import { toUTCDate, toISOStringUTC } from '../../utils/timeUtils';
import { addGoal } from '../../utils/firestoreService';

const GOAL_STATUS = { DOING: 'Doing It', HELP: 'Need Help', DONE: 'Done' };

export function NewGoalPage() {
  const [discordTag, setTag]   = useState('');
  const [discordName, setName] = useState('');
  const [content, setContent]  = useState('');
  const [deadline, setDeadline]= useState('');
  const [error, setError]      = useState('');
  const [loading, setLoading]  = useState(false);

  const validate = () => {
    if (!/^[\w]{2,32}#\d{4}$/.test(discordTag)) return 'Tag must be like arkk#1234';
    if (!content.trim()) return 'Goal content required';
    if (!deadline) return 'Deadline required';
    if (toUTCDate(deadline) <= new Date()) return 'Deadline can’t be in the past';
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
        status: GOAL_STATUS.DOING,
      });
      alert('Goal added!');
      setTag(''); setName(''); setContent(''); setDeadline('');
    } catch {
      setError('Save failed, try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page new-goal">
      <h1>Create Goal</h1>
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
            Discord Name (opt)
            <input
              value={discordName}
              onChange={e => setName(e.target.value)}
              placeholder="Arkk"
            />
          </label>

          <label>
            Goal *
            <textarea
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              aria-label="Goal description"
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

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? <Spinner /> : 'Save Goal'}
          </button>
        </fieldset>
      </form>
    </main>
  );
}

// Inline spinner component (module style)
function Spinner() {
  return (
    <svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="11 44" />
    </svg>
  );
}