// src/components/Layout/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './Layout.css';
import { useAuth } from '../Auth/AuthContext';
import { useToast } from '../Toast/ToastContext';

export function Layout() {
  const { user, signInWithGoogle, signOut, setDiscordNick } = useAuth();
  const addToast = useToast();

  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState('');

  useEffect(() => {
    if (user) {
      setNick(user.discordNick || '');
      // If user needs nick, force open modal
      if (user.needsNick) setEditing(true);
    }
  }, [user]);

  const saveNick = async () => {
    if (!user) {
      addToast('You must be signed in');
      return;
    }
    const cleaned = (nick || '').toString().trim();
    if (!cleaned) {
      addToast('Discord nick cannot be empty');
      return;
    }
    try {
      await setDiscordNick(user.uid, cleaned);
      addToast('Discord nick saved');
      setEditing(false);
    } catch (err) {
      console.error('saveNick failed', err);
      addToast('Failed to save nick');
    }
  };

  return (
    <div className="layout">
      <header>
        <h1>Akrondis</h1>

        <div className="header-right">
          {user ? (
            <div className="header-user">
              <div className="avatar">
                {user.photoURL ? <img src={user.photoURL} alt="avatar" /> : <div className="avatar-fallback" />}
              </div>
              <div className="user-meta">
                <div className="user-display">{user.displayName || user.email}</div>
                <div className="user-discord">
                  {user.discordNick ? <span className="discord">@{user.discordNick}</span> : <span className="discord muted">@</span>}
                </div>
              </div>
              <div className="header-actions">
                <button onClick={() => { setNick(user.discordNick || ''); setEditing(true); }} className="auth-btn">Set Discord Nick</button>
                <button onClick={() => signOut()} className="auth-btn danger">Sign out</button>
              </div>
            </div>
          ) : (
            <button onClick={() => signInWithGoogle()} className="auth-btn primary">Sign in with Google</button>
          )}
        </div>
      </header>

      <div className="content">
        <aside className="sidebar">
          <nav>
            <ul>
              <li><NavLink to="/lists">Lists</NavLink></li>
              <li><NavLink to="/new-goal">New Goal</NavLink></li>
              <li><NavLink to="/my-goals">My Goals</NavLink></li>
            </ul>
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>

      {editing && (
        <div className="nick-modal" role="dialog" aria-modal="true">
          <div className="nick-box">
            <h4>Set Discord Nick</h4>
            <input
              value={nick}
              onChange={e => setNick(e.target.value)}
              placeholder="your discord name (no # required)"
              autoFocus
            />
            <div className="row">
              {/* If user is required to set nick (first-login), hide/collapse Cancel */}
              {!user?.needsNick && <button onClick={() => setEditing(false)}>Cancel</button>}
              <button onClick={saveNick}>Save</button>
            </div>
            {user?.needsNick && <p className="hint">You must set a Discord nick to continue.</p>}
          </div>
        </div>
      )}

      <footer>
        <small>© {new Date().getFullYear()} Akrondis</small>
      </footer>
    </div>
  );
}
