// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { ToastProvider } from './components/Toast/ToastContext';
import { ListsPage } from './pages/ListsPage/ListsPage';
import { NewGoalPage } from './pages/NewGoalPage/NewGoalPage';
import { MyGoalsPage } from './pages/MyGoalsPage/MyGoalsPage';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/lists" replace />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/new-goal" element={<NewGoalPage />} />
            <Route path="/my-goals" element={<MyGoalsPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
