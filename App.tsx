import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Chat';
import { supabase, getCurrentUser } from './utils';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await getCurrentUser();
        if (u) setUser(u);
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        const u = await getCurrentUser();
        setUser(u);
      }
    });

    return () => { subscription.unsubscribe(); };
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