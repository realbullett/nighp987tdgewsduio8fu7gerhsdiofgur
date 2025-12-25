
import React, { useEffect, useRef, ReactNode, useState } from 'react';
import { 
  Shield, Zap, Cpu, ArrowRight, ChevronDown, 
  Lock, Activity, Target, Eye, Settings, 
  Crosshair, Radar, Sun, Database, Code, Terminal, Layers, MousePointer2
} from 'lucide-react';
import { Starfield, FloatingAstronauts } from './Auth';

interface LandingPageProps {
  onEnter: () => void;
}

// --- High-Fidelity 3D Components ---

const FloatingLabel = ({ text, offsetZ = 50, className = "" }: { text: string, offsetZ?: number, className?: string }) => (
  <div 
    className={`absolute font-mono text-[9px] font-black uppercase tracking-[0.2em] bg-black/80 border border-white/10 px-2 py-1 backdrop-blur-md pointer-events-none ${className}`}
    style={{ transform: `translateZ(${offsetZ}px)` }}
  >
    {text}
  </div>
);

const AimbotModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d">
    <div className="absolute inset-0 flex items-center justify-center preserve-3d animate-spin-slow">
      <div className="w-64 h-64 border border-indigo-500/20 rounded-full"></div>
      <div className="absolute w-48 h-48 border border-indigo-500/40 rounded-full animate-ping"></div>
      <Target className="w-20 h-20 text-white absolute drop-shadow-[0_0_20px_white]" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
       {[0, 90, 180, 270].map(deg => (
         <div key={deg} className="absolute w-[1px] h-40 bg-indigo-500/30" style={{ transform: `rotateZ(${deg}deg) translateY(-80px)` }}></div>
       ))}
    </div>
    <FloatingLabel text="AIM_LOCK: ENGAGED" className="top-0 left-0 text-indigo-400" offsetZ={100} />
  </div>
);

const TriggerbotModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-32 h-32 border-4 border-white/10 rounded-full flex items-center justify-center animate-pulse">
        <MousePointer2 className="w-12 h-12 text-white animate-bounce" />
      </div>
      <div className="absolute w-64 h-[1px] bg-red-500/50 animate-pulse"></div>
      <div className="absolute h-64 w-[1px] bg-red-500/50 animate-pulse"></div>
    </div>
    <FloatingLabel text="TRIGGER_DELAY: 0ms" className="bottom-0 right-0 text-red-400" offsetZ={80} />
  </div>
);

const VisualsModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d">
    <div className="absolute inset-12 border-2 border-emerald-500/40 bg-emerald-500/5 preserve-3d animate-float">
      <div className="absolute inset-0 border border-emerald-400/20" style={{ transform: 'translateZ(-30px)' }}></div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_emerald]"></div>
        <div className="w-[1px] h-16 bg-emerald-400/50"></div>
      </div>
      <FloatingLabel text="SKELETON_MAPPING" className="top-[-20px] left-0 text-emerald-400" offsetZ={60} />
    </div>
  </div>
);

const RadarModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d flex items-center justify-center">
    <div className="w-64 h-64 border border-indigo-500/20 rounded-full relative">
       <div className="absolute inset-0 border-t-2 border-indigo-500/60 rounded-full animate-spin"></div>
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Radar className="w-12 h-12 text-indigo-500/40" />
       </div>
       <div className="absolute top-10 right-10 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
       <div className="absolute bottom-12 left-8 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
    </div>
    <FloatingLabel text="INTEL_SWEEP: ACTIVE" className="top-0 right-0" offsetZ={50} />
  </div>
);

const PhysicsModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d flex items-center justify-center">
    <div className="relative w-1 h-64 bg-gradient-to-b from-transparent via-white to-transparent">
        <div className="absolute top-0 w-8 h-8 bg-white/20 blur-xl rounded-full -translate-x-1/2"></div>
        <Zap className="w-16 h-16 text-white absolute -translate-x-1/2 top-1/2 animate-bounce" />
    </div>
    <div className="absolute w-48 h-48 border border-dashed border-white/10 rounded-full animate-spin-slow"></div>
    <FloatingLabel text="VELOCITY_BYPASS" className="bottom-0 left-0 text-indigo-400" offsetZ={90} />
  </div>
);

const EngineModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d flex items-center justify-center">
    <div className="w-48 h-48 border-8 border-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md">
       <Sun className="w-20 h-20 text-white/20 animate-spin-slow" />
    </div>
    <FloatingLabel text="ENGINE_OVERRIDE_V1" className="top-[-20px] right-[-20px]" offsetZ={40} />
  </div>
);

const SecureModule3D = ({ progress }: { progress: number }) => (
  <div className="relative w-full h-full preserve-3d flex items-center justify-center">
    <div className="w-40 h-40 bg-white/5 border border-white/10 relative preserve-3d animate-spin-slow">
       <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-16 h-16 text-white" />
       </div>
       {[0, 1, 2, 3].map(i => (
         <div key={i} className="absolute w-2 h-2 bg-indigo-500 shadow-[0_0_10px_indigo]" style={{ transform: `rotateY(${i*90}deg) translateZ(100px)` }}></div>
       ))}
    </div>
    <FloatingLabel text="ENCRYPTED_VAULT" className="top-0 left-0 text-emerald-400" offsetZ={100} />
  </div>
);

const FeatureTag = ({ text }: { text: string }) => (
  <div className="group relative px-2 py-1.5 bg-zinc-900/40 border border-zinc-800 rounded-md overflow-hidden hover:border-indigo-500/50 transition-all">
    <div className="absolute inset-0 bg-indigo-500/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
    <span className="relative text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">{text}</span>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollY / height);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stages = [
    { id: 'aimbot', start: 0.1, end: 0.2 },
    { id: 'trigger', start: 0.2, end: 0.3 },
    { id: 'visuals', start: 0.3, end: 0.42 },
    { id: 'radar', start: 0.42, end: 0.54 },
    { id: 'physics', start: 0.54, end: 0.66 },
    { id: 'engine', start: 0.66, end: 0.78 },
    { id: 'secure', start: 0.78, end: 0.9 },
  ];

  const currentStage = stages.find(s => scrollProgress >= s.start && scrollProgress <= s.end)?.id || 
                      (scrollProgress > 0.9 ? 'secure' : (scrollProgress > 0.1 ? 'aimbot' : 'none'));

  const is3DActive = scrollProgress > 0.05;

  return (
    <div className="relative min-h-[900vh] w-full bg-black text-zinc-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes spin-slow { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotateX(5deg); } 50% { transform: translateY(-20px) rotateX(10deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .mask-gradient { mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent); }
      `}</style>
      
      <Starfield />
      <FloatingAstronauts />

      {/* --- HERO SECTION --- */}
      <section className="relative z-20 flex flex-col items-center justify-center h-screen px-4 text-center sticky top-0 bg-transparent">
        <div className={`transition-all duration-1000 transform ${scrollProgress < 0.05 ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none translate-y-[-100px]'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.5em] mb-8">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Undetected & Always Untouchable
            </div>
            <h1 className="text-8xl md:text-[13rem] font-black text-white tracking-tighter mb-4 italic leading-none">
                GLYCON <span className="text-indigo-600 block md:inline">FREE.</span>
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm font-bold tracking-[0.8em] uppercase mb-20 max-w-4xl mx-auto leading-relaxed">
                The Pinnacle of Roblox Cheating • No Keys • No Cost
            </p>
            
            <button 
                onClick={onEnter}
                className="group relative px-20 py-7 bg-white text-black font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_80px_rgba(255,255,255,0.15)]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                <span className="relative flex items-center gap-4 text-xl tracking-tighter uppercase italic">
                    Sign Up <ArrowRight className="w-7 h-7" />
                </span>
            </button>
        </div>

        {scrollProgress < 0.05 && (
            <div className="absolute bottom-16 animate-bounce flex flex-col items-center gap-4 opacity-40">
                <span className="text-[9px] font-black tracking-[0.8em] uppercase text-white">Scroll</span>
                <ChevronDown className="w-6 h-6 text-white" />
            </div>
        )}
      </section>

      {/* --- PERSISTENT 3D SHOWCASE STAGE --- */}
      <div className={`fixed inset-0 z-10 flex items-center justify-center pointer-events-none transition-all duration-700 ${is3DActive && scrollProgress < 0.95 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="relative w-80 h-80 md:w-[600px] md:h-[600px] preserve-3d" 
               style={{ 
                 transform: `rotateY(${scrollProgress * -360}deg) rotateX(15deg)`,
               }}>
              
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'aimbot' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`}>
                  <AimbotModule3D progress={scrollProgress} />
              </div>
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'trigger' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`} style={{ transform: 'rotateY(90deg)' }}>
                  <TriggerbotModule3D progress={scrollProgress} />
              </div>
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'visuals' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`} style={{ transform: 'rotateY(180deg)' }}>
                  <VisualsModule3D progress={scrollProgress} />
              </div>
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'radar' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`} style={{ transform: 'rotateY(270deg)' }}>
                  <RadarModule3D progress={scrollProgress} />
              </div>
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'physics' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`}>
                  <PhysicsModule3D progress={scrollProgress} />
              </div>
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'engine' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`} style={{ transform: 'rotateY(90deg)' }}>
                  <EngineModule3D progress={scrollProgress} />
              </div>
              <div className={`absolute inset-0 transition-all duration-1000 ${currentStage === 'secure' ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-xl'}`} style={{ transform: 'rotateY(180deg)' }}>
                  <SecureModule3D progress={scrollProgress} />
              </div>
          </div>
          <div className="absolute inset-0 mask-gradient opacity-10 pointer-events-none">
             <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(to right, #312e81 1px, transparent 1px), linear-gradient(to bottom, #312e81 1px, transparent 1px)', backgroundSize: '60px 60px', transform: 'rotateX(60deg) translateY(200px)' }}></div>
          </div>
      </div>

      {/* --- SCROLL-SYNCED CONTENT OVERLAYS --- */}
      <div className="relative z-30">
          <div className="h-screen pointer-events-none"></div>

          <section className="h-screen flex items-center px-10 md:px-40">
             <div className={`max-w-xl transition-all duration-1000 ${currentStage === 'aimbot' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    <Crosshair className="w-5 h-5" /> 01 // Lethal Accuracy
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">Precision<br/><span className="text-zinc-600">Engine.</span></h2>
                <div className="grid grid-cols-2 gap-2">
                    {["Aimbot System", "Smoothness Logic", "FOV Scaling", "Hold-to-Aim", "Velocity Pred", "Bone Targeting", "Aim Jitter", "Team Filter"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          <section className="h-screen flex items-center justify-end px-10 md:px-40">
             <div className={`max-w-xl text-right transition-all duration-1000 ${currentStage === 'trigger' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center justify-end gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    02 // Instant Response <Target className="w-5 h-5" />
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">Trigger<br/><span className="text-zinc-600">Logic.</span></h2>
                <div className="grid grid-cols-2 gap-2 justify-items-end">
                    {["Auto Shooting", "Universal Logic", "Hit Detection", "Shot Delay", "Keybind Support", "Game Independent", "Team Check", "Head Priority"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          <section className="h-screen flex items-center px-10 md:px-40">
             <div className={`max-w-xl transition-all duration-1000 ${currentStage === 'visuals' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    <Eye className="w-5 h-5" /> 03 // Perception Matrix
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">Omni<br/><span className="text-zinc-600">Vision.</span></h2>
                <div className="grid grid-cols-2 gap-2">
                    {["Skeleton ESP", "3D Wireframes", "Health Bars", "View Direction", "Snaplines", "Offscreen Icons", "Distance View", "Name Tags"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          <section className="h-screen flex items-center justify-end px-10 md:px-40">
             <div className={`max-w-xl text-right transition-all duration-1000 ${currentStage === 'radar' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center justify-end gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    04 // Tactical Intel <Radar className="w-5 h-5" />
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">Radar<br/><span className="text-zinc-600">System.</span></h2>
                <div className="grid grid-cols-2 gap-2 justify-items-end">
                    {["2D Overlay", "Detection Range", "Marker Indent", "Pulsing Effect", "Center Marker", "Adjustable Size", "Enemy Marking", "Radar Toggle"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          <section className="h-screen flex items-center px-10 md:px-40">
             <div className={`max-w-xl transition-all duration-1000 ${currentStage === 'physics' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    <Zap className="w-5 h-5" /> 05 // Kinetic Overload
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">Physical<br/><span className="text-zinc-600">Bypass.</span></h2>
                <div className="grid grid-cols-2 gap-2">
                    {["WalkSpeed Mod", "JumpPower Mod", "Infinite Jump", "CFrame Flying", "Orbit Around", "Teleportation", "Spectate Mode", "Noclip Utility"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          <section className="h-screen flex items-center justify-end px-10 md:px-40">
             <div className={`max-w-xl text-right transition-all duration-1000 ${currentStage === 'engine' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center justify-end gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    06 // Environment Shift <Sun className="w-5 h-5" />
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">World<br/><span className="text-zinc-600">Manipulator.</span></h2>
                <div className="grid grid-cols-2 gap-2 justify-items-end">
                    {["Camera FOV", "Fog Override", "Gravity Scale", "Time of Day", "Ambient Light", "Menu Toggle", "Insert Switch", "ImGui UI"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          <section className="h-screen flex items-center px-10 md:px-40">
             <div className={`max-w-xl transition-all duration-1000 ${currentStage === 'secure' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20 pointer-events-none'}`}>
                <div className="flex items-center gap-3 text-indigo-400 mb-6 font-black uppercase tracking-[0.4em] text-[10px]">
                    <Shield className="w-5 h-5" /> 07 // Data Integrity
                </div>
                <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic">Secure<br/><span className="text-zinc-600">Backend.</span></h2>
                <div className="grid grid-cols-2 gap-2">
                    {["JSON Configs", "Multi Profiles", "Process Cloak", "Mem-Read Core", "Cache Refresh", "Auto-Load", "Tamper Guard", "Stealth Polling"].map(f => <FeatureTag key={f} text={f} />)}
                </div>
             </div>
          </section>

          {/* FINAL CTA SECTION */}
          <section className="h-screen flex flex-col items-center justify-center text-center px-6 sticky top-0 bg-black">
              <div className={`transition-all duration-1000 ${scrollProgress > 0.9 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-20 pointer-events-none'}`}>
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-12 animate-pulse mx-auto">
                      <Lock className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-8xl md:text-[10rem] font-black text-white mb-8 tracking-tighter italic leading-none">
                    ASCEND NOW.
                  </h2>
                  <p className="text-zinc-500 text-xl mb-16 max-w-3xl mx-auto font-medium tracking-tight">
                      Glycon FREE represents the final boundary of external performance. 
                      No donations. No registration keys. Just pure technical supremacy.
                  </p>
                  <button 
                    onClick={onEnter}
                    className="group px-32 py-10 bg-indigo-600 text-white font-black rounded-full hover:bg-white hover:text-black transition-all hover:scale-110 active:scale-95 shadow-[0_0_100px_rgba(79,70,229,0.5)] uppercase tracking-tighter italic text-2xl"
                  >
                      INITIALIZE ACCESS
                  </button>
                  
                  <div className="mt-24 flex gap-16 justify-center opacity-30">
                     <Layers className="w-10 h-10" />
                     <Code className="w-10 h-10" />
                     <Terminal className="w-10 h-10" />
                     <Database className="w-10 h-10" />
                  </div>
              </div>
          </section>
      </div>

      <footer className="relative z-40 py-24 border-t border-zinc-900 bg-black text-center">
          <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[1em] mb-6">
              Copyright Glycon @ 2025
          </p>
      </footer>
    </div>
  );
};

export default LandingPage;
