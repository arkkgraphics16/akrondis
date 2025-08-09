// src/components/Auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../utils/firebaseConfig';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { uid, email, displayName, photoURL, discordNick? }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        return;
      }
      // load user profile from /users/{uid}
      const userDoc = doc(db, 'users', u.uid);
      const snap = await getDoc(userDoc);
      let discordNick = '';
      if (snap.exists()) {
        discordNick = snap.data().discordNick || '';
      } else {
        // create minimal profile doc
        await setDoc(userDoc, {
          email: u.email || '',
          displayName: u.displayName || '',
          discordNick: '',
        });
      }
      setUser({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        discordNick,
      });
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const res = await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged will run and populate profile
    return res;
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  // set discord nick (stored in /users/{uid}.discordNick)
  const setDiscordNick = useCallback(async (uid, nick) => {
    if (!uid) throw new Error('no uid');
    const userDoc = doc(db, 'users', uid);
    await setDoc(userDoc, { discordNick: nick }, { merge: true });
    // update local user object
    setUser(u => ({ ...u, discordNick: nick }));
  }, []);

  const value = { user, signInWithGoogle, signOut, setDiscordNick };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
