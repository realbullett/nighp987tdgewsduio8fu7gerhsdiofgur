
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Chat';
import { supabase, getCurrentUser } from './utils';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Securely check for existing session from server
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes (e.g. forced logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-purple-900 border-t-purple-500 animate-spin"></div>
      <div className="text-purple-500 font-mono text-xs tracking-[0.2em] animate-pulse">DECRYPTING SESSION</div>
    </div>
  );

  return (
    <>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;
