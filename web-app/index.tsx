import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { initializeFirebase } from './services/firebase';

// Initialize Firebase services before rendering the app
const isFirebaseInitialized = initializeFirebase();
if (!isFirebaseInitialized) {
  console.error("❌ CRITICAL: Failed to initialize Firebase services. Check configuration in services/firebase.ts");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);