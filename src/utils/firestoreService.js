// src/utils/firestoreService.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const goalsCol = collection(db, 'goals');

/**
 * Add a new goal.
 * Accepts goalData.utcDeadline as ISO string (UTC) or Date,
 * converts to Firestore Timestamp before storing.
 */
export async function addGoal(goalData) {
  // make sure utcDeadline becomes a Timestamp
  let utcDeadlineTs = null;
  if (goalData.utcDeadline instanceof Date) {
    utcDeadlineTs = Timestamp.fromDate(goalData.utcDeadline);
  } else if (typeof goalData.utcDeadline === 'string') {
    utcDeadlineTs = Timestamp.fromDate(new Date(goalData.utcDeadline));
  } else {
    throw new Error('utcDeadline must be an ISO string or Date');
  }

  const payload = {
    ...goalData,
    utcDeadline: utcDeadlineTs,
    createdAt: Timestamp.now(),
    userKey: goalData.ownerUid
  };

  const ref = await addDoc(goalsCol, payload);
  return { id: ref.id, ...payload };
}

/** Fetch all goals and normalize utcDeadline to ISO string */
export async function fetchAllGoals() {
  const snap = await getDocs(goalsCol);
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

/** Fetch goals by owner UID and normalize utcDeadline */
export async function fetchGoalsByUser(uid) {
  const q = query(goalsCol, where('ownerUid', '==', uid));
  const snap = await getDocs(q);
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

export async function updateGoalStatus(goalId, newStatus) {
  const gDoc = doc(db, 'goals', goalId);
  await updateDoc(gDoc, {
    status: newStatus,
    lastUpdated: Timestamp.now()
  });
  return true;
}
