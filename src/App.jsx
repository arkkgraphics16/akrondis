import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { ToastProvider } from './components/Toast/ToastContext';
import { AuthProvider } from './components/Auth/AuthContext';
import { ListsPage } from './pages/ListsPage/ListsPage';
import { NewGoalPage } from './pages/NewGoalPage/NewGoalPage';
import { MyGoalsPage } from './pages/MyGoalsPage/MyGoalsPage';

/* Use explicit .jsx imports so Vite/Rollup resolves them reliably */
import PrivacyPolicyPage from './pages/PrivacyPolicy/PrivacyPolicyPage.jsx';
import TermsOfService from './pages/TermsOfService/TermsOfServicePage.jsx';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/lists" replace />} />
              <Route path="/lists" element={<ListsPage />} />
              <Route path="/new-goal" element={<NewGoalPage />} />
              <Route path="/my-goals" element={<MyGoalsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
