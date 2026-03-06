import React, { useState } from 'react';
import { PageView } from '../types';

interface Props {
  onNavigate: (page: PageView) => void;
}

const ForgotPasswordPage: React.FC<Props> = ({ onNavigate }) => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-nexus-dark relative">
      <div className="w-full max-w-md bg-nexus-panel p-8 rounded-xl border border-slate-700 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2 text-center">Reset Password</h2>
        
        {!submitted ? (
          <>
            <p className="text-slate-400 text-sm text-center mb-6">Enter your email to receive recovery instructions.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-nexus-accent focus:outline-none"
                  placeholder="operator@smmd.com"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-2 bg-nexus-accent text-nexus-dark font-bold rounded hover:bg-sky-400 transition-colors"
              >
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
              <i className="fas fa-check text-xl"></i>
            </div>
            <p className="text-slate-300">If an account exists for that email, we have sent instructions to reset your password.</p>
            <button 
              onClick={() => onNavigate('SIGNIN')}
              className="w-full py-2 bg-slate-700 text-white font-bold rounded hover:bg-slate-600 transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        )}

        <button 
          onClick={() => onNavigate('SIGNIN')}
          className="absolute top-4 left-4 text-slate-500 hover:text-white"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;