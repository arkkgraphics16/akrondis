// src/pages/MyGoalsPage/MyGoalsPage.jsx
import React, { useEffect, useState } from 'react';
import { fetchGoalsByUser } from '../../utils/firestoreService';
import { toUTCDate } from '../../utils/timeUtils';
import { Spinner } from '../../components/Spinner/Spinner';
import './MyGoalsPage.css';

export function MyGoalsPage() {
  const [tag, setTag] = useState('');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const renderCountdown = utcISO => {
    const ms = toUTCDate(utcISO) - new Date();
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  const handleSearch = async e => {
    e.preventDefault();
    if (!tag) return;
    setLoading(true);
    try {
      const data = await fetchGoalsByUser(tag);
      setGoals(data);
      setFetched(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <main className="page my-goals-page">
      <h1>My Goals</h1>
      <form onSubmit={handleSearch} className="tag-form" disabled={loading}>
        <input
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="arkk#1234"
        />
        <button type="submit">
          {loading ? <Spinner /> : 'Load My Goals'}
        </button>
      </form>

      {fetched && !loading && goals.length === 0 && (
        <p>No goals found for {tag}.</p>
      )}

      {loading && <Spinner />}

      {!loading && goals.length > 0 && (
        <ul className="goal-list">
          {goals.map(g => (
            <li key={g.id} className="goal-item">
              <div className="content">{g.content}</div>
              <div className="meta">
                <span className="countdown">{renderCountdown(g.utcDeadline)}</span>
                <span className={`status ${g.status.replace(' ', '').toLowerCase()}`}>
                  {g.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
