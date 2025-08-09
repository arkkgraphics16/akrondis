// src/components/Auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../../utils/firebaseConfig';

const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {uid, email, displayName, photoURL, discordNick, needsNick}
  const [loadingState, setLoadingState] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoadingState(true);
      if (!u) {
        setUser(null);
        setLoadingState(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', u.uid);
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          // create minimal profile doc (discordNick empty -> requires set)
          await setDoc(userDocRef, {
            email: u.email || '',
            displayName: u.displayName || '',
            discordNick: ''
          });
          setUser({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            discordNick: '',
            needsNick: true
          });
        } else {
          const data = snap.data();
          const nick = (data.discordNick || '').toString().trim();
          const needsNick = nick.length === 0;
          setUser({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            discordNick: nick,
            needsNick
          });
        }
      } catch (err) {
        console.error('AuthContext: failed loading user profile', err);
        // fallback user object (force nick)
        setUser({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          discordNick: '',
          needsNick: true
        });
      }

      setLoadingState(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const res = await signInWithPopup(auth, googleProvider);
    return res;
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  /**
   * Set discord nick in /users/{uid}.discordNick (merge) AND update existing goals
   * so old goals display the nick too.
   */
  const setDiscordNick = useCallback(async (uid, nick) => {
    if (!uid) throw new Error('No uid provided');
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { discordNick: nick }, { merge: true });

    // Update local user state
    setUser(u => (u ? { ...u, discordNick: nick, needsNick: false } : u));

    // Update existing goals owned by this uid to include discordNick
    try {
      const goalsCol = collection(db, 'goals');
      const q = query(goalsCol, where('ownerUid', '==', uid));
      const snap = await getDocs(q);

      const updates = snap.docs.map(docSnap => {
        const gDoc = doc(db, 'goals', docSnap.id);
        return updateDoc(gDoc, { discordNick: nick });
      });

      await Promise.all(updates);
    } catch (err) {
      // non-fatal — log
      console.error('Failed to update existing goals with discordNick:', err);
    }

    return true;
  }, []);

  const value = { user, loadingState, signInWithGoogle, signOut, setDiscordNick };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
