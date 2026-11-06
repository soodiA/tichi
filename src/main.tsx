import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Self-hosted font (bundled by Vite): the app must not fetch anything from the internet at runtime.
import '@fontsource/vazirmatn/arabic-300.css';
import '@fontsource/vazirmatn/latin-300.css';
import '@fontsource/vazirmatn/arabic-400.css';
import '@fontsource/vazirmatn/latin-400.css';
import '@fontsource/vazirmatn/arabic-500.css';
import '@fontsource/vazirmatn/latin-500.css';
import '@fontsource/vazirmatn/arabic-600.css';
import '@fontsource/vazirmatn/latin-600.css';
import '@fontsource/vazirmatn/arabic-700.css';
import '@fontsource/vazirmatn/latin-700.css';
import '@fontsource/vazirmatn/arabic-800.css';
import '@fontsource/vazirmatn/latin-800.css';
import './index.css';
import App from './App';

// build: 2026-06-23
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>

      <App />
    </BrowserRouter>
  </StrictMode>
);
