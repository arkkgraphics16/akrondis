// src/components/Layout/Layout.jsx
import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './Layout.css';
import { useAuth } from '../Auth/AuthContext';

export function Layout() {
  const { user, signInWithGoogle, signOut, setDiscordNick } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState('');

  const saveNick = async () => {
    if (!user) return;
    await setDiscordNick(user.uid, nick);
    setEditing(false);
  };

  return (
    <div className="layout">
      <header>
        <h1>Akrondis</h1>
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

          {/* Auth section moved to bottom of sidebar */}
          <div className="auth-area">
            {user ? (
              <>
                <div className="user-info">
                  <span className="user-name">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                  </span>
                  {user.discordNick && (
                    <span className="discord-nick">{user.discordNick}</span>
                  )}
                </div>
                <div className="auth-buttons">
                  <button 
                    className="auth-btn secondary" 
                    onClick={() => { 
                      setNick(user.discordNick || ''); 
                      setEditing(true); 
                    }}
                  >
                    Set Discord Nick
                  </button>
                  <button 
                    className="auth-btn danger" 
                    onClick={() => signOut()}
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <button 
                className="auth-btn primary" 
                onClick={() => signInWithGoogle()}
              >
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
        <div className="nick-modal">
          <div className="nick-box">
            <h4>Set Discord Nick</h4>
            <input 
              value={nick} 
              onChange={e => setNick(e.target.value)} 
              placeholder="arkk#1234 or arkk" 
            />
            <div className="row">
              <button onClick={() => setEditing(false)}>Cancel</button>
              <button onClick={saveNick}>Save</button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <small>© {new Date().getFullYear()} Akrondis</small>
      </footer>
    </div>
  );
}