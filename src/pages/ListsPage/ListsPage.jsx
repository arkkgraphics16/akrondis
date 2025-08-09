// src/pages/ListsPage/ListsPage.jsx
import React, { useEffect, useState } from 'react';
import { fetchAllGoals } from '../../utils/firestoreService';
import { msLeft } from '../../utils/timeUtils';
import { Spinner } from '../../components/Spinner/Spinner';
import './ListsPage.css';

export function ListsPage() {
  const tabs = ['All', 'One-Time', 'Daily', 'Weekly'];
  const [activeTab, setActiveTab] = useState('All');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllGoals()
      .then(data => setGoals(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filterByTab = goal => {
    if (activeTab === 'All') return true;
    return goal.type === activeTab;
  };

  const renderCountdown = utcISO => {
    const ms = msLeft(utcISO);
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <main className="page">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="page lists-page">
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={t === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <ul className="goal-list">
        {goals.filter(filterByTab).map(g => (
          <li key={g.id} className="goal-item">
            <div className="content">{g.content}</div>
            <div className="meta">
              <span className="user">@{g.discordNick || g.discordTag || 'unknown'}</span>
              <span className="countdown">{renderCountdown(g.utcDeadline)}</span>
              <span className={`status ${g.status.replace(' ', '').toLowerCase()}`}>
                {g.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}