import * as React from 'react';
import { PageView, UserProfile } from './types';
import DashboardPage from './pages/DashboardPage';
import WelcomePage from './pages/WelcomePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { useAuth } from './context/AuthContext';
import { initializeFirebase } from './services/firebase';


const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<PageView>('WELCOME');

  // ✅ Initialize Firebase AFTER first render
  React.useEffect(() => {
    initializeFirebase();
  }, []);


  // Handle routing redirects based on auth state
  React.useEffect(() => {
    if (loading) return;

    if (user) {
      // If logged in and on a public page, decide where to go
      if (['WELCOME', 'SIGNIN', 'FORGOT_PASSWORD'].includes(currentPage)) {
        setCurrentPage('DASHBOARD');
      } else if (currentPage === 'SIGNUP') {
        // Redirect new signups to Profile to fill in their details
        setCurrentPage('PROFILE');
      }
    } else {
      // If logged out and on a protected page, go to Welcome
      if (['DASHBOARD', 'PROFILE', 'SETTINGS'].includes(currentPage)) {
        setCurrentPage('WELCOME');
      }
    }
  }, [user, loading, currentPage]);

  const renderPage = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-nexus-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-mono text-sm animate-pulse">CONNECTING TO SMMD...</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'WELCOME':
        return <WelcomePage onNavigate={setCurrentPage} />;
      case 'SIGNIN':
        return <SignInPage onNavigate={setCurrentPage} />;
      case 'SIGNUP':
        return <SignUpPage onNavigate={setCurrentPage} />;
      case 'FORGOT_PASSWORD':
        return <ForgotPasswordPage onNavigate={setCurrentPage} />;
      case 'DASHBOARD':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'PROFILE':
        return <ProfilePage onNavigate={setCurrentPage} />;
      case 'SETTINGS':
        return <SettingsPage onNavigate={setCurrentPage} />;
      default:
        return <WelcomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark text-slate-800 dark:text-slate-200 font-sans selection:bg-nexus-accent selection:text-nexus-dark transition-colors duration-300">
      {renderPage()}
    </div>
  );
};

export default App;