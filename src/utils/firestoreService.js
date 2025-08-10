// src/utils/firestoreService.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';

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

/* ---------- Preferred API: users/{uid}/goals ---------- */
export async function addGoal(uidOrGoalData, maybeGoalData) {
  let uid = null;
  let goalData = null;

  if (typeof uidOrGoalData === 'string') {
    uid = uidOrGoalData;
    goalData = maybeGoalData;
  } else {
    goalData = uidOrGoalData;
    uid = (goalData && (goalData.ownerUid || goalData.uid)) || null;
  }

  if (!goalData || typeof goalData !== 'object') throw new Error('goalData required');
  if (!goalData.content || typeof goalData.content !== 'string' || goalData.content.trim() === '') throw new Error('content is required');

  if (!uid) {
    // legacy root create
    const utcDeadlineTs = goalData.utcDeadline ? toTimestampOrNull(goalData.utcDeadline) : null;
    const payload = {
      ...goalData,
      utcDeadline: utcDeadlineTs,
      createdAt: Timestamp.now(),
      userKey: goalData.ownerUid || goalData.uid || null
    };
    const ref = await addDoc(collection(db, 'goals'), payload);
    return { id: ref.id, ...payload };
  }

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
  const result = { id: ref.id, ...payload };

  // MIRROR: create a root /goals document with same id for ListsPage compatibility
  // Best-effort: if root write fails because of rules, ignore it.
  try {
    const rootDocRef = doc(db, 'goals', ref.id);
    // keep minimal public fields so lists can show them:
    await setDoc(rootDocRef, {
      content: payload.content,
      utcDeadline: payload.utcDeadline,
      status: payload.status,
      ownerUid: uid,
      createdAt: serverTimestamp(),
      // keep a reference to users path if you want
      mirroredFrom: `users/${uid}/goals/${ref.id}`
    }, { merge: true });
  } catch (e) {
    // swallow - mirror is best-effort
    console.warn('mirror create to /goals failed:', e?.message || e);
  }

  return result;
}

export async function fetchGoalsByUser(uid) {
  if (!uid) throw new Error('uid required');
  const q = query(userGoalsCol(uid), where('deleted', '==', false));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}

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

  // MIRROR: try to update root /goals/{goalId} if it exists
  try {
    const rootRef = doc(db, 'goals', goalId);
    // Use updateDoc (will fail if doc doesn't exist)
    await updateDoc(rootRef, {
      ...(payload.content !== undefined ? { content: payload.content } : {}),
      ...(payload.utcDeadline !== undefined ? { utcDeadline: payload.utcDeadline } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      mirroredUpdatedAt: serverTimestamp()
    });
  } catch (e) {
    // ignore; not critical
    // console.debug('mirror update to /goals failed (may not exist) -', e?.message || e);
  }

  return true;
}

export async function updateGoalStatus(uid, goalId, newStatus) {
  if (typeof uid !== 'string') {
    throw new Error('updateGoalStatus signature changed: updateGoalStatus(uid, goalId, newStatus)');
  }
  if (!['Need Help', 'Doing It', 'Done'].includes(newStatus)) throw new Error('invalid status');

  const gDoc = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(gDoc, { status: newStatus, updatedAt: serverTimestamp() });

  // MIRROR to root
  try {
    const rootRef = doc(db, 'goals', goalId);
    await updateDoc(rootRef, { status: newStatus, mirroredUpdatedAt: serverTimestamp() });
  } catch (e) {
    // ignore
  }

  return true;
}

export async function softDeleteGoal(uid, goalId) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');
  const gDoc = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(gDoc, { deleted: true, updatedAt: serverTimestamp() });

  // mirror (best-effort)
  try {
    const rootRef = doc(db, 'goals', goalId);
    await updateDoc(rootRef, { deleted: true, mirroredUpdatedAt: serverTimestamp() });
  } catch (e) {}
  return true;
}

export async function undoDeleteGoal(uid, goalId) {
  if (!uid) throw new Error('uid required');
  if (!goalId) throw new Error('goalId required');
  const gDoc = doc(db, 'users', uid, 'goals', goalId);
  await updateDoc(gDoc, { deleted: false, updatedAt: serverTimestamp() });

  try {
    const rootRef = doc(db, 'goals', goalId);
    await updateDoc(rootRef, { deleted: false, mirroredUpdatedAt: serverTimestamp() });
  } catch (e) {}
  return true;
}

/* legacy helper */
export async function fetchAllGoalsRoot() {
  const rootCol = collection(db, 'goals');
  const snap = await getDocs(rootCol);
  const out = [];
  snap.forEach(d => out.push({ id: d.id, ...d.data() }));
  return out;
}
