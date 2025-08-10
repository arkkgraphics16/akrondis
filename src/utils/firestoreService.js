// src/utils/firestoreService.js
// Firestore v9 helpers - backward compatible and new users/{uid}/goals path

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

/* ---------- Helpers ---------- */

function toTimestampOrNull(val) {
  if (val == null) return null;
  if (val instanceof Timestamp) return val;
  if (val instanceof Date) return Timestamp.fromDate(val);
  if (typeof val === 'string') {
    const d = new Date(val);
    if (isNaN(d.getTime())) throw new Error('Invalid utcDeadline string');
    return Timestamp.fromDate(d);
  }
  throw new Error('utcDeadline must be Timestamp | Date | ISO string | null');
}

function userGoalsCol(uid) {
  return collection(db, 'users', uid, 'goals');
}

/* ---------- Backwards-compatible root fetch (used by ListsPage) ---------- */

export async function fetchAllGoals() {
  const rootCol = collection(db, 'goals');
  const snap = await getDocs(rootCol);
  return snap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      utcDeadline:
        data.utcDeadline && data.utcDeadline.toDate
          ? data.utcDeadline.toDate().toISOString()
          : data.utcDeadline
    };
  });
}

/* ---------- New / preferred API: users/{uid}/goals ---------- */

/**
 * addGoal(...) supports two forms for compatibility:
 *  - addGoal(uid, goalData)            -> creates under users/{uid}/goals
 *  - addGoal(goalData)                 -> legacy behavior: if goalData contains ownerUid/uid it will create under users/{ownerUid}/goals; otherwise it creates in root /goals (legacy)
 *
 * goalData must include content (non-empty string).
 */
export async function addGoal(uidOrGoalData, maybeGoalData) {
  // Determine calling form
  let uid = null;
  let goalData = null;

  if (typeof uidOrGoalData === 'string') {
    uid = uidOrGoalData;
    goalData = maybeGoalData;
  } else {
    goalData = uidOrGoalData;
    // try to infer uid from payload
    uid = (goalData && (goalData.ownerUid || goalData.uid)) || null;
  }

  if (!goalData || typeof goalData !== 'object') {
    throw new Error('goalData required');
  }
  if (!goalData.content || typeof goalData.content !== 'string' || goalData.content.trim() === '') {
    throw new Error('content is required');
  }

  // If no uid available => fallback to legacy root collection behavior (keeps old clients working)
  if (!uid) {
    // convert deadline if present
    const utcDeadlineTs = goalData.utcDeadline ? toTimestampOrNull(goalData.utcDeadline) : null;
    const payload = {
      ...goalData,
      utcDeadline: utcDeadlineTs,
      createdAt: Timestamp.now(),
      // keep legacy key
      userKey: goalData.ownerUid || goalData.uid || null
    };
    const ref = await addDoc(collection(db, 'goals'), payload);
    return { id: ref.id, ...payload };
  }

  // Preferred path: create under users/{uid}/goals
  const utcDeadlineTs = goalData.utcDeadline ? toTimestampOrNull(goalData.utcDeadline) : null;
  const payload = {
    content: goalData.content.trim(),
    utcDeadline: utcDeadlineTs,
    status: goalData.status || 'Doing It',
    uid: uid,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(userGoalsCol(uid), payload);
  return { id: ref.id, ...payload };
}

/**
 * fetchGoalsByUser(uid) - returns non-deleted goals under users/{uid}/goals
 * Timestamps are returned as Firestore Timestamps.
 */
export async function fetchGoalsByUser(uid) {
  if (!uid) throw new Error('uid required');
  const q = query(userGoalsCol(uid), where('deleted', '==', false));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

/* ---------- Generic update + specific helpers ---------- */

export async function updateGoal(uid, goalId, updates = {}) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');

  const docRef = doc(db, 'users', uid, 'goals', goalId);
  const payload = { ...updates };

  if (Object.prototype.hasOwnProperty.call(payload, 'utcDeadline')) {
    if (payload.utcDeadline == null) {
      payload.utcDeadline = null;
    } else {
      payload.utcDeadline = toTimestampOrNull(payload.utcDeadline);
    }
  }

  payload.updatedAt = serverTimestamp();

  await updateDoc(docRef, payload);
  return true;
}

/**
 * updateGoalStatus: compatibility signature updateGoalStatus(uid, goalId, newStatus)
 */
export async function updateGoalStatus(uid, goalId, newStatus) {
  // allow legacy call pattern updateGoalStatus(goalId, newStatus) - detect and throw helpful message
  if (typeof uid !== 'string') {
    throw new Error('updateGoalStatus signature changed: updateGoalStatus(uid, goalId, newStatus)');
  }
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

/* ---------- Legacy root helpers (for migration) ---------- */

export async function fetchAllGoalsRoot() {
  const rootCol = collection(db, 'goals');
  const snap = await getDocs(rootCol);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}
