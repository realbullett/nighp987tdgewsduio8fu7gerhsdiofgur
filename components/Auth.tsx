
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { AuthView } from '../types';
import { ArrowRight, Lock, User, Loader2 } from 'lucide-react';

const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>(AuthView.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  // Initialize reCAPTCHA explicitly when view changes to REGISTER
  useEffect(() => {
    if (view === AuthView.REGISTER) {
      const loadCaptcha = () => {
        // Ensure grecaptcha enterprise is available
        if (window.grecaptcha && window.grecaptcha.enterprise) {
          window.grecaptcha.enterprise.ready(() => {
            // Check if element exists and hasn't been rendered yet
            if (recaptchaRef.current && widgetIdRef.current === null) {
              try {
                // Clear any potential leftover content
                recaptchaRef.current.innerHTML = '';

                const widgetId = window.grecaptcha.enterprise.render(recaptchaRef.current, {
                  'sitekey': '6Lcme1YsAAAAAD0NoH3RdLcTeJn2f0O6oawNy12j',
                  'action': 'SIGNUP',
                  'callback': (token: string) => {
                    setCaptchaVerified(true);
                    // NOTE: To fully secure this, you must send this 'token' to your backend 
                    // and create an assessment using the Google Cloud API.
                    // For this purely client-side showcase, we trigger the verified state on callback.
                  },
                  'expired-callback': () => {
                    setCaptchaVerified(false);
                  },
                  'theme': 'dark'
                });
                widgetIdRef.current = widgetId;
              } catch (e) {
                console.error("reCAPTCHA render error:", e);
              }
            }
          });
        } else {
          // Retry if script isn't loaded yet
          setTimeout(loadCaptcha, 100);
        }
      };

      loadCaptcha();
    } else {
      // Reset widget ID if we switch views so we can render again if needed
      widgetIdRef.current = null;
    }
  }, [view]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (view === AuthView.REGISTER) {
        if (!captchaVerified) {
          throw new Error('Please complete the reCAPTCHA verification.');
        }

        const effectiveEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s/g, '')}@glycon.internal`;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: effectiveEmail,
          password
        });

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
          {view === AuthView.LOGIN ? 'Authenticate to access the loader' : 'Complete verification to register'}
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
            <div className="group relative animate-in fade-in slide-in-from-top-2 flex justify-center min-h-[78px]">
              <div ref={recaptchaRef}></div>
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

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default Auth;
