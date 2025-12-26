
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
    <div className="w-full max-w-md mx-auto bg-slate-900/40 p-8 rounded-2xl border border-purple-500/20 backdrop-blur-md shadow-2xl">
      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-widest">Identity</label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Username..."
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-widest">Secure Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {view === AuthView.REGISTER && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-widest">Access Key</label>
            <input
              type="text"
              required
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter Access Key..."
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-black italic uppercase tracking-widest py-4 rounded-lg shadow-lg shadow-purple-900/40 transition-all active:scale-95"
        >
          {loading ? 'Processing...' : view === AuthView.LOGIN ? 'LOGIN' : 'Create Profile'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN)}
          className="text-slate-500 hover:text-purple-400 text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          {view === AuthView.LOGIN ? "Register New Client" : "Existing Operator login"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
