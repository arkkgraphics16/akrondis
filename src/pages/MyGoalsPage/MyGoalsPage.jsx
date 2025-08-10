// src/pages/MyGoalsPage/MyGoalsPage.jsx
import React, { useEffect, useState } from 'react';
import { fetchGoalsByUser, updateGoalStatus } from '../../utils/firestoreService';
import { msLeft } from '../../utils/timeUtils';
import { Spinner } from '../../components/Spinner/Spinner';
import './MyGoalsPage.css';
import { useAuth } from '../../components/Auth/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';

export function MyGoalsPage() {
  const { user, signInWithGoogle } = useAuth();
  const addToast = useToast();

  const tabs = ['All', 'One-Time', 'Daily', 'Weekly'];
  const [activeTab, setActiveTab] = useState('All');
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState(new Set());

  const renderCountdown = utcISO => {
    const ms = msLeft(utcISO);
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  const load = async (uid) => {
    setLoading(true);
    try {
      const data = await fetchGoalsByUser(uid);
      setGoals(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && user.uid) {
      load(user.uid);
    }
  }, [user]);

  const changeStatus = async (goalId, newStatus) => {
    setLoading(true);
    try {
      await updateGoalStatus(goalId, newStatus);
      // reflect locally
      setGoals(g => g.map(x => x.id === goalId ? { ...x, status: newStatus } : x));
      addToast('Status updated');
    } catch (e) {
      console.error(e);
      addToast('Update failed');
    }
    setLoading(false);
  };

  const filterByTab = goal => {
    // Hide expired goals
    if (msLeft(goal.utcDeadline) <= 0) return false;
    
    if (activeTab === 'All') return true;
    return goal.type === activeTab;
  };

  const sortByTimeLeft = (a, b) => {
    const msA = msLeft(a.utcDeadline);
    const msB = msLeft(b.utcDeadline);
    return msA - msB; // Ascending: closest deadline first
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

  if (!user) {
    return (
      <main className="page my-goals-page">
        <h1>My Goals</h1>
        <p>You must sign in with Google to see your goals.</p>
        <button onClick={() => signInWithGoogle()}>Sign in with Google</button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="my-goals-page">
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

      {goals.length === 0 && <p>No goals yet. Create one.</p>}

      {goals.length > 0 && (
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
                    aria-label={isGoalExpanded(g.id) ? 'Collapse goal' : 'Expand goal'}
                  >
                    {isGoalExpanded(g.id) ? '↑' : '↓'}
                  </button>
                )}
              </div>
              <div className="meta">
                <span className="countdown">{renderCountdown(g.utcDeadline)}</span>
                <span className={`status ${g.status.replace(' ', '').toLowerCase()}`}>{g.status}</span>
              </div>

              <div className="actions">
                <button className="help" onClick={() => changeStatus(g.id, 'Need Help')}>HELP</button>
                <button className="miss" onClick={() => changeStatus(g.id, 'Doing It')}>MISS</button>
                <button className="done" onClick={() => changeStatus(g.id, 'Done')}>DONE</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}