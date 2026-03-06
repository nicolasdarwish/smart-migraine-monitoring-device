import React, { useState } from 'react';
import { PageView } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  onNavigate: (page: PageView) => void;
}

const SignUpPage: React.FC<Props> = ({ onNavigate }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      // Navigation handled by App.tsx
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-nexus-dark relative transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-nexus-panel p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">Create Account</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">Join the SMMD Network</p>
        
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
              placeholder="jane@smmd.com"
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
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirm Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-slate-900 dark:text-white focus:border-nexus-accent focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-2 bg-nexus-accent text-nexus-dark font-bold rounded hover:bg-sky-400 transition-colors mt-2 ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button onClick={() => onNavigate('SIGNIN')} className="text-nexus-accent hover:underline">
            Sign In
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

export default SignUpPage;