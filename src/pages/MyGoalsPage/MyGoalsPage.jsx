// src/pages/MyGoalsPage/MyGoalsPage.jsx
import React, { useEffect, useState } from 'react';
import { fetchGoalsByUser, updateGoalStatus } from '../../utils/firestoreService';
import { toUTCDate } from '../../utils/timeUtils';
import { Spinner } from '../../components/Spinner/Spinner';
import './MyGoalsPage.css';
import { useAuth } from '../../components/Auth/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';

export function MyGoalsPage() {
  const { user, signInWithGoogle } = useAuth();
  const addToast = useToast();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  const renderCountdown = utcISO => {
    const ms = toUTCDate(utcISO) - new Date();
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

  if (!user) {
    return (
      <main className="page my-goals-page">
        <h1>My Goals</h1>
        <p>You must sign in with Google to see your goals.</p>
        <button onClick={() => signInWithGoogle()}>Sign in with Google</button>
      </main>
    );
  }

  return (
    <main className="page my-goals-page">
      <h1>My Goals</h1>

      {loading && <Spinner />}

      {!loading && goals.length === 0 && <p>No goals yet. Create one.</p>}

      {!loading && goals.length > 0 && (
        <ul className="goal-list">
          {goals.map(g => (
            <li key={g.id} className="goal-item">
              <div className="content">{g.content}</div>
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
