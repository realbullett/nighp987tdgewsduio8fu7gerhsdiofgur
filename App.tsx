
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Chat';
import { supabase, getCurrentUser } from './utils';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        // Timeout promise: If getCurrentUser takes > 5s, we give up on waiting for the session check
        // and let the user see the login screen. This fixes "infinite loading" on hosted apps.
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Session check timed out")), 5000)
        );

        const u = await Promise.race([getCurrentUser(), timeout]) as User | null;
        if (mounted && u) setUser(u);
      } catch (e) {
        console.warn("Session initialization fallback:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Ensure we have the user profile data loaded
        const u = await getCurrentUser();
        if (mounted) setUser(u);
      }
    });

    return () => { 
        mounted = false;
        subscription.unsubscribe(); 
    };
  }, []);

  if (loading) return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  return user ? (
    <Dashboard user={user} onLogout={() => supabase.auth.signOut()} />
  ) : (
    <Auth onLogin={setUser} />
  );
};

export default App;
