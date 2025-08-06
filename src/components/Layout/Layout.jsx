import React from 'react';
import { Outlet } from 'react-router-dom';
import './Layout.css';

export function Layout() {
  return (
    <>
      <header><h1>Akrondis</h1></header>
      <main><Outlet /></main>
      <footer><small>© {new Date().getFullYear()} Akrondis</small></footer>
    </>
  );
}
