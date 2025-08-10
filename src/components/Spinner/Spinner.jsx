// src/components/Spinner/Spinner.jsx
import React from 'react';
import './Spinner.css';

export function Spinner() {
  return (
    <div className="double-spinner">
      <svg
        className="spinner spinner-primary"
        viewBox="0 0 50 50"
      >
        <circle
          className="path path-primary"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="5"
        />
      </svg>
      <svg
        className="spinner spinner-secondary"
        viewBox="0 0 50 50"
      >
        <circle
          className="path path-secondary"
          cx="25"
          cy="25"
          r="15"
          fill="none"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}