import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Chat';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage (simplified "cookie")
    const savedUser = localStorage.getItem('obsidian_current_user');
    if (savedUser) {
      setUser({ username: savedUser, isAuthenticated: true });
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('obsidian_current_user');
    setUser(null);
  };

  if (loading) return null;

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
