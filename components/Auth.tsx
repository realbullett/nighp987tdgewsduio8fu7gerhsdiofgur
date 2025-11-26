
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { ShieldCheck, Lock, User as UserIcon, Zap, Camera, Upload } from 'lucide-react';
import { registerUser, verifyUser, getUserProfile } from '../utils';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string>(''); // Base64
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    if (isRegistering && !avatar) {
      setError("Profile picture is required for secure identification.");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await registerUser(username, password, avatar);
        localStorage.setItem('obsidian_current_user', username);
        onLogin({ username, isAuthenticated: true, avatar });
      } else {
        const isValid = await verifyUser(username, password);
        if (isValid) {
          const profile = await getUserProfile(username);
          localStorage.setItem('obsidian_current_user', username);
          onLogin({ username, isAuthenticated: true, avatar: profile?.avatar });
        } else {
          throw new Error("Invalid credentials");
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-950/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-950/60 backdrop-blur-3xl border border-white/5 shadow-2xl shadow-black relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center shadow-lg shadow-purple-900/50 mb-4">
            <Zap className="w-7 h-7 text-purple-200" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Obsidian</h1>
          <p className="text-slate-500 text-xs mt-1 tracking-wider uppercase">Encrypted Messenger</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-950/30 border border-red-500/20 text-red-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {isRegistering && (
            <div className="flex flex-col items-center justify-center mb-6">
               <div 
                 className="w-24 h-24 rounded-full bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors relative overflow-hidden group"
                 onClick={() => fileInputRef.current?.click()}
               >
                 {avatar ? (
                   <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                 ) : (
                   <Camera className="w-8 h-8 text-slate-600 group-hover:text-purple-500 transition-colors" />
                 )}
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Upload className="w-6 h-6 text-white" />
                 </div>
               </div>
               <span className="text-xs text-slate-500 mt-2">Set Profile Picture</span>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleFileChange} 
                 accept="image/*"
                 className="hidden"
               />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-600 group-focus-within:text-purple-400 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-black/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-purple-900 focus:ring-1 focus:ring-purple-900 transition-all placeholder-slate-700 font-medium"
                placeholder="username"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-600 group-focus-within:text-purple-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-purple-900 focus:ring-1 focus:ring-purple-900 transition-all placeholder-slate-700 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-900 hover:bg-purple-800 text-purple-100 font-semibold py-4 rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-200 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? 'Initialize Identity' : 'Decrypt Session'}
                <ShieldCheck className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setAvatar(''); }}
            className="text-slate-500 hover:text-purple-300 text-xs font-medium transition-colors"
          >
            {isRegistering ? 'Already established? Log In' : 'Need an identity? Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
