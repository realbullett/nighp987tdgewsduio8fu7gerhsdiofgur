
import React, { useState, useEffect, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Download, MessageCircle, Mail, X, Sparkles } from 'lucide-react';
import Auth from './Auth';

const LOGO_URL = "https://64.media.tumblr.com/7ee65927e0b5b02e9cc7bf3b203621b0/27a3cd586cd5f69d-74/s500x750/51363d03483f52995b94f2eaff0aee0e00dff5ba.pnj";

interface WaterButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const WaterButton: React.FC<WaterButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
    props.onClick?.(e);
  };

  const baseStyles = "relative overflow-hidden transition-all duration-300 font-bold tracking-widest uppercase text-[11px] rounded-xl flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    secondary: "bg-[#0a0a0a] border border-[#1f1f1f] text-slate-400 hover:text-white hover:border-slate-500/50"
  };

  return (
    <button
      ref={buttonRef}
      className={`${baseStyles} ${variants[variant]} ${className || ''}`}
      onClick={createRipple}
      {...props}
    >
      <div className="relative z-10 flex items-center gap-2 pointer-events-none">
        {children}
      </div>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-purple-500/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '300px',
          }}
        />
      ))}
    </button>
  );
};

const LandingPage: React.FC<{ user: SupabaseUser | null, onLogout: () => void }> = ({ user, onLogout }) => {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#ededed] font-sans selection:bg-purple-500/30 selection:text-purple-200 flex flex-col items-center justify-center relative overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/5 blur-[100px] rounded-full mix-blend-screen animate-pulse-slow delay-1000"></div>
      </div>

      <main className="relative z-10 flex flex-col items-center max-w-2xl w-full px-6 animate-in fade-in zoom-in duration-700">

        {/* Status */}
        <div className="mb-10 animate-fade-in-down">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-md shadow-lg shadow-purple-900/10">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">version-1588a9c58c674e38</span>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-8 relative group cursor-pointer hover:scale-105 transition-transform duration-500">
          <div className="absolute inset-0 bg-purple-500/20 blur-[60px] rounded-full opacity-60 animate-pulse"></div>
          <img
            src={LOGO_URL}
            alt="Glycon"
            className="relative w-36 h-36 object-contain drop-shadow-2xl"
          />
        </div>

        {/* Headlines */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white drop-shadow-lg">
            GLYCON
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-light tracking-wide max-w-lg mx-auto leading-relaxed">
            The premium external solution. <br />
            <span className="text-slate-500 text-sm font-mono tracking-widest uppercase mt-2 block">The only utility that you'll ever need</span>
          </p>
        </div>

        {/* Interaction Area */}
        <div className="w-full max-w-xs space-y-4">

          <WaterButton
            className="w-full h-14"
            onClick={() => setShowAuth(true)}
          >
            <Download size={18} />
            DOWNLOAD CLIENT
          </WaterButton>

          <div className="grid grid-cols-2 gap-4">
            <a href="https://discord.gg/vC8fnP6vre" target="_blank" rel="noreferrer" className="block">
              <WaterButton variant="secondary" className="w-full h-12">
                <MessageCircle size={14} />
                DISCORD
              </WaterButton>
            </a>

            <a href="#contact" className="block">
              <WaterButton variant="secondary" className="w-full h-12">
                <Mail size={14} />
                CONTACT
              </WaterButton>
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center gap-3 text-[10px] text-slate-700 font-mono tracking-[0.2em] uppercase opacity-60">
          <Sparkles size={10} />
          <span>Copyright @ Glycon 2023</span>
        </div>

      </main>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm">
            <button
              onClick={() => setShowAuth(false)}
              className="absolute -top-12 right-0 text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-mono uppercase tracking-widest"
            >
              Close <X size={14} />
            </button>
            <div className="bg-[#050505] border border-[#1f1f1f] rounded-3xl p-1 shadow-2xl shadow-purple-900/20 ring-1 ring-white/5">
              <Auth />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 0.8s linear;
        }
        .animate-pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;
