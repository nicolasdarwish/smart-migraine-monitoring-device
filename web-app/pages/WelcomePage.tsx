import React from 'react';
import { PageView } from '../types';

interface Props {
  onNavigate: (page: PageView) => void;
}

const WelcomePage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-nexus-dark relative overflow-hidden transition-colors duration-500 font-sans">
      
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-sky-400/20 dark:bg-nexus-accent/10 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[80px] animate-pulse delay-1000"></div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

      <div className="z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center space-y-12">
        
        {/* Logo/Icon Container */}
        <div className="relative group cursor-default transform hover:scale-105 transition-transform duration-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-nexus-accent to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-28 h-28 bg-white dark:bg-nexus-panel rounded-full flex items-center justify-center shadow-2xl border border-slate-100 dark:border-slate-700/50">
                <i className="fas fa-brain text-5xl text-transparent bg-clip-text bg-gradient-to-br from-nexus-accent to-purple-500"></i>
            </div>
        </div>

        {/* Typography */}
        <div className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
              SMMD
            </h1>
            <p className="text-xl md:text-2xl font-medium text-slate-500 dark:text-slate-300 tracking-wide uppercase">
              Smart Migraine Monitoring
            </p>
          </div>
          
          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div>
             </div>
             <div className="relative flex justify-center">
              <span className="bg-slate-50 dark:bg-nexus-dark px-4 text-sm text-slate-400 dark:text-slate-500 italic">
                Advanced AI Telemetry
              </span>
             </div>
          </div>

          {/* New Tagline */}
          <h3 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 leading-tight">
            Predict triggers. <span className="font-semibold text-nexus-accent">Prevent pain.</span> <br className="hidden md:block"/>
            Reclaim your day.
          </h3>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-md pt-8">
          <button 
            onClick={() => onNavigate('SIGNIN')}
            className="group relative flex-1 px-8 py-4 bg-slate-900 dark:bg-nexus-accent text-white dark:text-nexus-dark font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-nexus-accent/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Sign In <i className="fas fa-arrow-right text-sm transition-transform group-hover:translate-x-1"></i>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-sky-300 dark:to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <button 
            onClick={() => onNavigate('SIGNUP')}
            className="flex-1 px-8 py-4 bg-white dark:bg-slate-800/40 backdrop-blur-md text-slate-700 dark:text-white font-semibold text-lg rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 shadow-sm hover:shadow-lg"
          >
            Create Account
          </button>
        </div>

        {/* Minimal Footer */}
        <div className="pt-8">
             <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">
               &copy; {new Date().getFullYear()} SMMD Network. All systems nominal.
             </p>
        </div>

      </div>
    </div>
  );
};

export default WelcomePage;