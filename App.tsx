  
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Chat';
import { supabase, restoreSession, logoutUser } from './utils';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    // SINGLE SOURCE OF TRUTH: Linear Startup Flow
    const startUp = async () => {
      try {
        const restoredUser = await restoreSession();
        if (restoredUser) {
          setUser(restoredUser);
          setHasEntered(true); // Skip landing if already logged in
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

    // Listener purely for Runtime events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setHasEntered(false);
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

  // If logged in, show dashboard
  if (user) {
    return (
      <Dashboard user={user} onLogout={() => { logoutUser(); setUser(null); setHasEntered(false); }} />
    );
  }

  // If not logged in, show landing page or auth
  return hasEntered ? (
    <Auth onLogin={(u) => { setUser(u); setHasEntered(true); }} />
  ) : (
    <LandingPage onEnter={() => setHasEntered(true)} />
  );
};

export default App;
