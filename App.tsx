
import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { supabase } from './supabase';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { User } from '@supabase/supabase-js';
=======
import { User } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Chat';
import { supabase, restoreSession, logoutUser } from './utils';
import { Loader2 } from 'lucide-react';
>>>>>>> 1f1919d266ee3e20498483f87b7bd762536000c0

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

<<<<<<< HEAD
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-purple-500 selection:text-white">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LandingPage user={user} onLogout={handleLogout} />
      )}
    </div>
  );
=======
  useEffect(() => {
    // SINGLE SOURCE OF TRUTH: Linear Startup Flow
    // No race conditions, no complex listeners for initial load.
    const startUp = async () => {
      try {
        const restoredUser = await restoreSession();
        if (restoredUser) {
          setUser(restoredUser);
        } else {
          // Explicitly clear any stale state if restoration failed
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

    // Listener purely for Runtime events (like explicit logout from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  if (loading) return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return user ? (
    <Dashboard user={user} onLogout={() => { logoutUser(); setUser(null); }} />
  ) : (
    <Auth onLogin={setUser} />
  );
>>>>>>> 1f1919d266ee3e20498483f87b7bd762536000c0
};

export default App;
