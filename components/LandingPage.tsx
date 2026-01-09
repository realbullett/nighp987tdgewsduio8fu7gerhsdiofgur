import React from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { Target, Activity, Eye, Zap, ChevronDown } from 'lucide-react';
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
    <div className="max-w-xl w-full bg-white/5 backdrop-blur-xl p-10 rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all duration-300">
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 text-purple-400">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
        </div>
        <h2 className="text-5xl font-bold text-white">{title}</h2>
        <p className="text-slate-300 text-lg leading-relaxed">{description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-white/10">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span className="text-sm">{item}</span>
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
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-8 md:px-16 py-6 bg-slate-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center">
            <img src={LOGO_URL} alt="Glycon Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold text-white">Glycon</span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-slate-400">
          <span>Status: Active</span>
        </div>
      </nav>

      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <ScrollControls pages={7} damping={0.25}>
          <Scene />
          
          <Scroll html>
            <div className="w-screen">
              {/* HERO */}
              <section className="h-screen flex items-center justify-start px-8 md:px-24 relative overflow-hidden pt-20">
                <div className="absolute left-0 top-0 h-full w-[60%] bg-gradient-to-r from-slate-950 via-slate-950/95 to-transparent pointer-events-none z-0" />
                
                <div className="relative z-10 w-full lg:w-2/3 space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span>Active</span>
                  </div>
                  
                  <h1 className="text-7xl md:text-9xl font-bold text-white leading-tight">
                    Glycon
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-slate-300 max-w-2xl leading-relaxed">
                    The only non-pasted external. Always undetected and always untouchable.
                  </p>
                  
                  <div className="flex items-center gap-8 pt-4">
                    <div className="flex flex-col">
                      <span className="text-2xl font-semibold text-white">Free</span>
                      <span className="text-sm text-slate-400">Price</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-semibold text-white">Undetected</span>
                      <span className="text-sm text-slate-400">Status</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl font-semibold text-white">99%</span>
                      <span className="text-sm text-slate-400">Stability</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-400 pt-8">
                    <span className="text-sm">Scroll to explore</span>
                    <ChevronDown className="animate-bounce" size={20} />
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

              {/* AUTH */}
              <section className="min-h-screen flex items-center justify-center bg-slate-950 relative py-32">
                <div className="w-full max-w-5xl px-8 flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
                        <h2 className="text-5xl md:text-6xl font-bold text-white">
                          Get Started
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md mx-auto lg:mx-0">
                          Register a new account to download Glycon and stay connected, or login to your existing account.
                        </p>
                        <p className="text-sm text-slate-500">
                          Need an access key? <a href="https://discord.gg/vC8fnP6vre" target="_blank" className="text-purple-400 hover:text-purple-300">Join our Discord</a>
                        </p>
                    </div>
                    <div className="lg:w-1/2 w-full">
                      <Auth />
                    </div>
                </div>
              </section>

              <footer className="py-16 bg-slate-900/50 text-center border-t border-white/5">
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-sm text-slate-500">
                    © 2025 Glycon. All rights reserved.
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

export default LandingPage;