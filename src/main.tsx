import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// build: 2026-06-23
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/tichi">
      <App />
    </BrowserRouter>
  </StrictMode>
);
