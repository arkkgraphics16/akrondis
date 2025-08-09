// src/utils/firestoreService.js
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const goalsCol = collection(db, 'goals');

export async function addGoal(goalData) {
  const payload = { ...goalData, createdAt: Timestamp.now(), userKey: goalData.ownerUid };
  return await addDoc(goalsCol, payload);
}

export async function fetchAllGoals() {
  const snap = await getDocs(goalsCol);
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function fetchGoalsByUser(uid) {
  const q = query(goalsCol, where('ownerUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function updateGoalStatus(goalId, newStatus) {
  const gDoc = doc(db, 'goals', goalId);
  await updateDoc(gDoc, {
    status: newStatus,
    lastUpdated: Timestamp.now()
  });
  return true;
}
