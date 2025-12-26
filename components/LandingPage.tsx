import React, { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { Target, Activity, Eye, Zap, Settings, ChevronDown, Lock, Shield, Terminal, Cpu, Crosshair } from 'lucide-react';
import Scene from './Visual3D';
import Auth from './Auth';
import { User as SupabaseUser } from '@supabase/supabase-js';

const LOGO_URL = "https://media.discordapp.net/attachments/1324825706303197357/1453312744907477025/fav.png?ex=69504a37&is=694ef8b7&hm=75495ec0b3d3e9caf20d93f015613558ee165ea98d72e4ae1049f0dcba0505cf&=&format=webp&quality=lossless&width=375&height=375";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
  align?: 'left' | 'right';
}

const FeatureSection: React.FC<SectionProps> = ({ icon, title, description, items, align = 'left' }) => (
  <div className={`h-screen flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'} px-8 md:px-24`}>
    <div className="max-w-xl w-full bg-slate-900/60 backdrop-blur-2xl p-10 rounded-[2rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group hover:border-purple-500/40 transition-all duration-700 overflow-hidden">
      {/* Scanline sweep effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-[2000ms] ease-in-out pointer-events-none" />
      
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity duration-700">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 80 })}
      </div>
      
      <div className="space-y-6 relative z-10">
        <div className="inline-flex items-center space-x-2 bg-purple-600/20 px-4 py-1.5 rounded-full border border-purple-500/30">
            <div className="text-purple-400">{React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}</div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">Module_X_{title.substring(0,2).toUpperCase()}</span>
        </div>
        <h2 className="text-6xl font-black italic tracking-tighter text-white uppercase group-hover:tracking-normal transition-all duration-500 leading-none">{title}</h2>
        <p className="text-slate-400 text-lg leading-relaxed font-medium">{description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-3 text-slate-500 hover:text-white transition-colors cursor-default group/item">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600 group-hover/item:scale-150 group-hover/item:shadow-[0_0_8px_rgba(147,51,234,1)] transition-all" />
              <span className="font-mono text-[10px] uppercase tracking-widest">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const HUDOverlay = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      {/* Dynamic Cursor Reticle */}
      <div 
        className="fixed w-12 h-12 border-2 border-purple-500/40 rounded-full pointer-events-none z-[200] flex items-center justify-center transition-transform duration-100 ease-out hidden lg:flex"
        style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-1 h-1 bg-purple-500 rounded-full" />
        <div className="absolute w-full h-[1px] bg-purple-500/20" />
        <div className="absolute h-full w-[1px] bg-purple-500/20" />
        <div className="absolute -top-2 text-[6px] font-mono text-purple-400 uppercase tracking-widest">TRK_ON</div>
      </div>

      <div className="fixed inset-0 pointer-events-none z-[50] mix-blend-screen opacity-50">
        {/* Decorative Borders */}
        <div className="absolute inset-8 border border-white/5 rounded-3xl" />
        
        {/* Corners */}
        <div className="absolute top-12 left-12 w-32 h-32 border-l-4 border-t-4 border-purple-500 rounded-tl-2xl shadow-[-5px_-5px_20px_rgba(168,85,247,0.2)]" />
        <div className="absolute top-12 right-12 w-32 h-32 border-r-4 border-t-4 border-purple-500 rounded-tr-2xl shadow-[5px_-5px_20px_rgba(168,85,247,0.2)]" />
        
        {/* Floating Data */}
        <div className="absolute top-40 left-12 flex flex-col space-y-4 font-mono">
          <div className="flex items-center space-x-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <span className="text-[10px] text-white uppercase font-black tracking-widest">Signal: Stable</span>
          </div>
          <div className="space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-[8px] text-purple-400/60 leading-none">
                0x{Math.random().toString(16).substr(2, 8).toUpperCase()} -> CACHE_V{i}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-mono text-purple-500/30 uppercase tracking-[1em]">
          Glycon Tactical Interface v2.5.0
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes flicker {
          0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 1; filter: drop-shadow(0 0 15px rgba(168,85,247,0.8)); }
          20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.3; filter: none; }
        }
        @keyframes glitch {
          0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
          20% { clip-path: inset(92% 0 1% 0); transform: translate(1px, -3px); }
          40% { clip-path: inset(43% 0 1% 0); transform: translate(-1px, 2px); }
          60% { clip-path: inset(25% 0 58% 0); transform: translate(3px, 1px); }
          80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, -3px); }
          100% { clip-path: inset(58% 0 43% 0); transform: translate(1px, 2px); }
        }
      `}</style>
    </>
  );
};

const LandingPage: React.FC<{ user: SupabaseUser | null, onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="h-screen w-full bg-[#010409] overflow-hidden">
      <HUDOverlay />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] flex items-center justify-between px-12 py-10 pointer-events-none">
        <div className="flex items-center space-x-4 pointer-events-auto cursor-pointer group">
          <div className="w-14 h-14 overflow-hidden rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(147,51,234,0.4)] border-2 border-purple-500/50 group-hover:rotate-12 transition-all duration-500 bg-black">
            <img src={LOGO_URL} alt="Glycon Logo" className="w-full h-full object-cover p-1" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black italic tracking-tighter text-white leading-none group-hover:skew-x-12 transition-transform">GLYCON</span>
            <span className="text-[10px] font-bold tracking-[0.5em] text-purple-500 uppercase mt-1"></span>
          </div>
        </div>
        <div className="flex items-center space-x-12 pointer-events-auto bg-slate-900/40 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/5">
           <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">External Status</span>
                <span className="text-xs font-mono text-green-400">WORKING</span>
              </div>
              <ShieldCheck className="text-green-500 animate-pulse" size={20} />
           </div>
           <div className="h-8 w-px bg-white/10" />
           <div className="flex items-center space-x-4 group cursor-pointer">
              <Lock size={18} className="text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">ALPHA RELEASE</span>
           </div>
        </div>
      </nav>

      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <ScrollControls pages={7} damping={0.25}>
          <Scene />
          
          <Scroll html>
            <div className="w-screen">
              {/* HERO - Ultra Premium Readability */}
              <section className="h-screen flex items-center justify-start px-12 md:px-32 relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-[60%] bg-gradient-to-r from-[#010409] via-[#010409]/95 to-transparent pointer-events-none z-0" />
                
                <div className="relative z-10 w-full lg:w-3/5 space-y-10 animate-in fade-in slide-in-from-left-20 duration-1000">
                  <div className="inline-flex items-center gap-4 px-8 py-3 rounded-2xl bg-purple-900/20 border border-purple-500/40 text-purple-400 text-[10px] font-black uppercase tracking-[0.5em] backdrop-blur-2xl shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                    <Terminal size={16} />
                    WORKING
                  </div>
                  
                  <div className="relative group">
                    <h1 className="text-9xl md:text-[12rem] font-black italic tracking-tighter text-white uppercase leading-[0.75] drop-shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                      GLYCON
                    </h1>
                    <div className="text-8xl md:text-[9rem] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-purple-600 uppercase leading-[0.8] animate-[flicker_3s_infinite] select-none">
                      FREE
                    </div>
                    {/* Glitch layers */}
                    <span className="absolute top-0 left-0 text-9xl md:text-[12rem] font-black italic tracking-tighter text-purple-500 opacity-0 group-hover:opacity-20 group-hover:animate-[glitch_0.3s_infinite] pointer-events-none">GLYCON</span>
                    <span className="absolute top-0 left-0 text-9xl md:text-[12rem] font-black italic tracking-tighter text-cyan-500 opacity-0 group-hover:opacity-20 group-hover:animate-[glitch_0.4s_infinite] pointer-events-none translate-x-1">GLYCON</span>
                  </div>

                  <p className="text-slate-300 text-2xl font-medium max-w-xl leading-snug italic tracking-tight border-l-[6px] border-purple-600 pl-8 bg-purple-600/5 py-6 rounded-r-[2rem] shadow-xl">
                    The ONLY non-pasted external <br/>
                    <span className="text-white font-black uppercase tracking-[0.2em] text-sm not-italic mt-3 block bg-purple-600 w-fit px-3 py-1 rounded">Always Undetected & Always Untouchable</span>
                  </p>
                  
                  <div className="flex flex-col items-start space-y-12">
                    <div className="grid grid-cols-3 gap-16 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                        <div className="flex flex-col space-y-2">
                            <span className="text-white text-3xl font-mono tracking-tighter leading-none">$0.00</span>
                            <span className="opacity-50">PRICE</span>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <span className="text-white text-3xl font-mono tracking-tighter leading-none">UNDETECTED</span>
                            <span className="opacity-50">STATUS</span>
                        </div>
                        <div className="flex flex-col space-y-2">
                            <span className="text-white text-3xl font-mono tracking-tighter leading-none">99%</span>
                            <span className="opacity-50">STABILITY</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6 group cursor-pointer bg-white/5 hover:bg-white/10 transition-colors px-10 py-5 rounded-full border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400">Scroll Down</span>
                          <span className="text-[8px] font-mono text-slate-600">gay gay gay</span>
                        </div>
                        <ChevronDown className="group-hover:translate-y-2 transition-transform text-white" size={28} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Feature Sections - More Asymmetric and Premium */}
              <FeatureSection 
                icon={<Target />}
                title="Aim Engine"
                description="Hyper-precise vector tracing using native GDI rendering for near-zero performance impact and absolute smoothness."
                items={["Smoothness v3", "RCS Compensation", "FOV Boundary", "Hitbox Filter", "Target Lock"]}
                align="right"
              />

              <FeatureSection 
                icon={<Activity />}
                title="Intelligence"
                description="Advanced behavioral resolvers that adapt to target movement patterns in real-time, predicting positions up to 500ms ahead."
                items={["Prediction Suite", "Velocity Offset", "Ping Adjuster", "Netcode Bypass", "Data Logs"]}
                align="left"
              />

              <FeatureSection 
                icon={<Eye />}
                title="Tactical View"
                description="High-refresh external overlay that projects target data directly into your field of view without touching game memory."
                items={["Skeleton Overlay", "Health Bar 2D", "Radar 3D", "Tracer Lines", "Item Filter"]}
                align="right"
              />

              <FeatureSection 
                icon={<Zap />}
                title="Physics"
                description="Manipulate local character states to achieve impossible movement. Flight, speed, and clipping built for usermode reliability."
                items={["Infinite Flight", "Phase Shift", "Speed Multiplier", "Gravity Null", "Collision Byp"]}
                align="left"
              />

              {/* AUTH - Redesigned Access Node */}
              <section className="min-h-screen flex items-center justify-center bg-[#010409] relative py-32">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.1)_0%,transparent_70%)]" />
                
                <div className="w-full max-w-5xl px-8 flex flex-col lg:flex-row items-center gap-20 relative z-10">
                    <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-3 text-purple-500 font-mono text-xs font-bold uppercase tracking-widest bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20">
                            <Crosshair size={18} className="animate-spin" />
                            GET GLYCON TODAY!
                        </div>
                        <h2 className="text-8xl font-black italic text-white uppercase tracking-tighter leading-[0.8]">
                          GET<br/><span className="text-purple-600">GLYCON</span>
                        </h2>
                        <p className="text-slate-500 text-lg font-medium max-w-md mx-auto lg:mx-0">
                          Register a new account in order to download Glycon & stay connected, or login to your account
                        </p>
                    </div>
                    <div className="lg:w-1/2 w-full">
                      <Auth />
                    </div>
                </div>
              </section>

              <footer className="py-24 bg-black text-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                <div className="flex flex-col items-center space-y-6">
                  <div className="text-[12px] font-black uppercase tracking-[1.5em] text-slate-700">
                    GLYCON_SYSTEMS_GLOBAL
                  </div>
                  <div className="flex items-center gap-8 text-[9px] font-mono text-slate-600 uppercase">
                    <span>BUILD_STATE: PRODUCTION</span>
                    <span>ARCH: X64_NATIVE</span>
                    <span>LICENSE: OPEN_SOURCE</span>
                  </div>
                </div>
              </footer>
            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
};

const ShieldCheck = ({ size, className }: { size: number, className?: string }) => (
  <Shield size={size} className={className} />
);

export default LandingPage;