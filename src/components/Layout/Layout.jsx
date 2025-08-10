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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setNick(user.discordNick || '');
      if (user.needsNick) setEditing(true);
    }
  }, [user]);

  // prevent background scroll when mobile sidebar open
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (sidebarOpen && isMobile) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    // cleanup on unmount
    return () => document.body.classList.remove('no-scroll');
  }, [sidebarOpen]);

  const saveNick = async () => {
    if (!user) { addToast('You must be signed in'); return; }
    const cleaned = (nick || '').toString().trim();
    if (!cleaned) { addToast('Discord nick cannot be empty'); return; }
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
        <div className="header-left">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <h1>Akrondis</h1>
        </div>
      </header>

      {/* backdrop for mobile overlay; clicking closes sidebar */}
      <div
        className={`backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <div className={`content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className={`sidebar ${!sidebarOpen ? 'mobile-hidden' : ''}`} aria-hidden={!sidebarOpen && window.innerWidth<=768}>
          <nav className="main-nav">
            <ul>
              <li><NavLink to="/lists" onClick={() => setSidebarOpen(false)}>Lists</NavLink></li>
              <li><NavLink to="/new-goal" onClick={() => setSidebarOpen(false)}>New Goal</NavLink></li>
              <li><NavLink to="/my-goals" onClick={() => setSidebarOpen(false)}>My Goals</NavLink></li>
              {/* add more items here */}
            </ul>
          </nav>

          {/* Bottom area in sidebar */}
          <div className="sidebar-footer">
            {user ? (
              <>
                <div className="user-block">
                  <div className="avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="avatar" />
                    ) : (
                      <div className="avatar-fallback">
                        {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-meta">
                    <div className="user-display">{user.displayName || user.email}</div>
                    <div className="user-discord">
                      {user.discordNick ? (
                        <span className="discord">@{user.discordNick}</span>
                      ) : (
                        <span className="discord muted">@</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="user-actions">
                  <button onClick={() => { setNick(user.discordNick || ''); setEditing(true); }} className="auth-btn">
                    Set Discord Nick
                  </button>
                  <button onClick={() => { setSidebarOpen(false); signOut(); }} className="auth-btn danger">
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => { setSidebarOpen(false); signInWithGoogle(); }} className="auth-btn primary">
                Sign in with Google
              </button>
            )}
          </div>
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
              {!user?.needsNick && <button onClick={() => setEditing(false)}>Cancel</button>}
              <button onClick={saveNick}>Save</button>
            </div>
            {user?.needsNick && <p className="hint">You must set a Discord nick to continue.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
