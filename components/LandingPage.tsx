
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { Target, Activity, Eye, Zap, Settings, ChevronDown, Lock } from 'lucide-react';
import Scene from './Visual3D';
import Auth from './Auth';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
  align?: 'left' | 'right';
}

const FeatureSection: React.FC<SectionProps> = ({ icon, title, description, items, align = 'left' }) => (
  <div className={`h-screen flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'} px-8 md:px-24`}>
    <div className="max-w-xl w-full bg-slate-900/20 backdrop-blur-xl p-10 rounded-3xl border border-white/5 shadow-2xl relative group hover:border-purple-500/20 transition-all duration-700">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 bg-purple-600/10 px-3 py-1 rounded-full border border-purple-500/20">
            <div className="text-purple-400">{React.cloneElement(icon as React.ReactElement<any>, { size: 14 })}</div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400/80">Module Authorized</span>
        </div>
        <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase">{title}</h2>
        <p className="text-slate-400 text-lg leading-relaxed">{description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-slate-500 hover:text-purple-300 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              <span className="font-mono text-xs">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LandingPage: React.FC<{ user: SupabaseUser | null, onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="h-screen w-full bg-slate-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] flex items-center justify-between px-8 py-6 pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto cursor-pointer">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center font-black italic shadow-[0_0_30px_rgba(147,51,234,0.4)]">G</div>
          <span className="text-xl font-black italic tracking-tighter text-white">GLYCON</span>
        </div>
        <div className="flex items-center space-x-6 pointer-events-auto">
           <div className="flex items-center space-x-2 text-slate-600 text-[10px] font-black uppercase tracking-widest">
              <Lock size={12} className="text-purple-500" />
              <span>ALPHA</span>
           </div>
        </div>
      </nav>

      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <ScrollControls pages={7} damping={0.15}>
          <Scene />
          
          <Scroll html>
            <div className="w-screen">
              {/* HERO - Section 1 */}
              <section className="h-screen flex flex-col items-center justify-center text-center px-4">
                <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-purple-900/20 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                    #1 Roblox External ($0)
                  </div>
                  <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-white uppercase leading-[0.8] mb-6">
                    GLYSON<br/><span className="text-purple-600">FREE</span>
                  </h1>
                  <p className="text-slate-400 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                    #1 Non-pasted External, Always undetected & always untouchable
                  </p>
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                    <div className="animate-bounce">
                        <ChevronDown className="text-slate-500" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">Scroll to Explore</span>
                  </div>
                </div>
              </section>

              {/* Feature Sections */}
              <FeatureSection 
                icon={<Target size={48} />}
                title="Aim Engine"
                description="Holographic vector tracking with native usermode smoothing. Zero kernel dependency, maximum precision."
                items={["Vector Smoothing", "Camera Lerp", "FOV Clamp", "Target Logic", "Prediction Sync"]}
                align="right"
              />

              <FeatureSection 
                icon={<Activity size={48} />}
                title="Intelligence"
                description="Real-time data resolvers that simulate kinetic movement patterns and project future target positions."
                items={["Kinetic Resolvers", "Velocity Prediction", "Ping Compensation", "Manipulation", "Misc"]}
                align="left"
              />

              <FeatureSection 
                icon={<Eye size={48} />}
                title="Tactical View"
                description="External overlay rendering with full skeletal ESP and situational radar mapping."
                items={["External Overlay", "Skeletal Mesh", "Radar Mapping", "Health Monitor", "Visual Presets"]}
                align="right"
              />

              <FeatureSection 
                icon={<Zap size={48} />}
                title="Physics"
                description="Bypass standard movement constraints with local state manipulation. Flight and speed utility built for usermode."
                items={["Linear Fly", "Noclip Engine", "Speed Scaling", "Jump Velocity", "Phase Snap"]}
                align="left"
              />

              <FeatureSection 
                icon={<Settings size={48} />}
                title="World"
                description="Complete environment control. Manipulate fog, gravity, and camera perspectives in real-time."
                items={["Gravity Tweak", "Time Scaling", "Camera FOV", "Atmosphere Blur", "Profile Sync"]}
                align="right"
              />

              {/* AUTH - Section 7 */}
              <section className="min-h-screen flex items-center justify-center bg-slate-950/80 backdrop-blur-xl relative">
                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                <div className="w-full max-w-4xl px-4 flex flex-col items-center py-20">
                    <div className="mb-12 text-center">
                        <h2 className="text-6xl font-black italic text-white uppercase tracking-tighter mb-4">GET GLYCON</h2>
                        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.4em] mb-4">Registration</p>
                    </div>
                    <div className="w-full">
                      <Auth />
                    </div>
                </div>
              </section>

              <footer className="py-12 bg-black text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-800">
                GLYCON_USERMODE_ENGINE // 2025 // SECURED
              </footer>
            </div>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
};

export default LandingPage;
