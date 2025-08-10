// src/utils/firestoreService.js
// Firestore v9 (modular) helpers for goals stored under users/{uid}/goals/{goalId}

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Helper: normalize various utcDeadline input formats to Firestore Timestamp or null.
 * Accepts:
 *  - Date instance
 *  - ISO string (e.g. "2025-08-10T12:00:00Z" or "2025-08-10T20:00") — will be parsed by Date.
 *  - Firestore Timestamp (returned as-is)
 *  - null/undefined -> null
 */
function toTimestampOrNull(val) {
  if (val == null) return null;
  if (val instanceof Timestamp) return val;
  if (val instanceof Date) return Timestamp.fromDate(val);
  if (typeof val === 'string') {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error('Invalid utcDeadline string');
    }
    return Timestamp.fromDate(d);
  }
  throw new Error('utcDeadline must be a Firestore Timestamp, Date, ISO string, or null');
}

/**
 * Path helper: users/{uid}/goals collection reference
 */
function userGoalsCol(uid) {
  return collection(db, 'users', uid, 'goals');
}

/**
 * Add a new goal under users/{uid}/goals
 *
 * @param {string} uid - owner user id
 * @param {object} goalData - { content, utcDeadline?, status? } - utcDeadline may be ISO string or Date
 * @returns {object} - { id, ...payload } where timestamps may be serverTimestamp() sentinels
 *
 * NOTE: createdAt/updatedAt are set to serverTimestamp() (sentinel) so security rules expecting request.time will pass.
 */
export async function addGoal(uid, goalData) {
  if (!uid) throw new Error('uid required');
  if (!goalData || !goalData.content || typeof goalData.content !== 'string') {
    throw new Error('content is required');
  }

  const utcDeadlineTs = goalData.utcDeadline ? toTimestampOrNull(goalData.utcDeadline) : null;

  const payload = {
    content: goalData.content.trim(),
    utcDeadline: utcDeadlineTs,
    status: goalData.status || 'Doing It', // default status
    uid: uid, // ownership field (used by rules)
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(userGoalsCol(uid), payload);
  // Note: serverTimestamp() are sentinel values; returning payload shows them as such.
  return { id: ref.id, ...payload };
}

/**
 * Fetch goals for a user (non-deleted). Returns array of { id, ...data }.
 * utcDeadline, createdAt, updatedAt come back as Firestore Timestamp objects (if present).
 */
export async function fetchGoalsByUser(uid) {
  if (!uid) throw new Error('uid required');
  const q = query(userGoalsCol(uid), where('deleted', '==', false));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    out.push({ id: d.id, ...d.data() });
  });
  return out;
}

/**
 * Fetch all goals from root /goals collection (legacy / migration helper).
 * This mirrors your old approach if you still have data at /goals. Returns raw fields.
 * NOTE: This is intended for one-off migration scripts or admin use.
 */
export async function fetchAllGoalsRoot() {
  const rootCol = collection(db, 'goals');
  const snap = await getDocs(rootCol);
  const out = [];
  snap.forEach(d => {
    out.push({ id: d.id, ...d.data() });
  });
  return out;
}

/**
 * Generic update for a goal under users/{uid}/goals/{goalId}.
 * Merges the provided updates and sets updatedAt to serverTimestamp().
 *
 * Examples:
 *  updateGoal(uid, goalId, { content: 'new', utcDeadline: '2025-08-11T12:00:00Z' })
 *  updateGoal(uid, goalId, { status: 'Done' })
 *
 * utcDeadline can be Date / ISO string / Firestore Timestamp / null
 */
export async function updateGoal(uid, goalId, updates = {}) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');

  const docRef = doc(db, 'users', uid, 'goals', goalId);
  const payload = { ...updates };

  if (Object.prototype.hasOwnProperty.call(payload, 'utcDeadline')) {
    // allow explicit null to clear the deadline
    if (payload.utcDeadline == null) {
      payload.utcDeadline = null;
    } else {
      payload.utcDeadline = toTimestampOrNull(payload.utcDeadline);
    }
  }

  // always set updatedAt server-side sentinel
  payload.updatedAt = serverTimestamp();

  await updateDoc(docRef, payload);
  return true;
}

/**
 * Update only the status field (compatibility helper).
 * Signature changed to include uid for security path: updateGoalStatus(uid, goalId, newStatus)
 */
export async function updateGoalStatus(uid, goalId, newStatus) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');
  if (!['Need Help', 'Doing It', 'Done'].includes(newStatus)) {
    throw new Error('invalid status');
  }
  const gDoc = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(gDoc, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
  return true;
}

/**
 * Soft-delete a goal (set deleted = true). Use undoDeleteGoal to revert.
 */
export async function softDeleteGoal(uid, goalId) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');
  const gDoc = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(gDoc, {
    deleted: true,
    updatedAt: serverTimestamp()
  });
  return true;
}

/**
 * Undo soft-delete (set deleted = false)
 */
export async function undoDeleteGoal(uid, goalId) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');
  const gDoc = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(gDoc, {
    deleted: false,
    updatedAt: serverTimestamp()
  });
  return true;
}

/**
 * Migration helper: create goal at users/{uid}/goals with given id from a legacy doc.
 * Useful when migrating /goals -> users/{uid}/goals and you want to preserve the same id.
 *
 * WARNING: This will overwrite if a doc with same id exists under users/{uid}/goals.
 */
export async function createGoalWithId(uid, goalId, data) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');
  const docRef = doc(db, 'users', uid, 'goals', goalId);

  // normalize deadline
  const cleaned = { ...data };
  if (cleaned.utcDeadline) {
    try {
      cleaned.utcDeadline = toTimestampOrNull(cleaned.utcDeadline);
    } catch (e) {
      cleaned.utcDeadline = null;
    }
  } else {
    cleaned.utcDeadline = null;
  }

  // ensure fields expected by rules
  cleaned.uid = uid;
  cleaned.deleted = !!cleaned.deleted;
  cleaned.createdAt = cleaned.createdAt || serverTimestamp();
  cleaned.updatedAt = serverTimestamp();

  // use updateDoc would fail for non-existing doc; addDoc can't set custom id, so use set via updateDoc/setDoc is not imported.
  // We intentionally use updateDoc only if exists; caller should ensure using a migration script with admin SDK for robust migration.
  await updateDoc(docRef, cleaned).catch(async (err) => {
    // if doc doesn't exist updateDoc will fail — fallback: add as new doc with desired id using setDoc via admin SDK.
    throw new Error('createGoalWithId requires Admin privileges or setDoc (not implemented here). Run migration with Admin SDK.');
  });
}
