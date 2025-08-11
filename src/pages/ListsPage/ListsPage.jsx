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
  const [expandedGoals, setExpandedGoals] = useState(new Set());
  // tick forces periodic re-render so countdown updates in real time
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    fetchAllGoals()
      .then(data => setGoals(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // real-time updates: every second
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filterByTab = goal => {
    const ms = msLeft(goal.utcDeadline);
    if (ms !== null && ms <= 0) return false;

    if (activeTab === 'All') return true;
    return goal.type === activeTab;
  };

  const sortByTimeLeft = (a, b) => {
    const msA = msLeft(a.utcDeadline) ?? Infinity; // No deadline = far future
    const msB = msLeft(b.utcDeadline) ?? Infinity;
    return msA - msB; // Ascending: closest deadline first
  };

  // returns a human string according to user rules and omits zero units
  const renderCountdown = utcDeadlineValue => {
    if (!utcDeadlineValue) return 'No deadline';
    const ms = msLeft(utcDeadlineValue);
    if (ms === null) return 'No deadline';
    if (ms <= 0) return 'Expired';

    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);

    if (days > 0) {
      // show days, hours, minutes (no seconds)
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      // show hours, minutes (no seconds)
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      // show minutes and seconds
      return `${minutes}m ${seconds}s`;
    }

    // only seconds left
    return `${seconds}s`;
  };

  const toggleGoalExpansion = (goalId) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const isGoalExpanded = (goalId) => expandedGoals.has(goalId);

  const shouldShowExpandButton = (content) => {
    return content.length > 80 || content.includes('\n');
  };

  if (loading) {
    return (
      <main className="page">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="lists-page">
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
        {goals.filter(filterByTab).sort(sortByTimeLeft).map(g => (
          <li key={g.id} className="goal-item">
            <div className="content-container">
              <div className={`content ${isGoalExpanded(g.id) ? 'expanded' : 'truncated'}`}>
                {g.content}
              </div>
              {shouldShowExpandButton(g.content) && (
                <button
                  className="expand-button"
                  onClick={() => toggleGoalExpansion(g.id)}
                  aria-label={isGoalExpanded(g.id) ? 'Show less' : 'Show more'}
                >
                  {isGoalExpanded(g.id) ? 'Show less ▲' : 'Show more ▼'}
                </button>
              )}
            </div>
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
