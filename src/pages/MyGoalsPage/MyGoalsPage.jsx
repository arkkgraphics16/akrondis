import React, { useEffect, useState, useRef } from 'react';
import {
  fetchGoalsByUser,
  updateGoal,
  softDeleteGoal,
  undoDeleteGoal,
  updateGoalStatus
} from '../../utils/firestoreService';
import { msLeft } from '../../utils/timeUtils';
import { Spinner } from '../../components/Spinner/Spinner';
import './MyGoalsPage.css';
import { useAuth } from '../../components/Auth/AuthContext';
import { useToast } from '../../components/Toast/ToastContext';
import { Timestamp } from 'firebase/firestore';

export function MyGoalsPage() {
  const { user, signInWithGoogle } = useAuth();
  const addToast = useToast();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState(new Set());

  // per-item states
  const [savingIds, setSavingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingDeadline, setEditingDeadline] = useState('');
  const [lastDeleted, setLastDeleted] = useState(null); // { goal, timerId }

  const undoTimeoutMs = 6000; // 6 seconds

  // handle msLeft input: accept either ISO string or Firestore Timestamp
  const renderCountdown = utcDeadlineValue => {
    if (!utcDeadlineValue) return 'No deadline';
    const ms = msLeft(utcDeadlineValue);
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  const load = async uid => {
    setLoading(true);
    try {
      const data = await fetchGoalsByUser(uid);
      setGoals(data);
    } catch (e) {
      console.error(e);
      addToast && addToast('Failed to load goals');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && user.uid) {
      load(user.uid);
    }
  }, [user]);

  // helper to set (immutable) sets
  const addIdToSet = (setState, id) =>
    setState(s => new Set([...Array.from(s), id]));
  const removeIdFromSet = (setState, id) =>
    setState(s => {
      const n = new Set(Array.from(s));
      n.delete(id);
      return n;
    });

  // Content expansion functions
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

  const changeStatus = async (goalId, newStatus) => {
    if (!user) return;
    // optimistic update
    const prev = goals;
    setGoals(g => g.map(x => (x.id === goalId ? { ...x, status: newStatus } : x)));
    addIdToSet(setSavingIds, goalId);
    try {
      await updateGoalStatus(user.uid, goalId, newStatus);
      addToast && addToast('Status updated');
    } catch (e) {
      console.error(e);
      setGoals(prev);
      addToast && addToast('Update failed');
    } finally {
      removeIdFromSet(setSavingIds, goalId);
    }
  };

  // Combined editing functions
  const startEditGoal = (goal) => {
    setEditingGoalId(goal.id);
    setEditingContent(goal.content);
    
    // Convert deadline to datetime-local format
    if (goal.utcDeadline) {
      const dt = goal.utcDeadline.toDate ? goal.utcDeadline.toDate() : new Date(goal.utcDeadline);
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditingDeadline(local);
    } else {
      setEditingDeadline('');
    }
  };

  const cancelEdit = () => {
    setEditingGoalId(null);
    setEditingContent('');
    setEditingDeadline('');
  };

  const saveGoalChanges = async (goal) => {
    if (!user) return;
    const trimmedContent = editingContent?.trim() ?? '';
    if (!trimmedContent) {
      addToast && addToast('Content cannot be empty');
      return;
    }

    // Process deadline
    let newTimestamp = null;
    if (editingDeadline) {
      const date = new Date(editingDeadline);
      newTimestamp = Timestamp.fromDate(date);
    }

    // Determine new status per rule A:
    // if new deadline is in the future and current status !== 'Done' => 'Doing It'
    const nowTs = Timestamp.now();
    const willBeFuture = newTimestamp && newTimestamp.toMillis() > nowTs.toMillis();
    const newStatus = willBeFuture && goal.status !== 'Done' ? 'Doing It' : goal.status;

    const prev = goals;
    // optimistic update locally
    setGoals(g => g.map(x => (x.id === goal.id ? {
      ...x,
      content: trimmedContent,
      utcDeadline: newTimestamp,
      status: newStatus
    } : x)));
    
    addIdToSet(setSavingIds, goal.id);
    setEditingGoalId(null);
    setEditingContent('');
    setEditingDeadline('');

    try {
      const updates = {
        content: trimmedContent,
        utcDeadline: newTimestamp || null
      };
      if (newStatus !== goal.status) {
        updates.status = newStatus;
      }
      await updateGoal(user.uid, goal.id, updates);
      addToast && addToast('Goal updated successfully');
    } catch (e) {
      console.error(e);
      setGoals(prev);
      addToast && addToast('Save failed');
    } finally {
      removeIdFromSet(setSavingIds, goal.id);
    }
  };

  const handleSoftDelete = async (goal) => {
    if (!user) return;
    if (!window.confirm('Delete this goal? This action is soft (you can undo for a short time).')) return;

    const prev = goals;
    // optimistic remove from UI
    setGoals(g => g.filter(x => x.id !== goal.id));
    addIdToSet(setDeletingIds, goal.id);

    // keep lastDeleted to allow Undo banner
    if (lastDeleted && lastDeleted.timerId) {
      clearTimeout(lastDeleted.timerId);
      setLastDeleted(null);
    }

    const timerId = setTimeout(() => {
      setLastDeleted(null); // expire undo window
    }, undoTimeoutMs);

    setLastDeleted({ goal, timerId });

    try {
      await softDeleteGoal(user.uid, goal.id);
      // show toast but provide undo banner as well
      addToast && addToast('Deleted');
    } catch (e) {
      console.error(e);
      // rollback
      setGoals(prev);
      addToast && addToast('Delete failed');
      clearTimeout(timerId);
      setLastDeleted(null);
    } finally {
      removeIdFromSet(setDeletingIds, goal.id);
    }
  };

  const handleUndoDelete = async () => {
    if (!user) return;
    if (!lastDeleted) return;
    const { goal, timerId } = lastDeleted;
    clearTimeout(timerId);
    setLastDeleted(null);

    // optimistic re-add to local list at front
    setGoals(g => [goal, ...g]);
    try {
      await undoDeleteGoal(user.uid, goal.id);
      addToast && addToast('Restored');
    } catch (e) {
      console.error(e);
      // if undo fails, remove it again
      setGoals(g => g.filter(x => x.id !== goal.id));
      addToast && addToast('Undo failed');
    }
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
          {goals.map(g => {
            const isSaving = savingIds.has(g.id);
            const isDeleting = deletingIds.has(g.id);
            const isEditing = editingGoalId === g.id;
            const isDim = isSaving || isDeleting;
            
            return (
              <li key={g.id} className={`goal-item ${isDim ? 'dim' : ''} ${isEditing ? 'editing' : ''}`}>
                <div className="content-container">
                  {isEditing ? (
                    // Edit form for both content and deadline
                    <div className="edit-form">
                      <textarea
                        autoFocus
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        placeholder="Enter your goal..."
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                      />
                      
                      <div className="deadline-input-group">
                        <label>Deadline (optional)</label>
                        <input
                          type="datetime-local"
                          value={editingDeadline}
                          onChange={e => setEditingDeadline(e.target.value)}
                        />
                      </div>
                      
                      <div className="edit-form-actions">
                        <button 
                          className="cancel-btn"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button 
                          className="save-btn"
                          onClick={() => saveGoalChanges(g)}
                          disabled={!editingContent.trim()}
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <>
                      <div 
                        className={`content ${isGoalExpanded(g.id) ? 'expanded' : 'truncated'}`}
                      >
                        <span>{g.content}</span>
                      </div>
                      {shouldShowExpandButton(g.content) && (
                        <button 
                          className="expand-button"
                          onClick={() => toggleGoalExpansion(g.id)}
                          aria-label={isGoalExpanded(g.id) ? 'Collapse goal' : 'Expand goal'}
                        >
                          {isGoalExpanded(g.id) ? 'Show less ↑' : 'Show more ↓'}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="meta">
                  <span className="countdown">{renderCountdown(g.utcDeadline)}</span>
                  <span className={`status ${g.status.replace(' ', '').toLowerCase()}`}>{g.status}</span>
                </div>

                <div className="actions">
                  {isSaving && <Spinner small />}
                  <button className="help" disabled={isSaving || isDeleting || isEditing} onClick={() => changeStatus(g.id, 'Need Help')}>HELP</button>
                  <button className="miss" disabled={isSaving || isDeleting || isEditing} onClick={() => changeStatus(g.id, 'Doing It')}>MISS</button>
                  <button className="done" disabled={isSaving || isDeleting || isEditing} onClick={() => changeStatus(g.id, 'Done')}>DONE</button>

                  <button
                    className="edit-deadline"
                    disabled={isSaving || isDeleting}
                    onClick={() => isEditing ? cancelEdit() : startEditGoal(g)}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>

                  <button
                    className="delete"
                    disabled={isSaving || isDeleting || isEditing}
                    onClick={() => handleSoftDelete(g)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Undo banner */}
      {lastDeleted && (
        <div className="undo-banner">
          <span>Goal deleted</span>
          <button onClick={handleUndoDelete}>Undo</button>
        </div>
        )}
    </main>
  );
}