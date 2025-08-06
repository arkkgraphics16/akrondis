// src/utils/firestoreService.js
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import firebaseApp from './firebaseConfig';

const db = getFirestore(firebaseApp);
const goalsCol = collection(db, 'goals');

/**
 * Add a new goal document.
 * goalData = {
 *   discordName: string,
 *   discordTag: string,
 *   content: string,
 *   utcDeadline: string (ISO),
 *   status: 'Doing It' | 'Need Help' | 'Done'
 * }
 */
export async function addGoal(goalData) {
  const payload = { ...goalData, createdAt: Timestamp.now(), userKey: goalData.discordTag };
  return await addDoc(goalsCol, payload);
}

/** Fetch all goals */
export async function fetchAllGoals() {
  const snap = await getDocs(goalsCol);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Fetch goals by userKey */
export async function fetchGoalsByUser(discordTag) {
  const q = query(goalsCol, where('userKey', '==', discordTag));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
