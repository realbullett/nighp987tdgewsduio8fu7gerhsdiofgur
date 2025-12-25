
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Chat';
import { supabase, restoreSession, logoutUser, warmupChatCache } from './utils';
import { Loader2, ShieldCheck, Database, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("Initializing neural link...");
  const [hasEntered, setHasEntered] = useState(false);

  const startSynchronization = async (u: User) => {
    setSyncing(true);
    await warmupChatCache(u.username, (progress, status) => {
      setSyncProgress(progress);
      setSyncStatus(status);
    });
    setUser(u);
    setSyncing(false);
    setHasEntered(true);
  };

  useEffect(() => {
    const startUp = async () => {
      try {
        const restoredUser = await restoreSession();
        if (restoredUser) {
          await startSynchronization(restoredUser);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Startup failed", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    startUp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setHasEntered(false);
        setLoading(false);
        setSyncing(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  if (loading) return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white opacity-20" />
    </div>
  );

  if (syncing) return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Background Noise */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        
        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 animate-pulse">
                <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">Synchronizing</h2>
            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mb-8">{syncStatus}</p>
            
            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-6 border border-white/5">
                <div 
                    className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                ></div>
            </div>
            
            <div className="flex gap-4 opacity-20 text-zinc-500">
                <Database className="w-4 h-4" />
                <Lock className="w-4 h-4" />
                <div className="text-[9px] font-black mt-0.5 uppercase tracking-widest">{syncProgress}%</div>
            </div>
        </div>
    </div>
  );

  if (user) {
    return (
      <Dashboard user={user} onLogout={() => { logoutUser(); setUser(null); setHasEntered(false); }} />
    );
  }

  return hasEntered ? (
    <Auth onLogin={(u) => startSynchronization(u)} />
  ) : (
    <LandingPage onEnter={() => setHasEntered(true)} />
  );
};

export default App;
