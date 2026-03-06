import React, { useState } from 'react';
import { PageView } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onNavigate: (page: PageView) => void;
}

const SettingsPage: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark text-slate-800 dark:text-slate-200">
      <header className="bg-white/80 dark:bg-slate-900/50 backdrop-blur border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => onNavigate('DASHBOARD')}
            className="text-slate-500 dark:text-slate-400 hover:text-nexus-accent dark:hover:text-white"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">App Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* User Preferences */}
        <div className="bg-white dark:bg-nexus-panel p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <i className="fas fa-sliders-h text-nexus-accent"></i>
            Preferences
          </h2>
          
          <div className="space-y-6">
             {/* Notification Toggle */}
             <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                   <h3 className="text-sm font-medium text-slate-900 dark:text-white">Push Notifications</h3>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Receive alerts for high heart rate or temp.</p>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications ? 'bg-nexus-success' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
             </div>

             {/* Appearance Toggle */}
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-sm font-medium text-slate-900 dark:text-white">Appearance</h3>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Toggle between Light and Dark mode.</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-nexus-accent' : 'bg-slate-400'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
             </div>
          </div>
        </div>

        {/* About App */}
        <div className="bg-white dark:bg-nexus-panel p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-slate-500"></i>
            About
          </h2>
           <div className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
             <div className="flex justify-between">
               <span>App Version</span>
               <span className="text-slate-900 dark:text-white font-mono">v1.0.0</span>
             </div>
             <div className="flex justify-between">
               <span>AI Model</span>
               <span className="text-slate-900 dark:text-white font-mono">Gemini 2.0 Flash</span>
             </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default SettingsPage;