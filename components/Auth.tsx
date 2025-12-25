
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Moon, Camera, Upload, AlertTriangle, ArrowRight, Loader2, Check, Sparkles, Copy } from 'lucide-react';
import { registerUser, loginUser, updateAvatar, getUserProfile } from '../utils';
import { getAuthHelp } from '../geminiService';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthStep = 'LOGIN' | 'REGISTER' | 'SETUP_AVATAR';

// --- Optimized Starfield (Noir Edition) ---
export const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const stars: { x: number; y: number; z: number }[] = [];
    const STAR_COUNT = 350; 
    const SPEED = 0.4; 
    
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    let animationFrameId: number;

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      ctx.fillStyle = "#ffffff";
      
      stars.forEach(star => {
        star.z -= SPEED;
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }
        const x = cx + (star.x / star.z) * width;
        const y = cy + (star.y / star.z) * height;
        const size = (1 - star.z / width) * 2.5;
        const opacity = (1 - star.z / width);
        if (x > 0 && x < width && y > 0 && y < height) {
          ctx.globalAlpha = opacity;
          ctx.fillRect(x, y, size, size); 
        }
      });
      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 bg-black pointer-events-none" />;
};

// --- Floating Astronauts Component ---
const FloatingAstronauts = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes float-drift-1 {
          0% { transform: translate(-10vw, 10vh) rotate(5deg); }
          50% { transform: translate(40vw, -10vh) rotate(15deg); }
          100% { transform: translate(-10vw, 10vh) rotate(5deg); }
        }
        @keyframes float-drift-2 {
          0% { transform: translate(110vw, 60vh) rotate(-10deg) scale(0.7); }
          100% { transform: translate(-20vw, 20vh) rotate(40deg) scale(0.7); }
        }
        @keyframes float-drift-3 {
          0% { transform: translate(50vw, 110vh) rotate(180deg) scale(0.5); }
          100% { transform: translate(20vw, -20vh) rotate(200deg) scale(0.5); }
        }
        @keyframes tumble {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .astro-1 { animation: float-drift-1 45s ease-in-out infinite; }
        .astro-2 { animation: float-drift-2 60s linear infinite; }
        .astro-3 { animation: float-drift-3 50s linear infinite; }
        .tumble-slow { animation: tumble 20s linear infinite; }
      `}</style>

      {/* Astronaut 1 - Close Drifter */}
      <div className="absolute top-1/4 left-1/4 astro-1 opacity-20">
         <div className="relative w-12 h-16 tumble-slow">
            {/* Backpack */}
            <div className="absolute -right-2 top-3 w-4 h-8 bg-zinc-700 rounded-r-md"></div>
            {/* Body */}
            <div className="absolute inset-0 bg-zinc-300 rounded-2xl flex flex-col items-center shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.4)] border border-zinc-400">
                {/* Helmet */}
                <div className="w-8 h-8 mt-2 bg-black rounded-full border-4 border-zinc-400 overflow-hidden relative shadow-inner">
                    <div className="absolute top-1 right-2 w-2 h-2 bg-white rounded-full opacity-40 blur-[1px]"></div>
                </div>
                {/* Suit Detail */}
                <div className="w-6 h-1 bg-zinc-400 mt-2 rounded-full"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1 animate-pulse"></div>
            </div>
            {/* Limbs (Simple Shapes) */}
            <div className="absolute -left-1 top-4 w-2 h-6 bg-zinc-300 rounded-full -rotate-12 border border-zinc-400"></div>
            <div className="absolute -right-1 top-4 w-2 h-6 bg-zinc-300 rounded-full rotate-12 border border-zinc-400"></div>
         </div>
      </div>

      {/* Astronaut 2 - Far Passerby */}
      <div className="absolute top-0 left-0 astro-2 opacity-10 blur-[1px]">
          <div className="relative w-10 h-14">
            <div className="absolute -left-1 top-2 w-2 h-6 bg-zinc-600 rounded-l-md"></div>
            <div className="absolute inset-0 bg-zinc-400 rounded-xl flex flex-col items-center border border-zinc-500">
                <div className="w-6 h-6 mt-1.5 bg-zinc-900 rounded-full border-2 border-zinc-400"></div>
            </div>
          </div>
      </div>

      {/* Astronaut 3 - Vertical Drifter */}
      <div className="absolute top-0 left-0 astro-3 opacity-10 blur-[2px]">
          <div className="relative w-8 h-10">
             <div className="absolute inset-0 bg-zinc-500 rounded-lg flex flex-col items-center">
                 <div className="w-5 h-5 mt-1 bg-black rounded-full border border-zinc-400"></div>
             </div>
          </div>
      </div>
    </div>
  );
};

// --- 3D Waving Creature Component ---
const WavingCreature = () => {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center select-none pointer-events-none mb-2">
      <style>{`
        @keyframes wave-hand {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-20deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes float-body {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes blink-eyes {
          0%, 48%, 52%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.1); }
        }
        .creature-body { animation: float-body 4s ease-in-out infinite; }
        .creature-hand { animation: wave-hand 2s ease-in-out infinite; transform-origin: bottom right; }
        .creature-eye { animation: blink-eyes 4s infinite 2s; }
      `}</style>

      {/* Back Glow */}
      <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full scale-75 animate-pulse"></div>

      {/* Main Body Container */}
      <div className="creature-body relative w-16 h-16">
        
        {/* Hand (Behind body initially or to side) */}
        <div className="creature-hand absolute -right-4 top-4 w-6 h-6 bg-zinc-700 rounded-full border border-black/20 shadow-lg z-20 flex items-center justify-center">
            <div className="w-4 h-4 bg-zinc-600 rounded-full opacity-50"></div>
        </div>

        {/* Sphere Body */}
        <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-700 via-zinc-900 to-black shadow-[inset_-4px_-4px_10px_rgba(0,0,0,1),inset_2px_2px_8px_rgba(255,255,255,0.1)] border border-white/5 relative z-10 overflow-hidden">
             {/* Noise Texture */}
             <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
             
             {/* Eyes Container */}
             <div className="absolute top-[30%] left-0 right-0 flex justify-center gap-3">
                 <div className="creature-eye w-3 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                 <div className="creature-eye w-3 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
             </div>
             
             {/* Mouth */}
             <div className="absolute bottom-[25%] left-0 right-0 flex justify-center">
                 <div className="w-2 h-1 bg-zinc-950 rounded-full opacity-50"></div>
             </div>
        </div>
      </div>
    </div>
  );
};

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string>(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiTip, setGeminiTip] = useState('');
  const [loadingTip, setLoadingTip] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animation State
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let s = 0;
    if (password.length > 5) s++;
    if (password.length > 9) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    setPasswordStrength(s);
  }, [password]);

  const toggleAuthMode = () => {
    setError('');
    setGeminiTip('');
    setIsFlipped(!isFlipped);
    setTimeout(() => {
        setStep(step === 'LOGIN' ? 'REGISTER' : 'LOGIN');
    }, 250); 
  };

  const handleAiHelp = async (field: string) => {
      setLoadingTip(true);
      const tip = await getAuthHelp(field);
      setGeminiTip(tip);
      setLoadingTip(false);
  };

  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pass = "";
    for (let i = 0; i < 16; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setConfirmPassword(pass);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image too large. Max 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    if (step === 'REGISTER' && password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }

    setLoading(true);
    setError('');

    try {
      if (step === 'REGISTER') {
        const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        await registerUser(username, password, defaultAvatar, email);
        
        try {
          await loginUser(username, password);
          setLoading(false);
          setStep('SETUP_AVATAR');
        } catch (loginErr: any) {
           if (loginErr.message && loginErr.message.includes("Email not confirmed")) {
             setError("CRITICAL: Supabase Email Confirmation is ENABLED. Disable it in Supabase Dashboard.");
             setStep('LOGIN');
           } else {
             throw loginErr;
           }
        }

      } else {
        const { profile } = await loginUser(username, password);
        if (profile) {
           if (!profile.avatar || profile.avatar.length < 500) { 
             setStep('SETUP_AVATAR');
             setLoading(false);
           } else {
             onLogin({ username, isAuthenticated: true, avatar: profile.avatar });
           }
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
      setError("Please upload an image.");
      return;
    }
    setLoading(true);
    try {
      await updateAvatar(username, avatar);
      const profile = await getUserProfile(username);
      if (profile) {
        onLogin({ username, isAuthenticated: true, avatar: profile.avatar });
      } else {
        throw new Error("Profile verification failed.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to upload identity. Try again.");
      setLoading(false);
    }
  };

  if (step === 'SETUP_AVATAR') {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-full w-full overflow-hidden text-zinc-200 font-sans selection:bg-white/20 p-4">
            <Starfield />
            <FloatingAstronauts />
            <div className="relative z-10 w-full max-w-[400px] glass-panel rounded-3xl p-8 flex flex-col items-center shadow-2xl animate-fade-in-up">
                <div className="flex flex-col items-center mb-8">
                    <WavingCreature />
                    <h1 className="text-3xl font-bold text-white tracking-tight">Identity</h1>
                    <p className="text-zinc-500 text-[10px] mt-2 font-bold tracking-[0.3em] uppercase">Required Setup</p>
                </div>
                <form onSubmit={handleSetupSubmit} className="w-full flex flex-col items-center space-y-6">
                    <div 
                        className="w-32 h-32 rounded-full bg-black border-2 border-dashed border-zinc-700 hover:border-white hover:bg-zinc-900 transition-all cursor-pointer relative overflow-hidden group shadow-xl"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {avatar ? <img src={avatar} alt="Preview" className="w-full h-full object-cover" /> : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 group-hover:text-zinc-400">
                                <Camera className="w-8 h-8 mb-2" />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Upload</span>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button type="submit" disabled={loading || !avatar} className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enter Glycon <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // Optimized Layout for Android/Mobile
  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-y-auto overflow-x-hidden text-zinc-200 font-sans py-4">
      <Starfield />
      <FloatingAstronauts />
      
      {/* Container is flex-col to allow buttons to sit below the card naturally */}
      <div className="relative w-full max-w-[400px] perspective-[1000px] z-10 px-4 my-auto shrink-0 flex flex-col gap-4">
         
         {/* The Flip Card Container - Using min-height instead of fixed height for Android safety */}
         <div className={`relative w-full h-[600px] min-h-[600px] transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
            
            {/* FRONT: LOGIN */}
            <div className={`absolute w-full h-full backface-hidden flex flex-col ${step === 'REGISTER' ? 'pointer-events-none opacity-0' : 'opacity-100'}`} style={{ backfaceVisibility: 'hidden' }}>
                <div className="glass-panel rounded-3xl flex-1 shadow-2xl overflow-hidden flex flex-col relative border border-white/10">
                    <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col items-center mb-4 mt-2 shrink-0">
                            <WavingCreature />
                            <h1 className="text-3xl font-bold text-white tracking-tight">Glycon</h1>
                            <p className="text-zinc-500 text-[10px] mt-2 font-bold tracking-[0.3em] uppercase">Secure</p>
                        </div>
                        {error && <div className="w-full mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded flex items-center gap-2 shrink-0"><AlertTriangle className="w-3 h-3"/>{error}</div>}
                        
                        <div className="w-full mb-6 text-center px-2 shrink-0">
                            <p className="text-xs text-zinc-400 italic leading-relaxed">Your choice of cheating<br/>Experience a non pasted, flawless & original experience</p>
                        </div>

                        <form onSubmit={handleAuthSubmit} className="w-full space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">username</label>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-white transition-all" placeholder="username" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Password</label>
                                <button type="button" onClick={() => handleAiHelp('Password')} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">{loadingTip ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />} AI Hint</button>
                                </div>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-white transition-all" placeholder="••••••••" />
                            </div>
                            {geminiTip && <div className="bg-purple-900/20 border border-purple-500/30 p-2 rounded text-[10px] text-purple-200 animate-fade-in">{geminiTip}</div>}
                            <button type="submit" disabled={loading} className="w-full h-12 mt-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-lg">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* BACK: REGISTER */}
            <div className={`absolute w-full h-full backface-hidden flex flex-col rotate-y-180 ${step === 'LOGIN' ? 'pointer-events-none opacity-0' : 'opacity-100'}`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="glass-panel rounded-3xl flex-1 shadow-2xl overflow-hidden flex flex-col relative border border-white/10">
                    <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col items-center mb-4 mt-2 shrink-0">
                            <WavingCreature />
                            <h1 className="text-2xl font-bold text-white tracking-tight">New Account</h1>
                            <p className="text-zinc-500 text-[10px] mt-1 font-bold tracking-[0.3em] uppercase">Join Network</p>
                        </div>
                        {error && <div className="w-full mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded flex items-center gap-2 shrink-0"><AlertTriangle className="w-3 h-3"/>{error}</div>}

                        <div className="w-full mb-4 text-center px-2 shrink-0">
                            <p className="text-xs text-zinc-400 italic leading-relaxed">"Forge a new identity. No trackers, just starlight.<br/>Privacy and cozy texting for the Glycon."</p>
                        </div>

                        <form onSubmit={handleAuthSubmit} className="w-full space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Username</label>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-white transition-all" placeholder="username" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Email (Optional)</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-white transition-all" placeholder="private contact" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Password</label>
                                <div className="relative">
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-white transition-all pr-20" placeholder="••••••••" />
                                    {password && (
                                        <button type="button" onClick={() => navigator.clipboard.writeText(password)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors border border-zinc-700">
                                            <Copy className="w-3 h-3" /> Copy
                                        </button>
                                    )}
                                </div>
                                <div className="w-full h-1 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full transition-all duration-500 ${passwordStrength <= 1 ? 'bg-red-500 w-[15%]' : passwordStrength <= 3 ? 'bg-yellow-500 w-[60%]' : 'bg-green-500 w-full'}`}></div>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-tight">
                                    {passwordStrength <= 3 ? (
                                        <>Not bad, but could be stronger. <button type="button" onClick={generateSecurePassword} className="text-zinc-300 underline hover:text-white cursor-pointer">Generate a password</button>.</>
                                    ) : (
                                        <span className="text-green-500">Secure password.</span>
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Confirm Password</label>
                                <button type="button" onClick={() => handleAiHelp('Security')} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">{loadingTip ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />} AI Hint</button>
                                </div>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-white transition-all" placeholder="••••••••" />
                            </div>
                            {geminiTip && <div className="bg-purple-900/20 border border-purple-500/30 p-2 rounded text-[10px] text-purple-200 animate-fade-in">{geminiTip}</div>}

                            <button type="submit" disabled={loading} className="w-full h-12 mt-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-lg">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

         </div>

         {/* Footer Separated from Glass Panel */}
         <div className="text-center shrink-0 h-10 pb-[env(safe-area-inset-bottom)]">
            <button type="button" onClick={toggleAuthMode} className="text-zinc-500 hover:text-white text-xs font-semibold tracking-wide py-2 px-4 hover:bg-zinc-900/50 rounded-full transition-colors">
                {step === 'LOGIN' ? 'Create new account' : 'Return to login'}
            </button>
         </div>

      </div>
    </div>
  );
};

export default Auth;
