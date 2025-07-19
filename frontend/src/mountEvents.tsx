import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Expose a global mount function so the static docs site can mount the React app progressively.
export function mountKosgeEvents(selector: string = '#participate-root') {
  const el = document.querySelector(selector);
  if (!el) {
    console.error(`mountKosgeEvents: element '${selector}' not found`);
    return;
  }
  ReactDOM.createRoot(el as HTMLElement).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}

// Attach to window for non-module usage
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.mountKosgeEvents = mountKosgeEvents;