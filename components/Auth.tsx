
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { AuthView } from '../types';
import { ArrowRight, Lock, User, Key, Loader2 } from 'lucide-react';

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
          throw new Error('Invalid Access Key.');
        }
        const effectiveEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s/g, '')}@glycon.internal`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: effectiveEmail, password });
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            username: email.split('@')[0]
          });
        }

        await supabase.auth.signInWithPassword({ email: effectiveEmail, password });
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
    <div className="w-full max-w-sm mx-auto p-6">
      <div className="mb-8 text-center space-y-1">
        <h2 className="text-3xl font-bold text-white tracking-tight">
          {view === AuthView.LOGIN ? 'Welcome Back' : 'Join Glycon'}
        </h2>
        <p className="text-slate-500 text-sm">
          {view === AuthView.LOGIN ? 'Authenticate to access the loader' : 'Enter credentials to register'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-6">
        <div className="space-y-4">
          <div className="group relative">
            <User className="absolute left-0 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-slate-800 py-3 pl-8 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors bg-gradient-to-r from-transparent to-transparent focus:to-purple-900/5"
              placeholder="Username"
            />
          </div>

          <div className="group relative">
            <Lock className="absolute left-0 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-slate-800 py-3 pl-8 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors bg-gradient-to-r from-transparent to-transparent focus:to-purple-900/5"
              placeholder="Password"
            />
          </div>

          {view === AuthView.REGISTER && (
            <div className="group relative animate-in fade-in slide-in-from-top-2">
              <Key className="absolute left-0 top-3 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
              <input
                type="text"
                required
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full bg-transparent border-b border-slate-800 py-3 pl-8 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors bg-gradient-to-r from-transparent to-transparent focus:to-purple-900/5"
                placeholder="Access Key (From Discord)"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group w-full bg-white text-black hover:bg-purple-400 hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black font-bold h-12 rounded flex items-center justify-center gap-2 transition-all duration-300"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <span>{view === AuthView.LOGIN ? 'Login' : 'Create New Account'}</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button
          onClick={() => setView(view === AuthView.LOGIN ? AuthView.REGISTER : AuthView.LOGIN)}
          className="text-slate-500 hover:text-white text-xs transition-colors font-mono uppercase tracking-wider"
        >
          {view === AuthView.LOGIN ? "Register New ID" : "Back to Login"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
