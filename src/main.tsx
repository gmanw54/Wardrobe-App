import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress WebSocket/HMR noise that sometimes bubbles up in sandboxed preview iframes
if (typeof window !== 'undefined') {
  const isWebsocketNoise = (errorMsg: string) => {
    const noisePatterns = [
      'websocket',
      'failed to connect',
      'hmr',
      'connection closed',
      'connection refused',
      'closed without opened',
      'socket',
      'vite'
    ];
    return noisePatterns.some(pattern => errorMsg.toLowerCase().includes(pattern));
  };

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reasonStr = event.reason ? (event.reason.message || String(event.reason)) : '';
      if (isWebsocketNoise(reasonStr)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      }
    } catch {
      // Avoid letting the suppression handler crash
    }
  }, true);

  window.addEventListener('error', (event) => {
    try {
      const errorMsg = event.message || (event.error && (event.error.message || String(event.error))) || '';
      if (isWebsocketNoise(errorMsg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      }
    } catch {
      // Avoid letting the suppression handler crash
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

