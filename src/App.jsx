// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ListsPage from './pages/ListsPage/ListsPage';
import NewGoalPage from './pages/NewGoalPage/NewGoalPage';
import MyGoalsPage from './pages/MyGoalsPage/MyGoalsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lists" replace />} />
        <Route path="/lists" element={<ListsPage />} />
        <Route path="/new-goal" element={<NewGoalPage />} />
        <Route path="/my-goals" element={<MyGoalsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
