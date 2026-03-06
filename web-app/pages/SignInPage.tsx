import React, { useState } from 'react';
import { PageView } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  onNavigate: (page: PageView) => void;
}

const SignInPage: React.FC<Props> = ({ onNavigate }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      // Navigation is handled by App.tsx useEffect based on auth state change
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-nexus-dark relative transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-nexus-panel p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">Sign in to access SMMD</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 rounded text-red-700 dark:text-red-300 text-xs">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white focus:border-nexus-accent focus:outline-none"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white focus:border-nexus-accent focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex justify-end">
            <button 
              type="button"
              onClick={() => onNavigate('FORGOT_PASSWORD')}
              className="text-xs text-nexus-accent hover:text-sky-400"
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-2 bg-nexus-accent text-nexus-dark font-bold rounded hover:bg-sky-400 transition-colors ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('SIGNUP')} className="text-nexus-accent hover:underline">
            Sign Up
          </button>
        </div>

        <button 
          onClick={() => onNavigate('WELCOME')}
          className="absolute top-4 left-4 text-slate-500 dark:text-slate-500 dark:hover:text-white hover:text-slate-800"
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
      </div>
    </div>
  );
};

export default SignInPage;