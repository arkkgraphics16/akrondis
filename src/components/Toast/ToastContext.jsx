// src/components/Toast/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(msg => {
    const id = Date.now();
    setToasts(current => [...current, { id, msg }]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
