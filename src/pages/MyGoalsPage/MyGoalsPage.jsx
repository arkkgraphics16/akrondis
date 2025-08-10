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

function DeadlineModal({ visible, initialTimestamp, onClose, onSave }) {
  // initialTimestamp is a Firestore Timestamp or null
  const [value, setValue] = useState('');
  useEffect(() => {
    if (!visible) return;
    if (initialTimestamp && initialTimestamp.toMillis) {
      const dt = new Date(initialTimestamp.toMillis());
      // input type=datetime-local expects "yyyy-mm-ddThh:mm"
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setValue(local);
    } else {
      setValue('');
    }
  }, [visible, initialTimestamp]);

  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Edit deadline</h3>
        <input
          type="datetime-local"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() => {
              if (!value) return onSave(null);
              // convert local datetime-local value back to Date (treat as local)
              const date = new Date(value);
              // Convert to real Date object (local->UTC is handled by Date)
              onSave(Timestamp.fromDate(date));
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function MyGoalsPage() {
  const { user, signInWithGoogle } = useAuth();
  const addToast = useToast();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  // per-item states
  const [savingIds, setSavingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [editingContentId, setEditingContentId] = useState(null);
  const [editingContentValue, setEditingContentValue] = useState('');
  const [deadlineModalGoal, setDeadlineModalGoal] = useState(null); // goal object
  const [lastDeleted, setLastDeleted] = useState(null); // { goal, timerId }

  const undoTimeoutMs = 6000; // 6 seconds

  // handle msLeft input: accept either ISO string or Firestore Timestamp
  const renderCountdown = utcISOorTimestamp => {
    let ms;
    try {
      if (!utcISOorTimestamp) return 'No deadline';
      if (utcISOorTimestamp.toMillis) {
        // Firestore Timestamp
        ms = msLeft(new Date(utcISOorTimestamp.toMillis()).toISOString());
      } else {
        // string
        ms = msLeft(utcISOorTimestamp);
      }
      if (ms <= 0) return 'Expired';
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      return `${h}h ${m}m`;
    } catch (e) {
      return 'Invalid';
    }
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

  // Inline content edit: save on blur or Enter
  const startEditContent = (goal) => {
    setEditingContentId(goal.id);
    setEditingContentValue(goal.content);
  };

  const cancelEditContent = () => {
    setEditingContentId(null);
    setEditingContentValue('');
  };

  const saveContent = async (goal) => {
    if (!user) return;
    const trimmed = editingContentValue?.trim() ?? '';
    if (!trimmed) {
      addToast && addToast('Content cannot be empty');
      return;
    }

    const prev = goals;
    // optimistic update locally
    setGoals(g => g.map(x => (x.id === goal.id ? { ...x, content: trimmed } : x)));
    addIdToSet(setSavingIds, goal.id);
    setEditingContentId(null);
    try {
      await updateGoal(user.uid, goal.id, { content: trimmed });
      addToast && addToast('Saved');
    } catch (e) {
      console.error(e);
      setGoals(prev);
      addToast && addToast('Save failed');
    } finally {
      removeIdFromSet(setSavingIds, goal.id);
    }
  };

  // open modal to edit deadline
  const openDeadlineModal = (goal) => {
    setDeadlineModalGoal(goal);
  };

  const closeDeadlineModal = () => setDeadlineModalGoal(null);

  const saveDeadline = async (goal, newTimestamp) => {
    if (!user) return;
    closeDeadlineModal();

    // determine new status per rule A:
    // if new deadline is in the future and current status !== 'Done' => 'Doing It'
    const nowTs = Timestamp.now();
    const willBeFuture = newTimestamp && newTimestamp.toMillis
      ? newTimestamp.toMillis() > nowTs.toMillis()
      : false;

    const newStatus = willBeFuture && goal.status !== 'Done' ? 'Doing It' : goal.status;

    const prev = goals;
    // optimistic local update
    setGoals(g => g.map(x => x.id === goal.id ? {
      ...x,
      utcDeadline: newTimestamp,
      status: newStatus
    } : x));

    addIdToSet(setSavingIds, goal.id);
    try {
      const updates = {};
      updates.utcDeadline = newTimestamp || null;
      if (newStatus !== goal.status) updates.status = newStatus;
      await updateGoal(user.uid, goal.id, updates);
      addToast && addToast('Deadline updated');
    } catch (e) {
      console.error(e);
      setGoals(prev);
      addToast && addToast('Update failed');
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
            const isDim = isSaving || isDeleting;
            return (
              <li key={g.id} className={`goal-item ${isDim ? 'dim' : ''}`}>
                <div className="content" onClick={() => startEditContent(g)}>
                    {editingContentId === g.id ? (
                      <textarea
                        ref={el => {
                          // attach ref and auto-focus via DOM when mounted
                          if (el) {
                            el.focus();
                            // put caret at end
                            const len = el.value.length;
                            el.setSelectionRange(len, len);
                            // auto-resize initially
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                        value={editingContentValue}
                        onChange={e => {
                          setEditingContentValue(e.target.value);
                          // auto-size while typing
                          const el = e.target;
                          el.style.height = 'auto';
                          el.style.height = Math.min(el.scrollHeight, 400) + 'px';
                        }}
                        onInput={e => {
                          // redundant safe-resize for some browsers
                          const el = e.target;
                          el.style.height = 'auto';
                          el.style.height = Math.min(el.scrollHeight, 400) + 'px';
                        }}
                        onBlur={() => saveContent(g)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            // Enter = save (Shift+Enter inserts newline)
                            e.preventDefault();
                            saveContent(g);
                          } else if (e.key === 'Escape') {
                            cancelEditContent();
                          }
                        }}
                        className="inline-editor"
                        rows={1}
                      />
                    ) : (
                      <span>{g.content}</span>
                    )}
                </div>

                <div className="meta">
                  <span className="countdown">{renderCountdown(g.utcDeadline)}</span>
                  <span className={`status ${g.status.replace(' ', '').toLowerCase()}`}>{g.status}</span>
                </div>

                <div className="actions">
                  {isSaving && <Spinner small />}
                  <button className="help" disabled={isSaving || isDeleting} onClick={() => changeStatus(g.id, 'Need Help')}>HELP</button>
                  <button className="miss" disabled={isSaving || isDeleting} onClick={() => changeStatus(g.id, 'Doing It')}>MISS</button>
                  <button className="done" disabled={isSaving || isDeleting} onClick={() => changeStatus(g.id, 'Done')}>DONE</button>

                  <button
                    className="edit-deadline"
                    disabled={isSaving || isDeleting}
                    onClick={() => openDeadlineModal(g)}
                  >
                    Edit
                  </button>

                  <button
                    className="delete"
                    disabled={isSaving || isDeleting}
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

      <DeadlineModal
        visible={!!deadlineModalGoal}
        initialTimestamp={deadlineModalGoal ? deadlineModalGoal.utcDeadline : null}
        onClose={closeDeadlineModal}
        onSave={(ts) => saveDeadline(deadlineModalGoal, ts)}
      />

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
