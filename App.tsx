import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Chat';
import { supabase, restoreSession, logoutUser } from './utils';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
};

export default App;
