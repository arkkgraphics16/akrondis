// src/utils/firestoreService.js
// Updated to use Collection Group Queries for ListsPage

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  serverTimestamp,
  collectionGroup,
  orderBy
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

/* ---------- UPDATED: Collection Group Query for all goals ---------- */

/**
 * fetchAllGoals() - Uses Collection Group Query to get ALL goals from all users
 * Returns goals with Timestamps converted to ISO strings for consistency
 */
export async function fetchAllGoals() {
  const goalsGroupQuery = query(
    collectionGroup(db, 'goals'), 
    where('deleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  const snap = await getDocs(goalsGroupQuery);
  return snap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      // Convert Firestore timestamps to ISO strings for consistency
      utcDeadline: data.utcDeadline && data.utcDeadline.toDate
        ? data.utcDeadline.toDate().toISOString()
        : data.utcDeadline,
      createdAt: data.createdAt && data.createdAt.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
      updatedAt: data.updatedAt && data.updatedAt.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt
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

  // If no uid available => throw error (no more legacy root collection)
  if (!uid) {
    throw new Error('uid is required - legacy root collection no longer supported');
  }

  // Create under users/{uid}/goals
  const utcDeadlineTs = goalData.utcDeadline ? toTimestampOrNull(goalData.utcDeadline) : null;
  const payload = {
    content: goalData.content.trim(),
    utcDeadline: utcDeadlineTs,
    status: goalData.status || 'Doing It',
    uid: uid,
    // Add these fields for display purposes
    ownerDisplayName: goalData.ownerDisplayName || '',
    discordNick: goalData.discordNick || '',
    discordTag: goalData.discordTag || '',
    type: goalData.type || 'One-Time',
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(userGoalsCol(uid), payload);
  return { id: ref.id, ...payload };
}

/**
 * fetchGoalsByUser(uid) - returns non-deleted goals under users/{uid}/goals
 * Timestamps are converted to ISO strings for consistency.
 */
export async function fetchGoalsByUser(uid) {
  if (!uid) throw new Error('uid required');
  const q = query(
    userGoalsCol(uid), 
    where('deleted', '==', false),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => {
    const data = d.data();
    out.push({ 
      id: d.id, 
      ...data,
      // Convert Timestamps to ISO strings for consistency
      utcDeadline: data.utcDeadline && data.utcDeadline.toDate
        ? data.utcDeadline.toDate().toISOString()
        : data.utcDeadline,
      createdAt: data.createdAt && data.createdAt.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
      updatedAt: data.updatedAt && data.updatedAt.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt
    });
  });
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

/* ---------- Legacy root helpers (DEPRECATED - for migration only) ---------- */

export async function fetchAllGoalsRoot() {
  console.warn('fetchAllGoalsRoot is deprecated - use fetchAllGoals() which now uses Collection Group Query');
  const rootCol = collection(db, 'goals');
  const snap = await getDocs(rootCol);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}