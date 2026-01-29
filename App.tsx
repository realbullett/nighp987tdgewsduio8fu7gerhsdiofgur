
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import LoadingScreen from './components/LoadingScreen';
import OffsetsPage from './components/OffsetsPage';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
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

  const isOffsetsPage = window.location.pathname === '/offsets.json';

  if (isOffsetsPage) {
    return <OffsetsPage />;
  }

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Show intro animation for non-logged in users
  if (showIntro && !user) {
    return <LoadingScreen onComplete={handleIntroComplete} />;
  }

  return (
    <div className="min-h-screen">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LandingPage user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
