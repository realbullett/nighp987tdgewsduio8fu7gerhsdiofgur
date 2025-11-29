
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

    const initializeSession = async () => {
      try {
        // 1. Check for existing session in local storage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          if (mounted) setLoading(false);
          return;
        }

        // 2. Validate session and fetch profile
        const userProfile = await getCurrentUser();
        
        if (mounted) {
          if (userProfile) {
            setUser(userProfile);
          } else {
            // Critical: If we have a session but no profile (or invalid), 
            // force sign out to clear stale tokens and prevent infinite loading loops.
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Session initialization failed:", error);
        if (mounted) {
            await supabase.auth.signOut();
            setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    // 3. Listen for auth changes (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Only fetch if we don't already have the user to prevent redundant calls
        if (session) {
            const u = await getCurrentUser();
            if (mounted && u) {
                setUser(u);
                setLoading(false);
            }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
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
    <Dashboard user={user} onLogout={() => { setUser(null); supabase.auth.signOut(); }} />
  ) : (
    <Auth onLogin={setUser} />
  );
};

export default App;
