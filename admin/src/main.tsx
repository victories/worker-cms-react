import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/admin">
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Register the PWA service worker (scope /admin/). Best-effort — failures
// must never block the app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
  });
}
