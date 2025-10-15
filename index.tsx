import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

navigator.serviceWorker.register('/sw.js')
  .then(registration => {
    console.log('Service Worker registrato con successo:', registration);
  })
  .catch(error => {
    console.log('Registrazione del Service Worker fallita:', error);
  });

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);