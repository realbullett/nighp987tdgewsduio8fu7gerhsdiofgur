
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { AuthView } from '../types';

const ACCESS_KEY_REQUIRED = 'AbGt5J3GfA6Yr5C';

const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>(AuthView.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (view === AuthView.REGISTER) {
        if (accessKey !== ACCESS_KEY_REQUIRED) {
          throw new Error('Invalid Access Key. Please contact an administrator.');
        }
        const effectiveEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s/g, '')}@glycon.internal`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: effectiveEmail, password });
        if (signUpError) throw signUpError;
        
        // Create a public profile record so we can count total registered users
        if (signUpData.user) {
          await supabase.from('profiles').upsert({ 
            id: signUpData.user.id, 
            username: email.split('@')[0] 
          });
        }

        alert('Registration successful! Logging you in...');
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: effectiveEmail, password });
        if (signInError) throw signInError;
      } else {
        const effectiveEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s/g, '')}@glycon.internal`;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: effectiveEmail, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/60 p-8 rounded-2xl border border-slate-800 backdrop-blur-md">
      <form onSubmit={handleAuth} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Username</label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Enter username..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Enter password..."
          />
        </div>

        {view === AuthView.REGISTER && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Access Key</label>
            <input
              type="text"
              required
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter access key..."
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Processing...' : view === AuthView.LOGIN ? 'Login' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN)}
          className="text-slate-400 hover:text-purple-400 text-sm transition-colors"
        >
          {view === AuthView.LOGIN ? "Create an account" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
