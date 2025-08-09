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
      .then(setGoals)
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, []);

  const filterByTab = g => activeTab === 'All' || g.type === activeTab;

  const countdown = localISO => {
    const ms = msLeft(localISO);
    if (ms <= 0) return 'Expired';
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) return <Spinner />;
  return (
    <main className="page lists-page">
      <nav className="tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={activeTab === t ? 'active' : ''}
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
              <span className="countdown">{countdown(g.utcDeadline)}</span>
              <span className={`status ${g.status.replace(' ', '').toLowerCase()}`}>{g.status}</span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
