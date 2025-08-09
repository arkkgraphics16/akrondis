// src/components/Layout/Layout.jsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './Layout.css';

export function Layout() {
  return (
    <div className="layout">
      <header>
        <h1>Akrondis</h1>
      </header>

      <div className="content">
        <aside className="sidebar">
          <nav>
            <ul>
              <li>
                <NavLink to="/lists">Lists</NavLink>
              </li>
              <li>
                <NavLink to="/new-goal">New Goal</NavLink>
              </li>
              <li>
                <NavLink to="/my-goals">My Goals</NavLink>
              </li>
            </ul>
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>

      <footer>
        <small>© {new Date().getFullYear()} Akrondis</small>
      </footer>
    </div>
  );
}
