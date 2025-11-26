import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { ShieldCheck, Lock, User as UserIcon, Moon, Camera, Upload, AlertTriangle, Stars, ArrowRight, Check } from 'lucide-react';
import { registerUser, loginUser, updateAvatar, getUserProfile } from '../utils';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthStep = 'LOGIN' | 'REGISTER' | 'SETUP_AVATAR';

// --- 3D Starfield Component ---
const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    // Star parameters
    const stars: { x: number; y: number; z: number; o: number }[] = [];
    const STAR_COUNT = 800;
    const SPEED = 2; // Speed of travel
    let mouseX = width / 2;
    let mouseY = height / 2;

    // Init stars
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        o: Math.random() // Opacity offset
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.fillStyle = "#020617"; // Clear with dark night blue
      ctx.fillRect(0, 0, width, height);

      // Parallax center based on mouse
      const cx = width / 2 + (mouseX - width / 2) * 0.05;
      const cy = height / 2 + (mouseY - height / 2) * 0.05;

      stars.forEach(star => {
        // Move star closer
        star.z -= SPEED;

        // Reset if passed viewer
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }

        // Project 3D to 2D
        const x = cx + (star.x / star.z) * width;
        const y = cy + (star.y / star.z) * height;
        
        // Calculate size and opacity based on Z (depth)
        const size = (1 - star.z / width) * 2.5; 
        const opacity = (1 - star.z / width);

        if (x > 0 && x < width && y > 0 && y < height) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(226, 232, 240, ${opacity})`;
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('LOGIN');
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoading(true);
    setError('');

    try {
      if (step === 'REGISTER') {
        // Step 1: Create Account with default avatar
        const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        await registerUser(username, password, defaultAvatar);
        
        // Auto login to establish session
        try {
          await loginUser(username, password);
          // Move to Setup Phase
          setLoading(false);
          setStep('SETUP_AVATAR');
        } catch (loginErr: any) {
           if (loginErr.message.includes("Email not confirmed")) {
             setError("CRITICAL: Supabase Email Confirmation is ENABLED. Disable it in Supabase Dashboard.");
             setStep('LOGIN');
           } else {
             throw loginErr;
           }
        }

      } else {
        // Normal Login
        const { profile } = await loginUser(username, password);
        localStorage.setItem('obsidian_current_user', username);
        if (profile) {
           onLogin({ username, isAuthenticated: true, avatar: profile.avatar });
        } else {
           throw new Error("Profile not found");
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatar) {
      setError("Identity image is required to proceed.");
      return;
    }
    setLoading(true);
    try {
      await updateAvatar(username, avatar);
      const profile = await getUserProfile(username);
      if (profile) {
        onLogin({ username, isAuthenticated: true, avatar: profile.avatar });
      }
    } catch (err: any) {
      setError("Failed to upload identity. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden font-sans">
      
      {/* 3D Starfield Background */}
      <Starfield />

      {/* Glass Card */}
      <div className={`w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/10 shadow-[0_0_60px_rgba(76,29,149,0.3)] backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-spring duration-700 flex flex-col items-center transition-all ${step === 'SETUP_AVATAR' ? 'py-12' : ''}`}>
        
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)] mb-5 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse"></div>
            <Moon className="w-10 h-10 text-indigo-200 relative z-10" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 tracking-tight drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]">Night</h1>
          <p className="text-indigo-300/60 text-xs mt-2 tracking-[0.3em] uppercase font-semibold">
            {step === 'SETUP_AVATAR' ? 'Establish Identity' : 'Secure Space'}
          </p>
        </div>

        {error && (
          <div className={`w-full mb-6 p-4 rounded-xl text-xs font-medium text-center leading-relaxed border flex flex-col items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${error.includes("Success") ? 'bg-green-900/40 border-green-500/30 text-green-200' : 'bg-red-900/40 border-red-500/30 text-red-200'}`}>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
               {error.includes("CRITICAL") && <AlertTriangle className="w-4 h-4" />}
               Status Alert
            </div>
            {error}
          </div>
        )}

        {step === 'SETUP_AVATAR' ? (
           // --- SETUP PHASE ---
           <form onSubmit={handleSetupSubmit} className="w-full flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-right duration-500">
              <div className="relative group">
                <div 
                  className="w-32 h-32 rounded-full bg-indigo-950/50 border-2 border-dashed border-indigo-500/50 flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-indigo-900/50 transition-all duration-300 relative overflow-hidden group shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatar ? (
                    <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-10 h-10 text-indigo-400/70 group-hover:text-purple-300 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-purple-600 rounded-full p-1.5 border-2 border-[#020617]">
                  <PlusIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*"
                  className="hidden"
               />
              
              <div className="text-center space-y-2">
                <h3 className="text-indigo-100 font-bold text-lg">Upload Identity Image</h3>
                <p className="text-indigo-400/60 text-xs max-w-[200px] leading-relaxed">This visual identifier will represent you across encrypted channels.</p>
              </div>

              <button
                type="submit"
                disabled={loading || !avatar}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transform hover:scale-[1.02]"
              >
                {loading ? 'Finalizing...' : 'Complete Setup'} <ArrowRight className="w-4 h-4" />
              </button>
           </form>
        ) : (
           // --- AUTH PHASE ---
           <form onSubmit={handleAuthSubmit} className="w-full space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-indigo-300/50 uppercase tracking-widest ml-1">Identity</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-indigo-400/50 group-focus-within:text-purple-300 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full bg-[#0a0f2c]/60 border border-indigo-500/20 rounded-xl py-3.5 pl-12 pr-4 text-indigo-100 focus:outline-none focus:border-purple-500/50 focus:bg-[#0f1740]/80 transition-all placeholder-indigo-500/30 font-medium backdrop-blur-sm"
                  placeholder="username"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-indigo-300/50 uppercase tracking-widest ml-1">Passcode</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-indigo-400/50 group-focus-within:text-purple-300 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0f2c]/60 border border-indigo-500/20 rounded-xl py-3.5 pl-12 pr-4 text-indigo-100 focus:outline-none focus:border-purple-500/50 focus:bg-[#0f1740]/80 transition-all placeholder-indigo-500/30 font-medium backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] transition-all duration-300 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Connecting...</span>
                </>
              ) : (
                <>
                  {step === 'REGISTER' ? 'Initialize Identity' : 'Enter The Night'}
                  <Stars className="w-4 h-4" />
                </>
              )}
            </button>
            
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => { setStep(step === 'REGISTER' ? 'LOGIN' : 'REGISTER'); setError(''); }}
                className="text-indigo-400/60 hover:text-indigo-200 text-xs font-semibold tracking-wide transition-colors"
              >
                {step === 'REGISTER' ? 'Already established? Log In' : 'New here? Create Identity'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Helper icon
const PlusIcon = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
)

export default Auth;