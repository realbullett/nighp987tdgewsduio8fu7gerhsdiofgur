

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { User, ChatRoom, ChatMessage, UserProfile, MessageContent, Attachment, UserStatus, ForumCategory, ForumThread, ForumPost, ReplyContext } from '../types';
import { 
  getMessages, saveMessageToDB, prepareMessagePayload, getMyChats, getWelcomeChat,
  getUserProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
  createGroupChat, updateAvatar, updateProfile, decryptMessage, resizeImage, detectLinks,
  getDMChatId, updateGroupAvatar, addMessageReaction, deleteMessage, updateMessage, subscribeToGlobalMessages,
  getProfiles, updateGroupDescription, leaveGroup, addGroupMembers, fetchTenorGifs, TenorGif, supabase, fetchChatDetails, subscribeToPresence,
  markChatRead, fetchReadStates, getForumCategories, getForumThreads, getForumPosts, createForumThread, createForumPost, getAllForumThreads, incrementThreadView
} from '../utils';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  Send, LogOut, MessageSquare, Users, Hash, 
  UserPlus, Menu, Info, X, Check, Camera, Paperclip, 
  Image as ImageIcon, ExternalLink, Settings, Link as LinkIcon, Moon, Sparkles, Loader2,
  ChevronLeft, Plus, Smile, MoreVertical, Trash, Lock, Edit2, Copy, File, Download, UserMinus, Mail,
  Search, Clapperboard, Flame, Gamepad2, Coffee, BookOpen, Music, ChevronRight, Circle, AlertTriangle, Filter, Globe, Cpu, ArrowLeft,
  GraduationCap, Library, Eye, Tag, Calendar, Snowflake, Shield, Zap, Ghost, Radio, Reply, CornerUpRight
} from 'lucide-react';

interface ChatProps {
  user: User;
  onLogout: () => void;
}

const OFFICIAL_CHAT_ID = 'group_official_night';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];
const MORE_EMOJIS = ['👋', '🙌', '👀', '💯', '💩', '🤡', '🤮', '💀', '👻', '👽', '🤖', '👾', '🎃', '😺', '🙈', '💢', '💥', '💫', '💦', '💤', '🎉', '🎈', '🎂', '🎄', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'];
const GIF_CATEGORIES = ['Trending', 'Happy', 'Sad', 'LOL', 'Love', 'Angry', 'Anime', 'Meme', 'Confused', 'Wow', 'Party'];

// Custom Twitter-Style Verified Badge
const VerifiedIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <g>
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

const StatusIndicator = ({ status, className, showInvisible }: { status: UserStatus, className?: string, showInvisible?: boolean }) => {
    let colorClass = 'bg-zinc-700'; // Default for offline
    
    // Updated to Blue/Purple theme for Online
    if (status === 'online') colorClass = 'bg-indigo-500';
    else if (status === 'idle') colorClass = 'bg-yellow-500';
    else if (status === 'dnd') colorClass = 'bg-red-500';
    else if (status === 'invisible') colorClass = 'bg-zinc-500';

    if (status === 'invisible' && !showInvisible) return null;

    return (
        <div className={`rounded-full border-2 border-black ${colorClass} ${className} z-10`} title={status}>
           {status === 'idle' && <div className="absolute top-0 left-0 w-2 h-2 bg-black rounded-full -ml-0.5 -mt-0.5"></div>}
           {status === 'dnd' && <div className="w-full h-0.5 bg-black absolute top-1/2 left-0 -translate-y-1/2"></div>}
        </div>
    );
};

// --- Holiday Components ---

const Snowfall = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
  
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      
      const snowflakes: { x: number; y: number; r: number; d: number }[] = [];
      const MAX_FLAKES = 50; 
      
      for (let i = 0; i < MAX_FLAKES; i++) {
        snowflakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2 + 1,
          d: Math.random() * MAX_FLAKES
        });
      }
  
      const handleResize = () => {
        width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      };
  
      window.addEventListener('resize', handleResize);
      let animationFrameId: number;
      let angle = 0;

      const animate = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        
        angle += 0.01;
        
        for (let i = 0; i < MAX_FLAKES; i++) {
            const f = snowflakes[i];
            // Movement
            f.y += Math.pow(f.d, 2) + 1;
            f.x += Math.sin(angle) * 2;

            // Reset if out of view
            if (f.y > height) {
                snowflakes[i] = { x: Math.random() * width, y: 0, r: f.r, d: f.d };
            }

            ctx.moveTo(f.x, f.y);
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
        }
        ctx.fill();
        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
      };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};

const SwayingTree = () => (
    <div className="absolute -bottom-2 -right-2 text-6xl opacity-20 group-hover:opacity-60 transition-opacity animate-sway pointer-events-none select-none filter blur-[1px]">
        🎄
    </div>
);

// --- 3D Sleeping Creature Component ---
const SleepingCreature = () => {
  return (
    <div className="flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="relative w-40 h-40 animate-float">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full animate-pulse-slow"></div>
        
        {/* Main Body (Sphere) */}
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-[inset_-10px_-10px_20px_rgba(0,0,0,1),inset_5px_5px_15px_rgba(255,255,255,0.05)] border border-white/5 overflow-hidden">
             
             {/* Face Container - Breathing animation */}
             <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-breathe">
                {/* Eyes */}
                <div className="flex gap-6 mt-4">
                    <div className="w-8 h-4 border-b-[3px] border-zinc-500 rounded-full opacity-60"></div>
                    <div className="w-8 h-4 border-b-[3px] border-zinc-500 rounded-full opacity-60"></div>
                </div>
                {/* Mouth */}
                <div className="w-2 h-2 bg-zinc-600 rounded-full opacity-40"></div>
             </div>

             {/* Texture/Noise */}
             <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
        </div>

        {/* Zzz Particles */}
        <div className="absolute -top-6 right-0">
             <span className="absolute text-2xl font-bold text-zinc-600 animate-zzz-1">Z</span>
             <span className="absolute text-xl font-bold text-zinc-700 animate-zzz-2" style={{ top: '-15px', right: '-15px' }}>z</span>
             <span className="absolute text-lg font-bold text-zinc-800 animate-zzz-3" style={{ top: '-30px', right: '-5px' }}>z</span>
        </div>
      </div>

      <style>{`
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
        }
        @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
        }
        @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.1); }
        }
        @keyframes zzz-1 {
            0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
            20% { opacity: 1; }
            80% { opacity: 0; transform: translate(15px, -30px) scale(1.2); }
            100% { opacity: 0; }
        }
        @keyframes zzz-2 {
            0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
            40% { opacity: 1; }
            90% { opacity: 0; transform: translate(20px, -40px) scale(1.2); }
            100% { opacity: 0; }
        }
        @keyframes zzz-3 {
            0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
            50% { opacity: 1; }
            100% { opacity: 0; transform: translate(10px, -50px) scale(1.2); }
            100% { opacity: 0; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 5s ease-in-out infinite; }
        .animate-zzz-1 { animation: zzz-1 3s infinite; }
        .animate-zzz-2 { animation: zzz-2 3s infinite 0.5s; }
        .animate-zzz-3 { animation: zzz-3 3s infinite 1s; }
      `}</style>
    </div>
  );
};

// --- System Standby / Info Component ---
const SystemStandby = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative z-10 px-6 overflow-y-auto">
            <SleepingCreature />
            
            <div className="mt-8 text-center max-w-lg">
                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">System Standby</h2>
                <div className="flex items-center justify-center gap-2 mb-8">
                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                     <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Encrypted Feed Offline</p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/50 transition-colors">
                        <Shield className="w-6 h-6 text-indigo-400 mb-3" />
                        <h3 className="text-white text-xs font-bold uppercase mb-1">Secure Core</h3>
                        <p className="text-zinc-500 text-[10px] leading-relaxed">
                            End-to-End Encryption (AES-GCM) ensures your messages remain readable only by you and the recipient.
                        </p>
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/50 transition-colors">
                         <Ghost className="w-6 h-6 text-zinc-400 mb-3" />
                         <h3 className="text-white text-xs font-bold uppercase mb-1">Zero Trace</h3>
                         <p className="text-zinc-500 text-[10px] leading-relaxed">
                            Ephemeral architecture. No persistent tracking logs. Your digital footprint dissolves into the void.
                         </p>
                    </div>

                    <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/50 transition-colors">
                         <Zap className="w-6 h-6 text-yellow-500 mb-3" />
                         <h3 className="text-white text-xs font-bold uppercase mb-1">Realtime</h3>
                         <p className="text-zinc-500 text-[10px] leading-relaxed">
                            Instant delivery via websocket channels with active presence monitoring and read receipts.
                         </p>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-6 text-[10px] text-zinc-600 font-mono">
                    <div className="flex items-center gap-2">
                        <Radio className="w-3 h-3" />
                        <span>v2.4.0 (Noir)</span>
                    </div>
                    <span>•</span>
                    <div>LATENCY: 12ms</div>
                    <span>•</span>
                    <div>REGION: US-EAST</div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const OnboardingModal = ({ onCreateOwn, onTemplate, onSkip }: { onCreateOwn: () => void, onTemplate: (name: string, desc: string) => void, onSkip: () => void }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
            <div className="w-full max-w-lg bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col md:flex-row relative">
                <button onClick={onSkip} className="absolute top-4 right-4 text-zinc-600 hover:text-white z-20"><X className="w-5 h-5"/></button>
                <div className="w-full md:w-1/3 bg-zinc-900/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    <div className="relative z-10 transform scale-75 md:scale-90">
                        <SleepingCreature />
                    </div>
                </div>
                <div className="flex-1 p-6 md:p-8 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-2 text-center md:text-left">Create Your First Haunt</h2>
                    <p className="text-zinc-500 text-xs mb-6 text-center md:text-left">Your space to lurk, chat, and vibe with others. Make it yours.</p>
                    <button onClick={onCreateOwn} className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between group transition-all mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black border border-zinc-700 flex items-center justify-center"><Plus className="w-5 h-5 text-zinc-300" /></div>
                            <span className="font-bold text-sm text-zinc-200 group-hover:text-white">Create My Own</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white" />
                    </button>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Start from a template</div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        <button onClick={() => onTemplate("Gaming Lounge", "A place for late night raids and ranked matches.")} className="w-full p-2 rounded-lg hover:bg-zinc-900 flex items-center gap-3 group transition-colors text-left"><Gamepad2 className="w-8 h-8 p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg" /><span className="text-sm font-medium text-zinc-400 group-hover:text-white">Gaming</span></button>
                        <button onClick={() => onTemplate("Late Night Chill", "Vibes, music, and quiet company.")} className="w-full p-2 rounded-lg hover:bg-zinc-900 flex items-center gap-3 group transition-colors text-left"><Coffee className="w-8 h-8 p-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg" /><span className="text-sm font-medium text-zinc-400 group-hover:text-white">Friends & Chill</span></button>
                    </div>
                    <div className="mt-auto pt-4 text-center"><button onClick={onSkip} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-bold">Skip for now</button></div>
                </div>
            </div>
        </div>
    );
};

const GifPicker = ({ onSelect, onClose }: { onSelect: (url: string) => void, onClose: () => void }) => {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<TenorGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Trending');
    const [nextCursor, setNextCursor] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => { const timer = setTimeout(() => { loadGifs(search || (activeCategory === 'Trending' ? '' : activeCategory), true); }, 500); return () => clearTimeout(timer); }, [search, activeCategory]);
    const loadGifs = async (query: string, reset: boolean = false) => {
        if (loading) return;
        setLoading(true);
        const pos = reset ? '' : nextCursor;
        const response = await fetchTenorGifs(query === 'Trending' ? '' : query, 20, pos);
        if (reset) setGifs(response.results); else setGifs(prev => [...prev, ...response.results]);
        setNextCursor(response.next);
        setLoading(false);
    };
    const handleScroll = () => { if (containerRef.current) { const { scrollTop, scrollHeight, clientHeight } = containerRef.current; if (scrollTop + clientHeight >= scrollHeight - 100 && nextCursor && !loading) { loadGifs(search || (activeCategory === 'Trending' ? '' : activeCategory), false); } } };
    return (
        <div className="absolute bottom-full right-0 mb-2 w-[350px] max-w-[95vw] bg-black border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col h-[400px] animate-scale-in">
            <div className="p-3 border-b border-zinc-900 bg-zinc-950">
                <div className="relative mb-3"><Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" /><input value={search} onChange={e => { setSearch(e.target.value); if(e.target.value) setActiveCategory('Search'); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-700 outline-none" placeholder="Search Tenor GIFs..." autoFocus /></div>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">{GIF_CATEGORIES.map(cat => (<button key={cat} onClick={() => { setActiveCategory(cat); setSearch(''); setNextCursor(''); }} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${activeCategory === cat && !search ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>{cat === 'Trending' && <Flame className="w-3 h-3 inline mr-1" />}{cat}</button>))}</div>
            </div>
            <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-black"><div className="grid grid-cols-2 gap-2">{gifs.map(gif => (<div key={gif.id} onClick={() => onSelect(gif.url)} className="cursor-pointer rounded overflow-hidden bg-zinc-900 relative group aspect-video hover:ring-2 hover:ring-white transition-all"><img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div></div>))}</div>{loading && <div className="flex items-center justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-zinc-700" /></div>}{!loading && gifs.length === 0 && <div className="text-center text-zinc-600 text-xs py-10">No GIFs found.</div>}</div>
            <div className="p-2 border-t border-zinc-900 bg-zinc-950 flex justify-between items-center text-[10px] text-zinc-500"><span>Via Tenor</span><button onClick={onClose} className="hover:text-white">Close</button></div>
        </div>
    );
};

interface MessageBubbleProps {
  msg: ChatMessage;
  isMe: boolean;
  senderProfile?: UserProfile;
  chatId: string;
  onReact: (id: string, emoji: string) => void;
  isGroup: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onProfileClick: (username: string) => void;
  onReply: (msg: ChatMessage) => void;
  onForward: (msg: ChatMessage) => void;
  isSequence: boolean;
  isLastInSequence: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  msg, isMe, senderProfile, chatId, onReact, isGroup, onDelete, onEdit, onProfileClick, onReply, onForward, isSequence, isLastInSequence
}) => {
  let content: MessageContent = { text: msg.content };
  try {
    const parsed = JSON.parse(msg.content);
    if (typeof parsed === 'object' && parsed !== null) content = parsed;
  } catch (e) {}
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content.text);
  const [showPicker, setShowPicker] = useState(false);
  const links = detectLinks(content.text);
  const hasReactions = content.reactions && Object.keys(content.reactions).length > 0;
  const handleSaveEdit = () => { onEdit(msg.id, editText); setIsEditing(false); };
  
  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start items-start'} ${isSequence ? 'mt-0.5' : 'mt-6'} ${hasReactions ? 'mb-2' : ''} group animate-fade-in-up relative`}>
      {!isMe && (
         <div className="w-8 h-8 mr-3 flex-shrink-0 pt-0 items-start"> 
            {!isSequence && (
              <div onClick={() => onProfileClick(msg.sender)} className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden cursor-pointer relative hover:scale-105 transition-transform items-start" title={msg.sender}>
                {senderProfile?.avatar ? <img src={senderProfile.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{msg.sender[0].toUpperCase()}</div>}
              </div>
            )}
         </div>
      )}
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && !isSequence && (<div className="flex items-center gap-2 mb-1 ml-1"><span onClick={() => onProfileClick(msg.sender)} className="text-[12px] font-bold text-white hover:underline cursor-pointer flex items-center gap-1">{msg.sender}{msg.sender === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}</span></div>)}
        <div className={`relative p-3 shadow-sm transition-all group/bubble ${isMe ? `bg-indigo-700/80 text-zinc-100 ${isSequence ? (isLastInSequence ? 'rounded-tr-md rounded-br-2xl rounded-l-2xl' : 'rounded-tr-md rounded-br-sm rounded-l-2xl') : (isLastInSequence ? 'rounded-2xl rounded-br-2xl' : 'rounded-2xl rounded-br-sm')}` : `bg-zinc-950 text-zinc-200 border border-zinc-800 shadow-[0_0_10px_rgba(0,0,0,0.2)] ${isSequence ? (isLastInSequence ? 'rounded-tl-md rounded-bl-2xl rounded-r-2xl' : 'rounded-tl-md rounded-bl-sm rounded-r-2xl') : (isLastInSequence ? 'rounded-2xl rounded-bl-2xl' : 'rounded-2xl rounded-bl-sm')}`}`}>
          <div className={`absolute -top-4 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10 md:flex hidden`}>
             <div className="bg-zinc-950 border border-zinc-800 rounded-full flex p-1 shadow-lg relative">
               {REACTION_EMOJIS.map(emoji => (<button key={emoji} onClick={() => onReact(msg.id, emoji)} className="hover:scale-125 transition-transform px-1 text-sm">{emoji}</button>))}
               <button onClick={() => setShowPicker(!showPicker)} className="hover:scale-125 transition-transform px-1 text-sm text-zinc-400 hover:text-white"><Plus className="w-3 h-3" /></button>
               {showPicker && (<div className="absolute top-full mt-2 left-0 w-64 bg-black border border-zinc-800 rounded-lg shadow-xl p-2 grid grid-cols-8 gap-1 z-50">{MORE_EMOJIS.map(e => (<button key={e} onClick={() => { onReact(msg.id, e); setShowPicker(false); }} className="text-sm hover:bg-zinc-800 rounded p-1">{e}</button>))}</div>)}
             </div>
             <div className="bg-zinc-950 border border-zinc-800 rounded-full flex p-1 shadow-lg gap-1">
                <button onClick={() => onReply(msg)} className="p-1 text-zinc-400 hover:text-white" title="Reply"><Reply className="w-3 h-3" /></button>
                <button onClick={() => onForward(msg)} className="p-1 text-zinc-400 hover:text-white" title="Forward"><CornerUpRight className="w-3 h-3" /></button>
                {isMe && (<><button onClick={() => setIsEditing(true)} className="p-1 text-zinc-400 hover:text-white"><Edit2 className="w-3 h-3" /></button><button onClick={() => onDelete(msg.id)} className="p-1 text-zinc-400 hover:text-red-500"><Trash className="w-3 h-3" /></button></>)}
             </div>
          </div>
          
          {/* Forward Label */}
          {content.isForwarded && (
             <div className="flex items-center gap-1 mb-1 text-[10px] text-zinc-500 italic">
                 <CornerUpRight className="w-3 h-3" /> Forwarded
             </div>
          )}

          {/* Reply Context */}
          {content.replyTo && (
              <div className="mb-2 pl-2 border-l-2 border-indigo-500/50 rounded-r bg-zinc-900/30 p-1 text-xs">
                 <div className="font-bold text-indigo-400 mb-0.5">{content.replyTo.sender}</div>
                 <div className="text-zinc-400 line-clamp-1">{content.replyTo.text}</div>
              </div>
          )}

          {content.attachments && content.attachments.map((att, idx) => (
            <div key={idx} className="mb-2">
              {att.type === 'image' ? (<div className="rounded-lg overflow-hidden border border-black/5 bg-black/5"><img src={att.url} alt="attachment" className="max-w-full max-h-[300px] object-cover block" /></div>) : (<div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors"><div className="p-2 bg-zinc-800 rounded text-zinc-400"><File className="w-5 h-5"/></div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-zinc-200 truncate">{att.name || "File Attachment"}</div><div className="text-xs text-zinc-500">{att.size ? Math.round(att.size/1024) + ' KB' : 'Binary File'}</div></div><a href={att.url} download={att.name || "download"} className="p-2 text-zinc-400 hover:text-white"><Download className="w-4 h-4" /></a></div>)}
            </div>
          ))}
          {isEditing ? (<div className="flex flex-col gap-2 min-w-[200px]"><textarea value={editText} onChange={e => setEditText(e.target.value)} className="bg-black/50 text-white p-2 rounded text-sm border border-zinc-700 w-full" rows={2}/><div className="flex justify-end gap-2"><button onClick={() => setIsEditing(false)} className="text-xs text-zinc-400">Cancel</button><button onClick={handleSaveEdit} className="text-xs text-blue-400 font-bold">Save</button></div></div>) : (content.text && <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{content.text}</div>)}
          {links.length > 0 && !isEditing && links.map((link, i) => { const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(link); return (<a key={i} href={link} target="_blank" rel="noopener noreferrer" className={`block mt-2 rounded-lg overflow-hidden border transition-all ${isMe ? 'border-zinc-700 bg-zinc-900/20' : 'border-zinc-800 bg-black/50'}`}>{isImage ? (<div className="w-full bg-zinc-900 flex items-center justify-center overflow-hidden"><img src={link} className="w-full h-auto max-h-[300px] object-cover opacity-90 hover:opacity-100 transition-opacity" /></div>) : (<div className="p-2 flex items-center gap-2 text-xs text-blue-400"><LinkIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate underline">{link}</span></div>)}</a>);})}
          {hasReactions && (<div className={`absolute -bottom-3 ${isMe ? 'left-[-10px]' : 'right-[-10px]'} flex gap-1 flex-wrap z-20`}>{Object.entries(content.reactions!).map(([emoji, users]) => (<div key={emoji} className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20 ${users.length > 0 ? 'flex' : 'hidden'} ${isMe ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`} title={users.join(', ')} onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); }}><span>{emoji}</span><span className="font-bold">{users.length}</span></div>))}</div>)}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isMe ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
          {isLastInSequence ? (<div className={`text-[9px] opacity-50 font-medium flex items-center gap-1`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<button onClick={() => setShowPicker(!showPicker)} className="md:hidden text-zinc-500 hover:text-white p-2 -my-2"><Smile className="w-3 h-3" /></button></div>) : (<button onClick={() => setShowPicker(!showPicker)} className="md:hidden text-zinc-500 hover:text-white p-2 -my-2 opacity-50"><Smile className="w-3 h-3" /></button>)}
          {showPicker && (<div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setShowPicker(false)}><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-[90%] max-w-[320px] shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}><div className="text-center mb-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">React</div><div className="grid grid-cols-6 gap-3 mb-6">{REACTION_EMOJIS.map(emoji => (<button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowPicker(false); }} className="text-3xl hover:bg-zinc-800 p-2 rounded-xl transition-colors flex items-center justify-center bg-black/50 border border-zinc-800/50">{emoji}</button>))}</div><div className="h-px bg-zinc-800 my-4"></div><div className="grid grid-cols-8 gap-2 h-48 overflow-y-auto custom-scrollbar p-1">{MORE_EMOJIS.map(e => (<button key={e} onClick={() => { onReact(msg.id, e); setShowPicker(false); }} className="text-xl hover:bg-zinc-800 rounded-lg p-2 flex items-center justify-center">{e}</button>))}</div><div className="mt-4 flex gap-3 pt-4 border-t border-zinc-800"><button onClick={() => { onReply(msg); setShowPicker(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 rounded-xl text-sm font-bold text-white hover:bg-zinc-700 transition-colors"><Reply className="w-4 h-4"/> Reply</button><button onClick={() => { onForward(msg); setShowPicker(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 rounded-xl text-sm font-bold text-white hover:bg-zinc-700 transition-colors"><CornerUpRight className="w-4 h-4"/> Forward</button></div>{isMe && (<div className="mt-2 flex gap-3 pt-2 border-t border-zinc-800"><button onClick={() => { setIsEditing(true); setShowPicker(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 rounded-xl text-sm font-bold text-white hover:bg-zinc-700 transition-colors"><Edit2 className="w-4 h-4"/> Edit</button><button onClick={() => { onDelete(msg.id); setShowPicker(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors"><Trash className="w-4 h-4"/> Delete</button></div>)}</div></div>)}
        </div>
      </div>
    </div>
  );
};

// ... (MiniProfile - Unchanged)
const MiniProfile = ({ username, initialData, onClose, onMessage, status }: { username: string, initialData?: UserProfile, onClose: () => void, onMessage: (user: string) => void, status: UserStatus }) => {
    const [profile, setProfile] = useState<UserProfile | null>(initialData || null);
    useEffect(() => { getUserProfile(username).then(p => { if (p) setProfile(p); }); }, [username]);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
            <div className="w-full max-w-[340px] bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="h-28 bg-zinc-900 w-full relative">
                    {profile?.banner ? <img src={profile.banner} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black relative"><div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div></div>}
                    <button onClick={onClose} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black"><X className="w-4 h-4"/></button>
                </div>
                <div className="px-6 pb-6 pt-0 relative">
                    <div className="flex justify-between items-end -mt-10 mb-3 relative z-10">
                         <div className="relative w-20 h-20">
                            <div className="w-full h-full rounded-full bg-black border-4 border-black overflow-hidden relative">
                                {profile?.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 font-bold text-xl">{username[0].toUpperCase()}</div>}
                            </div>
                            <StatusIndicator status={status} className="absolute bottom-1 right-1 w-5 h-5 border-4 border-black" />
                        </div>
                        <button onClick={() => onMessage(username)} className="mb-1 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-1 shadow-lg"><MessageSquare className="w-3 h-3" /> Message</button>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-white flex items-center gap-1.5">{username}{username === 'night' && <VerifiedIcon className="w-5 h-5 text-[#1d9bf0]" />}</h3>
                        <span className="text-zinc-500 text-xs font-mono mb-2">ID: {profile?.id?.slice(0,8)}</span>
                        {profile?.show_email && profile?.public_email && (<div className="flex items-center gap-2 mb-3 text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50"><Mail className="w-3 h-3" /><span className="truncate">{profile.public_email}</span></div>)}
                        {profile?.bio ? (<p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>) : (<p className="text-sm text-zinc-600 italic">No bio available.</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... (ChannelInfoContent - Unchanged)
const ChannelInfoContent = ({ activeChat, user, profilesCache, groupLogoRef, handleGroupLogoUpload, setMiniProfileUser, onUpdateDescription, myFriends, onAddMembers, onlineUsers }: { activeChat: ChatRoom; user: User; profilesCache: Record<string, UserProfile>; groupLogoRef: React.RefObject<HTMLInputElement>; handleGroupLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; setMiniProfileUser: (user: string | null) => void; onUpdateDescription: (desc: string) => void; myFriends: string[]; onAddMembers: (members: string[]) => void; onlineUsers: Record<string, UserStatus>; }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(activeChat.description || '');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  useEffect(() => { setEditDesc(activeChat.description || ''); setIsEditing(false); setShowAddMemberModal(false); setSelectedToAdd([]); }, [activeChat.id]);
  const handleSave = () => { onUpdateDescription(editDesc); setIsEditing(false); };
  const handleAddSubmit = () => { onAddMembers(selectedToAdd); setShowAddMemberModal(false); setSelectedToAdd([]); };
  const isAdmin = activeChat.type === 'group' && (activeChat.admins?.includes(user.username) || user.username === 'night');
  const eligibleFriends = (myFriends || []).filter((f: string) => !activeChat.participants.includes(f));
  const onlineParticipants = activeChat.participants.filter((p: string) => { const s = onlineUsers[p]; return s === 'online' || s === 'idle' || s === 'dnd'; }).sort();
  const offlineParticipants = activeChat.participants.filter((p: string) => { const s = onlineUsers[p]; return !s || s === 'offline' || s === 'invisible'; }).sort();
  const renderParticipant = (p: string) => { const status = onlineUsers?.[p] || 'offline'; return (<div key={p} className="flex items-center gap-3 mb-2 p-2 hover:bg-zinc-900/50 rounded-lg cursor-pointer group transition-colors" onClick={() => setMiniProfileUser(p)}><div className="relative w-8 h-8 shrink-0"><div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 overflow-hidden">{profilesCache[p]?.avatar ? <img src={profilesCache[p].avatar} className="w-full h-full object-cover"/> : p[0].toUpperCase()}</div><StatusIndicator status={status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" /></div><div className="text-sm text-zinc-300 truncate font-medium flex items-center gap-1">{p} {p === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}</div></div>); };
  return (
    <>
       <div className="h-16 flex items-center px-6 font-bold text-white text-lg border-b border-zinc-900/50">{activeChat.type === 'dm' ? 'User Info' : 'Group Info'}</div>
       <div className="p-6 flex flex-col items-center border-b border-zinc-900/50 relative bg-black">
          <div className="w-28 h-28 rounded-full bg-zinc-900 mb-4 border-4 border-black ring-1 ring-zinc-800 flex items-center justify-center overflow-hidden relative group shadow-2xl">
             {activeChat.type === 'group' ? (activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : <Hash className="w-12 h-12 text-zinc-600" />) : (<img src={profilesCache[activeChat.participants.find((p: string) => p !== user.username)||'']?.avatar} className="w-full h-full object-cover"/>)}
             {activeChat.type === 'group' && isAdmin && (<><div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="w-8 h-8 text-white" /></div><input type="file" ref={groupLogoRef} onChange={handleGroupLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" /></>)}
          </div>
          <h3 className="font-bold text-white text-2xl text-center leading-tight mb-2 tracking-tight">{activeChat.name}</h3>
          {activeChat.type === 'group' && (<div className="w-full mt-2 text-center">{isEditing ? (<div className="flex flex-col gap-2 animate-fade-in"><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 outline-none resize-none focus:border-zinc-700" placeholder="Add a description..." rows={3}/><div className="flex justify-center gap-2"><button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white">Cancel</button><button onClick={handleSave} className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200">Save</button></div></div>) : (<div className="relative group/desc"><p className="text-sm text-zinc-500 leading-relaxed px-2">{activeChat.description || <span className="italic opacity-50">No description</span>}</p>{isAdmin && (<button onClick={() => { setEditDesc(activeChat.description || ''); setIsEditing(true); }} className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 flex items-center justify-center gap-1 w-full opacity-0 group-hover/desc:opacity-100 transition-opacity"><Edit2 className="w-3 h-3" /> Edit Description</button>)}</div>)}</div>)}
          {activeChat.id === OFFICIAL_CHAT_ID && <span className="text-blue-400 text-xs mt-3 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" /> Verified</span>}
       </div>
       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black">
          <div className="flex items-center justify-between mb-4"><div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Members</div>{isAdmin && activeChat.type === 'group' && (<button onClick={() => setShowAddMemberModal(true)} className="p-1 text-zinc-500 hover:text-white bg-zinc-900 rounded hover:bg-zinc-800 transition-colors" title="Add Members"><UserPlus className="w-3 h-3" /></button>)}</div>
          {onlineParticipants.length > 0 && (<div className="mb-4"><div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Online — {onlineParticipants.length}</div>{onlineParticipants.map(renderParticipant)}</div>)}
          {offlineParticipants.length > 0 && (<div className="mb-4"><div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Offline — {offlineParticipants.length}</div>{offlineParticipants.map(renderParticipant)}</div>)}
       </div>
       {showAddMemberModal && (<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowAddMemberModal(false)}><div className="bg-black border border-zinc-800 rounded-2xl p-6 w-full max-w-sm animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}><h3 className="text-white font-bold mb-4 uppercase text-xs">Add Participants</h3>{eligibleFriends.length === 0 ? (<div className="text-center text-zinc-500 text-sm py-4">All your friends are already here!</div>) : (<div className="max-h-48 overflow-y-auto mb-4 bg-zinc-950 rounded-xl p-2 border border-zinc-900 custom-scrollbar">{eligibleFriends.map((f: string) => (<label key={f} className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded cursor-pointer"><input type="checkbox" className="accent-white" checked={selectedToAdd.includes(f)} onChange={e => e.target.checked ? setSelectedToAdd(p => [...p, f]) : setSelectedToAdd(p => p.filter(x => x !== f))} /><span className="text-zinc-300 text-sm font-medium">{f}</span></label>))}</div>)}<div className="flex justify-end gap-2"><button onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 text-zinc-500 text-xs font-bold hover:text-white">Cancel</button>{eligibleFriends.length > 0 && (<button onClick={handleAddSubmit} disabled={selectedToAdd.length === 0} className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold disabled:opacity-50">Add</button>)}</div></div></div>)}
    </>
  );
};

// --- Forward Modal ---
const ForwardModal = ({ onClose, onSend, chats, profilesCache, currentUser }: { onClose: () => void, onSend: (selectedChatIds: string[]) => void, chats: ChatRoom[], profilesCache: Record<string, UserProfile>, currentUser: User }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    
    const filteredChats = chats.filter(chat => {
        let name = chat.name;
        if (chat.type === 'dm') {
            const other = chat.participants.find(p => p !== currentUser.username);
            if (other) name = other;
        }
        return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4" onClick={onClose}>
            <div className="bg-black border border-zinc-800 rounded-3xl p-0 w-full max-w-md animate-scale-in shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-900 bg-zinc-950">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold uppercase text-xs flex items-center gap-2 tracking-widest">
                            <CornerUpRight className="w-4 h-4 text-indigo-500"/> Forward Message
                        </h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                        <input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search people or groups..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500/50 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-black p-2 custom-scrollbar">
                    {filteredChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-zinc-600 gap-2">
                             <Search className="w-8 h-8 opacity-20"/>
                             <span className="text-xs">No chats found</span>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredChats.map(chat => {
                                let displayName = chat.name;
                                let avatar = chat.avatar;
                                let isVerified = false;
                                
                                if (chat.type === 'dm') {
                                     const other = chat.participants.find(p => p !== currentUser.username) || 'Unknown';
                                     displayName = other;
                                     avatar = profilesCache[other]?.avatar;
                                     if (other === 'night') isVerified = true;
                                } else if (chat.id === OFFICIAL_CHAT_ID) {
                                    isVerified = true;
                                }

                                const isSelected = selected.includes(chat.id);

                                return (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => setSelected(prev => prev.includes(chat.id) ? prev.filter(id => id !== chat.id) : [...prev, chat.id])} 
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-900/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'hover:bg-zinc-900 border-transparent'}`}
                                    >
                                        <div className="relative w-10 h-10">
                                             <div className={`w-full h-full rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center border ${isSelected ? 'border-indigo-500/30' : 'border-zinc-800'}`}>
                                                {avatar ? (
                                                    <img src={avatar} className="w-full h-full object-cover" />
                                                ) : (
                                                    chat.type === 'group' ? <Users className="w-5 h-5 text-zinc-500"/> : <span className="text-sm font-bold text-zinc-500">{displayName[0]?.toUpperCase()}</span>
                                                )}
                                             </div>
                                             {isSelected && (
                                                 <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-0.5 border-2 border-black animate-scale-in">
                                                     <Check className="w-3 h-3" />
                                                 </div>
                                             )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-zinc-200 font-bold truncate flex items-center gap-1">
                                                {displayName}
                                                {isVerified && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                                            </div>
                                            <div className="text-xs text-zinc-500 truncate">
                                                {chat.type === 'group' ? `${chat.participants.length} members` : 'Direct Message'}
                                            </div>
                                        </div>
                                        
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-700'}`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex justify-between items-center">
                    <div className="text-xs text-zinc-500 font-medium">
                        {selected.length === 0 ? 'Select chats' : `${selected.length} selected`}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-zinc-500 text-xs font-bold hover:text-white transition-colors">Cancel</button>
                        <button 
                            onClick={() => onSend(selected)} 
                            disabled={selected.length === 0} 
                            className="px-6 py-2 bg-white text-black rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 flex items-center gap-2"
                        >
                            Send <Send className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'alert';
}

const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const Dashboard: React.FC<ChatProps> = ({ user, onLogout }) => {
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesCache, setMessagesCache] = useState<Record<string, ChatMessage[]>>({});

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null); // NEW: Reply State
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null); // NEW: Forward State

  const [myChats, setMyChats] = useState<ChatRoom[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [profilesCache, setProfilesCache] = useState<Record<string, UserProfile>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'groups'>('all');
  const [viewMode, setViewMode] = useState<'chats' | 'forums'>('chats'); 

  // Forum State
  const [forumCategories, setForumCategories] = useState<ForumCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<ForumCategory | null>(null);
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [allForumThreads, setAllForumThreads] = useState<ForumThread[]>([]); 
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  
  // Advanced Forum Creation State
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadTags, setNewThreadTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [newThreadBanner, setNewThreadBanner] = useState('');
  const [newThreadAttachments, setNewThreadAttachments] = useState<Attachment[]>([]);
  
  // Forum Rich Input State
  const [forumInputText, setForumInputText] = useState('');
  const [forumAttachments, setForumAttachments] = useState<Attachment[]>([]);
  const [showForumEmoji, setShowForumEmoji] = useState(false);
  const [showForumGif, setShowForumGif] = useState(false);


  // UI States
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [miniProfileUser, setMiniProfileUser] = useState<string | null>(null);
  const [closedChatIds, setClosedChatIds] = useState<Set<string>>(new Set());
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true); 
  
  // Presence State
  const [userStatus, setUserStatus] = useState<UserStatus>('online');
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>({});
  const presenceRef = useRef<{ updateStatus: (s: UserStatus) => Promise<void> } | null>(null);
  
  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State
  const [settingsBanner, setSettingsBanner] = useState('');
  const [settingsAvatar, setSettingsAvatar] = useState('');
  const [settingsBio, setSettingsBio] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsShowEmail, setSettingsShowEmail] = useState(false);

  const [addFriendInput, setAddFriendInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState(''); 
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const forumFileInputRef = useRef<HTMLInputElement>(null);
  const groupLogoRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const forumTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const createThreadFileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const forumEndRef = useRef<HTMLDivElement>(null);

  // Contacts Cache
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfile>>({});

  // Refs for Global Subscriptions (prevents stale closure issues)
  const activeChatIdRef = useRef<string | null>(null);
  const myChatsRef = useRef<ChatRoom[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeChannelRef = useRef<RealtimeChannel | null>(null);
  const myProfileRef = useRef<UserProfile | null>(null);
  
  // Forum Refs
  const activeCategoryRef = useRef<string | null>(null);
  const activeThreadRef = useRef<string | null>(null);

  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);
  useEffect(() => { activeCategoryRef.current = activeCategory?.id || null; }, [activeCategory]);
  useEffect(() => { activeThreadRef.current = activeThread?.id || null; }, [activeThread]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
     const id = Date.now();
     setToasts(prev => [...prev, { id, message, type }]);
     setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
     const presence = subscribeToPresence(user.username, (users) => { setOnlineUsers(users); });
     presenceRef.current = presence;
     return () => { presence.unsubscribe(); };
  }, [user.username]);

  const handleChangeStatus = (status: UserStatus) => { setUserStatus(status); presenceRef.current?.updateStatus(status); setShowStatusMenu(false); };
  
  const refreshData = async () => {
    const [profile, chats] = await Promise.all([getUserProfile(user.username), getMyChats(user.username)]);
    setMyProfile(profile);
    setMyChats(chats);
    const participants = new Set<string>();
    chats.forEach(c => c.participants.forEach(p => participants.add(p)));
    if (profile?.friends) profile.friends.forEach(f => participants.add(f));
    if (profile?.incomingRequests) profile.incomingRequests.forEach(f => participants.add(f));
    if (participants.size > 0) { getProfiles(Array.from(participants)).then(p => { setProfilesCache(prev => ({...prev, ...p})); setFriendProfiles(p); }); }
  };

  useEffect(() => {
    const init = async () => {
      const closed = localStorage.getItem('night_closed_chats');
      if (closed) setClosedChatIds(new Set(JSON.parse(closed)));
      if (Notification.permission === 'default') await Notification.requestPermission();
      
      const [profile, welcome, chats, categories] = await Promise.all([
          getUserProfile(user.username), 
          getWelcomeChat(), 
          getMyChats(user.username),
          getForumCategories()
      ]);
      const sortedChats = chats.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
      setMyChats(sortedChats);
      setMyProfile(profile);
      setForumCategories(categories);
      
      // Initial Load of recent threads for dashboard
      getAllForumThreads().then(setAllForumThreads);
      
      try {
          const reads = await fetchReadStates(user.username);
          const counts: Record<string, number> = {};
          sortedChats.forEach(chat => {
              const lastRead = reads[chat.id] || 0;
              const lastMsgTime = chat.lastMessage?.timestamp || 0;
              if (lastMsgTime > lastRead + 1000) { counts[chat.id] = 1; }
          });
          setUnreadCounts(counts);
      } catch(e) { console.error(e); }

      const onboardingKey = `night_onboarding_completed_${user.username}`;
      const hasCompletedOnboarding = localStorage.getItem(onboardingKey);
      if (!hasCompletedOnboarding) { setShowOnboarding(true); }
      
      if (profile) { setSettingsAvatar(profile.avatar); setSettingsBanner(profile.banner || ''); setSettingsBio(profile.bio || ''); setSettingsEmail(profile.public_email || ''); setSettingsShowEmail(profile.show_email || false); }
      const allUsers = new Set<string>();
      chats.forEach(c => c.participants.forEach(p => allUsers.add(p)));
      if (profile?.friends) profile.friends.forEach(f => allUsers.add(f));
      if (profile?.incomingRequests) profile.incomingRequests.forEach(r => allUsers.add(r));
      if (allUsers.size > 0) { const profiles = await getProfiles(Array.from(allUsers)); setProfilesCache(profiles); setFriendProfiles(profiles); }
      setLoadingInitial(false);
    };
    init();
  }, [user.username]);

  // OPTIMIZED CHAT SWITCHING
  useEffect(() => {
     if (activeChat) {
         setReplyingTo(null); // Clear reply when switching
         const chatId = activeChat.id;
         if (messagesCache[chatId]) {
             setMessages(messagesCache[chatId]);
         } else {
             setMessages([]); 
         }
         getMessages(chatId).then(msgs => {
             setMessagesCache(prev => ({ ...prev, [chatId]: msgs }));
             if (activeChatIdRef.current === chatId) {
                 setMessages(msgs);
             }
         });
         getProfiles(activeChat.participants).then(profiles => { setProfilesCache(prev => ({ ...prev, ...profiles })); });
         setUnreadCounts(prev => ({ ...prev, [activeChat.id]: 0 }));
         markChatRead(activeChat.id, user.username, activeChat.lastMessage?.timestamp || 0);
     }
  }, [activeChat?.id]); 

  useEffect(() => { activeChatIdRef.current = activeChat?.id || null; }, [activeChat]);
  useEffect(() => { myChatsRef.current = myChats; }, [myChats]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Forum Data Fetching
  useEffect(() => {
      if (activeCategory) {
          getForumThreads(activeCategory.id).then(setForumThreads);
          setActiveThread(null);
      }
  }, [activeCategory]);

  useEffect(() => {
      if (activeThread) {
          incrementThreadView(activeThread.id);
          getForumPosts(activeThread.id).then(posts => {
              const authors = new Set(posts.map(p => p.author));
              authors.add(activeThread.author);
              const missing = Array.from(authors).filter(a => !profilesCache[a]);
              if (missing.length > 0) {
                  getProfiles(missing).then(p => setProfilesCache(prev => ({...prev, ...p})));
              }
              setForumPosts(posts);
          });
      }
  }, [activeThread]);
  
  useLayoutEffect(() => {
      if (activeThread) {
        forumEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }
  }, [forumPosts, activeThread?.id]);


  useEffect(() => {
     if (!activeChat) return;
     const channelId = `room:${activeChat.id}`;
     const channel = supabase.channel(channelId);
     channel.on('broadcast', { event: 'message' }, async (event: any) => {
          const payload = event.payload;
          if (messagesRef.current.some(m => m.id === payload.id)) { return; }
          let contentStr = '';
          try { contentStr = await decryptMessage(payload.iv, payload.content, activeChat.id); } catch(e) { console.error("Broadcast Decrypt Fail", e); }
          const newMsg: ChatMessage = { id: payload.id, sender: payload.sender, content: contentStr, timestamp: new Date(payload.created_at).getTime() };
          
          setMessages(prev => { 
             if (prev.some(m => m.id === newMsg.id)) return prev; 
             return [...prev, newMsg]; 
          });
          setMessagesCache(prev => ({
             ...prev,
             [activeChat.id]: [...(prev[activeChat.id] || []), newMsg]
          }));

          markChatRead(activeChat.id, user.username, newMsg.timestamp);
          setMyChats(prevChats => { const updated = prevChats.map(c => c.id === activeChat.id ? { ...c, lastMessage: newMsg } : c); return updated.sort((a, b) => ((b.lastMessage?.timestamp as number) || 0) - ((a.lastMessage?.timestamp as number) || 0)); });
          try { audioRef.current.play().catch(() => {}); } catch(e){}
       }).subscribe();
     activeChannelRef.current = channel;
     return () => { supabase.removeChannel(channel); activeChannelRef.current = null; };
  }, [activeChat?.id]);

  useEffect(() => {
    const handleMessageEvent = async (payload: any) => {
       const eventType = payload.eventType;
       const newRecord = payload.new;
       const oldRecord = payload.old;
       if (eventType === 'INSERT') {
          const chatId = newRecord.chat_id;
          const belongsToMyChat = myChatsRef.current.some(c => c.id === chatId);
          if (belongsToMyChat) {
             let contentStr = ''; try { contentStr = await decryptMessage(newRecord.iv, newRecord.content, chatId); } catch(e) { }
             const newMessageObj: ChatMessage = { id: newRecord.id, sender: newRecord.sender, content: contentStr, timestamp: new Date(newRecord.created_at).getTime() };
             
             setMessagesCache(prev => ({
                ...prev,
                [chatId]: [...(prev[chatId] || []), newMessageObj]
             }));

             if (activeChatIdRef.current === chatId) {
                 setMessages(prev => { if (prev.some(m => m.id === newMessageObj.id)) return prev; return [...prev, newMessageObj]; });
                 markChatRead(chatId, user.username, newMessageObj.timestamp);
             } else {
                setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
                try { audioRef.current.play().catch(() => {}); } catch(e){}
             }
             setMyChats(prevChats => {
                 const updatedChats = prevChats.map(chat => { if (chat.id === chatId) { if (!chat.lastMessage || (newMessageObj.timestamp as number) >= (chat.lastMessage.timestamp as number)) { return { ...chat, lastMessage: newMessageObj }; } } return chat; });
                 return updatedChats.sort((a, b) => { const tA = a.lastMessage?.timestamp || 0; const tB = b.lastMessage?.timestamp || 0; return tB - tA; });
             });
          } else {
              const newChat = await fetchChatDetails(chatId);
              if (newChat && newChat.participants.includes(user.username)) {
                  let contentStr = 'Encrypted Message'; try { contentStr = await decryptMessage(newRecord.iv, newRecord.content, chatId); } catch {}
                  const msg = { id: newRecord.id, sender: newRecord.sender, content: contentStr, timestamp: new Date(newRecord.created_at).getTime() };
                  const chatWithMsg = { ...newChat, lastMessage: msg };
                  setMyChats(prev => [chatWithMsg, ...prev]);
                  setUnreadCounts(prev => ({ ...prev, [chatId]: 1 }));
                  try { audioRef.current.play().catch(() => {}); } catch(e){}
              }
          }
       }
       if (eventType === 'UPDATE') { const chatId = newRecord.chat_id; if (activeChatIdRef.current === chatId) { try { const contentStr = await decryptMessage(newRecord.iv, newRecord.content, chatId); setMessages(prev => prev.map(m => m.id === newRecord.id ? { ...m, content: contentStr } : m)); } catch(e) {} } }
       if (eventType === 'DELETE') { if (activeChatIdRef.current) { setMessages(prev => prev.filter(m => m.id !== oldRecord.id)); } }
    };
    
    const handleChatEvent = async (payload: any) => {
       const eventType = payload.eventType;
       const newRecord = payload.new;
       if (eventType === 'INSERT') { if (newRecord.participants.includes(user.username)) { if (!myChatsRef.current.some(c => c.id === newRecord.id)) { setMyChats(prev => [newRecord, ...prev]); addToast(`Added to ${newRecord.name || 'a new chat'}`, 'info'); } } }
       if (eventType === 'UPDATE') {
           const updatedChat = newRecord as ChatRoom;
           if (updatedChat.participants.includes(user.username)) {
               setMyChats(prev => { const mapped = prev.map(c => c.id === updatedChat.id ? { ...c, ...updatedChat, lastMessage: c.lastMessage } : c); return mapped.sort((a,b) => (b.lastMessage?.timestamp||0) - (a.lastMessage?.timestamp||0)); });
               if (activeChatIdRef.current === updatedChat.id) { setActiveChat(prev => prev ? { ...prev, ...updatedChat } : null); }
               const newMembers = updatedChat.participants.filter(p => !Object.keys(profilesCache).includes(p));
               if (newMembers.length > 0) { getProfiles(newMembers).then(p => setProfilesCache(prev => ({...prev, ...p}))); }
           }
       }
    };
    const handleFriendEvent = async (payload: any) => {
        const eventType = payload.eventType;
        const newRecord = payload.new;
        const oldRecord = payload.old;
        if (eventType === 'INSERT') {
            if (newRecord.receiver === user.username) {
                setMyProfile(prev => prev ? { ...prev, incomingRequests: [...prev.incomingRequests, newRecord.sender] } : null);
                const profiles = await getProfiles([newRecord.sender]);
                setFriendProfiles(prev => ({...prev, ...profiles}));
                addToast(`New friend request from ${newRecord.sender}`, 'info');
                try { audioRef.current.play().catch(() => {}); } catch(e){}
            }
        }
        if (eventType === 'UPDATE') {
            if (newRecord.status === 'accepted') {
                const friendName = newRecord.sender === user.username ? newRecord.receiver : newRecord.sender;
                setMyProfile(prev => { if (!prev) return null; if (prev.friends.includes(friendName)) return prev; return { ...prev, friends: [...prev.friends, friendName] }; });
                setMyProfile(prev => { if (!prev) return null; return { ...prev, incomingRequests: prev.incomingRequests.filter(r => r !== friendName), outgoingRequests: prev.outgoingRequests.filter(r => r !== friendName) }; });
                const profiles = await getProfiles([friendName]);
                setFriendProfiles(prev => ({...prev, ...profiles}));
                if (newRecord.sender === user.username) { addToast(`${friendName} accepted your request`, 'success'); }
            }
        }
        if (eventType === 'DELETE') {
            const sender = oldRecord.sender;
            const receiver = oldRecord.receiver;
            const otherPerson = sender === user.username ? receiver : sender;
            setMyProfile(prev => { if (!prev) return null; return { ...prev, friends: prev.friends.filter(f => f !== otherPerson), incomingRequests: prev.incomingRequests.filter(f => f !== otherPerson), outgoingRequests: prev.outgoingRequests.filter(f => f !== otherPerson) }; });
        }
    };
    
    const handleForumEvent = (payload: any) => {
        if (payload.table === 'forum_threads') {
            const thread = payload.new;
            if (payload.eventType === 'INSERT') {
                setAllForumThreads(prev => [thread, ...prev].slice(0, 50));
                if (activeCategoryRef.current === thread.category_id) {
                    setForumThreads(prev => [thread, ...prev]);
                }
            }
            if (payload.eventType === 'UPDATE') {
                 setAllForumThreads(prev => prev.map(t => t.id === thread.id ? thread : t).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
                 if (activeCategoryRef.current === thread.category_id) {
                     setForumThreads(prev => {
                         const updated = prev.map(t => t.id === thread.id ? thread : t);
                         return updated.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                     });
                 }
                 if (activeThreadRef.current === thread.id) {
                     setActiveThread(thread);
                 }
            }
        }
        if (payload.table === 'forum_posts') {
            const post = payload.new;
            if (payload.eventType === 'INSERT' && activeThreadRef.current === post.thread_id) {
                setForumPosts(prev => [...prev, post]);
                if (!profilesCache[post.author]) {
                    getProfiles([post.author]).then(p => setProfilesCache(prev => ({...prev, ...p})));
                }
            }
        }
    };

    const unsub = subscribeToGlobalMessages(handleMessageEvent, handleChatEvent, handleFriendEvent, handleForumEvent);
    return () => { unsub(); };
  }, [user.username]);

  useLayoutEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages, activeChat?.id]);
  
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputText;

    if ((!textToSend.trim() && attachments.length === 0) || !activeChat) return;
    if (activeChat.id === OFFICIAL_CHAT_ID && user.username !== 'night') return;

    const payload: MessageContent = { 
        text: textToSend, 
        attachments: attachments.length > 0 ? attachments : undefined,
        replyTo: replyingTo ? {
            id: replyingTo.id,
            sender: replyingTo.sender,
            text: (() => {
                try {
                    const c = JSON.parse(replyingTo.content);
                    return c.text || 'Attachment';
                } catch { return replyingTo.content; }
            })()
        } : undefined
    };
    
    const contentString = JSON.stringify(payload);
    const tempId = crypto.randomUUID(); 
    const timestamp = Date.now();
    const isoTimestamp = new Date(timestamp).toISOString();
    const optimisticMsg: ChatMessage = { id: tempId, sender: user.username, content: contentString, timestamp };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setMessagesCache(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), optimisticMsg]
    }));

    setMyChats(prev => { const updated = prev.map(c => c.id === activeChat.id ? { ...c, lastMessage: optimisticMsg } : c); return updated.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0)); });
    
    if (!overrideText) { 
        setInputText(''); 
        setAttachments([]); 
        setReplyingTo(null); // Clear reply
        if (textAreaRef.current) textAreaRef.current.style.height = 'auto'; 
    }

    try {
      const encrypted = await prepareMessagePayload(activeChat.id, contentString);
      if (activeChannelRef.current) { await activeChannelRef.current.send({ type: 'broadcast', event: 'message', payload: { id: tempId, sender: user.username, content: encrypted.data, iv: encrypted.iv, chat_id: activeChat.id, created_at: isoTimestamp } }); }
      await saveMessageToDB(activeChat.id, user.username, encrypted, tempId);
      markChatRead(activeChat.id, user.username, timestamp);
    } catch (err) { console.error("Failed to send", err); addToast("Failed to save message to history", "alert"); }
  };
  
  const handleForwardMessages = async (targetChatIds: string[]) => {
      if (!forwardingMessage) return;
      setForwardingMessage(null); // Close modal
      
      let originalContent: MessageContent = { text: forwardingMessage.content };
      try { originalContent = JSON.parse(forwardingMessage.content); } catch {}
      
      const newPayload: MessageContent = {
          ...originalContent,
          isForwarded: true,
          replyTo: undefined, // Don't preserve reply context when forwarding
          reactions: undefined // Don't preserve reactions
      };
      
      const contentStr = JSON.stringify(newPayload);
      
      for (const chatId of targetChatIds) {
          try {
             const tempId = crypto.randomUUID();
             const encrypted = await prepareMessagePayload(chatId, contentStr);
             await saveMessageToDB(chatId, user.username, encrypted, tempId);
             
             // If sending to active chat, show immediately
             if (activeChat?.id === chatId) {
                 const optimisticMsg: ChatMessage = { id: tempId, sender: user.username, content: contentStr, timestamp: Date.now() };
                 setMessages(prev => [...prev, optimisticMsg]);
             }
          } catch(e) { console.error(`Failed to forward to ${chatId}`, e); }
      }
      
      addToast(`Forwarded to ${targetChatIds.length} chats`, 'success');
  };

  const handleForumSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
     e?.preventDefault();
     const textToSend = overrideText || forumInputText;
     if (!activeThread || (!textToSend.trim() && forumAttachments.length === 0)) return;

     const contentObj: MessageContent = { text: textToSend, attachments: forumAttachments.length > 0 ? forumAttachments : undefined };
     const contentStr = JSON.stringify(contentObj);
     
     const optimisticPost: ForumPost = {
         id: crypto.randomUUID(),
         thread_id: activeThread.id,
         author: user.username,
         content: contentStr,
         created_at: new Date().toISOString()
     };
     setForumPosts(prev => [...prev, optimisticPost]);
     
     if (!overrideText) { setForumInputText(''); setForumAttachments([]); if (forumTextAreaRef.current) forumTextAreaRef.current.style.height = 'auto'; }

     try {
         await createForumPost(activeThread.id, user.username, contentStr);
     } catch(e) { console.error(e); addToast('Failed to post', 'alert'); }
  };


  const handleCreateForumThread = async () => {
      if (!activeCategory || !newThreadTitle || !newThreadContent) return;
      try {
          const thread = await createForumThread(
              activeCategory.id, 
              user.username, 
              newThreadTitle, 
              newThreadContent,
              newThreadTags,
              newThreadBanner,
              newThreadAttachments
          );
          
          const contentObj: MessageContent = { text: newThreadContent, attachments: newThreadAttachments.length ? newThreadAttachments : undefined };
          await createForumPost(thread.id, user.username, JSON.stringify(contentObj));
          
          setForumThreads(prev => [thread, ...prev]);
          setShowCreateThread(false);
          setNewThreadTitle('');
          setNewThreadContent('');
          setNewThreadTags([]);
          setNewThreadBanner('');
          setNewThreadAttachments([]);
          
          setActiveThread(thread);
      } catch(e) { console.error(e); addToast('Failed to create thread', 'alert'); }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          if (!newThreadTags.includes(tagInput.trim())) {
              setNewThreadTags([...newThreadTags, tagInput.trim()]);
          }
          setTagInput('');
      }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          let url = reader.result as string;
          if (file.type.startsWith('image/')) { url = await resizeImage(url, 800, 800, 0.7); }
          const type = file.type.startsWith('image/') ? 'image' : 'file';
          setAttachments(prev => [...prev, { type, url, name: file.name, size: file.size, mimeType: file.type }]);
        };
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleForumFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          let url = reader.result as string;
          if (file.type.startsWith('image/')) { url = await resizeImage(url, 800, 800, 0.7); }
          const type = file.type.startsWith('image/') ? 'image' : 'file';
          setForumAttachments(prev => [...prev, { type, url, name: file.name, size: file.size, mimeType: file.type }]);
        };
      }
    }
    if (forumFileInputRef.current) forumFileInputRef.current.value = '';
  };
  
  const handleCreateThreadFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files) as File[];
        for (const file of files) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                let url = reader.result as string;
                if (file.type.startsWith('image/')) { url = await resizeImage(url, 800, 800, 0.7); }
                const type = file.type.startsWith('image/') ? 'image' : 'file';
                setNewThreadAttachments(prev => [...prev, { type, url, name: file.name, size: file.size, mimeType: file.type }]);
            };
        }
    }
    if (createThreadFileRef.current) createThreadFileRef.current.value = '';
  };

  const handleReaction = async (messageId: string, emoji: string) => {
     if (!activeChat) return;
     setMessages(prev => prev.map(msg => { if (msg.id !== messageId) return msg; let content: MessageContent = { text: msg.content }; try { content = JSON.parse(msg.content); } catch {} if (!content.reactions) content.reactions = {}; const current = content.reactions[emoji] || []; if (current.includes(user.username)) { content.reactions[emoji] = current.filter(u => u !== user.username); if (content.reactions[emoji].length === 0) delete content.reactions[emoji]; } else { content.reactions[emoji] = [...current, user.username]; } return { ...msg, content: JSON.stringify(content) }; }));
     try { await addMessageReaction(activeChat.id, messageId, emoji, user.username); } catch (e) {}
  };
  
  const handleAcceptFriend = async (req: string) => { setMyProfile(prev => prev ? { ...prev, incomingRequests: prev.incomingRequests.filter(r => r !== req), friends: [...prev.friends, req] } : null); await acceptFriendRequest(user.username, req); };
  const handleRejectFriend = async (req: string) => { setMyProfile(prev => prev ? { ...prev, incomingRequests: prev.incomingRequests.filter(r => r !== req) } : null); await rejectFriendRequest(user.username, req); };
  const handleFriendRemove = async (friend: string) => { if (confirm(`Remove ${friend} from contacts?`)) { setMyProfile(prev => prev ? { ...prev, friends: prev.friends.filter(f => f !== friend) } : null); await removeFriend(user.username, friend); } };
  const handleRemoveChat = async (e: React.MouseEvent, chat: ChatRoom) => {
      e.stopPropagation();
      if (chat.type === 'group') { if (confirm(`Are you sure you want to leave ${chat.name}?`)) { await leaveGroup(chat.id, user.username); setMyChats(prev => prev.filter(c => c.id !== chat.id)); if (activeChat?.id === chat.id) setActiveChat(null); addToast("Left Group", "info"); } } else { const newSet = new Set(closedChatIds); newSet.add(chat.id); setClosedChatIds(newSet); localStorage.setItem('night_closed_chats', JSON.stringify(Array.from(newSet))); if (activeChat?.id === chat.id) setActiveChat(null); }
  };
  
  const handleMessageUser = async (targetUsername: string) => {
      if (targetUsername === user.username) return;
      let chat = myChats.find(c => c.type === 'dm' && c.participants.includes(targetUsername));
      if (!chat) { const chatId = getDMChatId(user.username, targetUsername); chat = { id: chatId, type: 'dm', name: targetUsername, participants: [user.username, targetUsername], avatar: '' }; setMyChats(p => [chat!, ...p]); }
      setMiniProfileUser(null);
      setViewMode('chats');
      setActiveChat(chat);
  };
  
  const handleCreateGroup = async () => { setShowCreateGroup(false); try { const newChat = await createGroupChat(groupNameInput, groupDescInput, user.username, selectedFriendsForGroup); setMyChats(p => [newChat, ...p]); setActiveChat(newChat); setGroupNameInput(''); setGroupDescInput(''); setSelectedFriendsForGroup([]); } catch(e) { console.error(e); } };
  const handleCreateFromTemplate = async (name: string, desc: string) => { try { const newChat = await createGroupChat(name, desc, user.username, []); setMyChats(p => [newChat, ...p]); setActiveChat(newChat); handleOnboardingComplete(); } catch(e) { console.error(e); } };
  const handleSaveProfile = async () => { await updateProfile(user.username, { avatar: settingsAvatar, banner: settingsBanner, bio: settingsBio, public_email: settingsEmail, show_email: settingsShowEmail }); user.avatar = settingsAvatar; refreshData(); setShowSettings(false); addToast("Profile Updated", 'success'); };
  const handleGroupLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0] && activeChat) { const file = e.target.files[0]; const reader = new FileReader(); reader.onloadend = async () => { const res = await resizeImage(reader.result as string, 200, 200); await updateGroupAvatar(activeChat.id, res); setActiveChat(p => p ? {...p, avatar: res} : null); refreshData(); addToast("Group Icon Updated", 'success'); }; reader.readAsDataURL(file); } };
  const handleUpdateDescription = async (desc: string) => { if (!activeChat) return; await updateGroupDescription(activeChat.id, desc); const updated = { ...activeChat, description: desc }; setActiveChat(updated); setMyChats(prev => prev.map(c => c.id === activeChat.id ? updated : c)); addToast("Description updated", "success"); };
  const handleAddMembers = async (newMembers: string[]) => { if (!activeChat) return; await addGroupMembers(activeChat.id, newMembers); const updatedParticipants = [...activeChat.participants, ...newMembers]; const updatedChat = { ...activeChat, participants: updatedParticipants }; setActiveChat(updatedChat); setMyChats(prev => prev.map(c => c.id === activeChat.id ? updatedChat : c)); addToast("Members added", "success"); getProfiles(newMembers).then(p => { setProfilesCache(prev => ({...prev, ...p})); }); };
  const handleOnboardingComplete = () => { setShowOnboarding(false); localStorage.setItem(`night_onboarding_completed_${user.username}`, 'true'); };

  const displayedChats = myChats.filter(c => !closedChatIds.has(c.id)).filter(c => {
      if (filterMode === 'unread' && (unreadCounts[c.id] || 0) === 0) return false;
      if (filterMode === 'groups' && c.type !== 'group') return false;
      
      if (!searchQuery) return true;
      const lowerQ = searchQuery.toLowerCase();
      if (c.name.toLowerCase().includes(lowerQ)) return true;
      if (c.type === 'dm') { const other = c.participants.find(p => p !== user.username); if (other?.toLowerCase().includes(lowerQ)) return true; }
      return false;
  });

  const totalUnread = Object.values(unreadCounts).reduce((a: number, b: number) => a + b, 0);
  const totalUnreadLabel = totalUnread > 99 ? '99+' : totalUnread.toString();
  useEffect(() => { document.title = totalUnread > 0 ? `Night | (${totalUnreadLabel})` : 'Night | Secure Chat'; }, [totalUnread, totalUnreadLabel]);

  const renderCategoryIcon = (iconName: string, className = "w-5 h-5") => {
      switch(iconName) {
          case 'Globe': return <Globe className={className} />;
          case 'Gamepad2': return <Gamepad2 className={className} />;
          case 'Cpu': return <Cpu className={className} />;
          case 'Music': return <Music className={className} />;
          case 'GraduationCap': return <GraduationCap className={className} />;
          case 'BookOpen': return <BookOpen className={className} />;
          case 'Library': return <Library className={className} />;
          case 'Users': return <Users className={className} />;
          default: return <Hash className={className} />;
      }
  };

  if (loadingInitial) return <div className="h-full w-full bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-500"/></div>;

  return (
    <div className="flex h-full w-full bg-black text-zinc-200 overflow-hidden font-sans relative">
      <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
         {toasts.map(t => (<div key={t.id} className={`pointer-events-auto border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-in-right ${t.type === 'alert' ? 'bg-red-950/90 border-red-900 text-red-200' : 'bg-zinc-900 border-zinc-800 text-white'}`}>{t.type === 'success' ? <Check className="w-4 h-4 text-green-400" /> : (t.type === 'alert' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Info className="w-4 h-4 text-blue-400" />)}<span className="text-sm font-medium">{t.message}</span></div>))}
      </div>
      {showOnboarding && (<OnboardingModal onSkip={handleOnboardingComplete} onCreateOwn={() => { setShowCreateGroup(true); handleOnboardingComplete(); }} onTemplate={handleCreateFromTemplate} />)}
      {forwardingMessage && <ForwardModal onClose={() => setForwardingMessage(null)} onSend={handleForwardMessages} chats={myChats} profilesCache={profilesCache} currentUser={user} />}
      {miniProfileUser && <MiniProfile key={miniProfileUser} username={miniProfileUser} initialData={profilesCache[miniProfileUser]} onClose={() => setMiniProfileUser(null)} onMessage={handleMessageUser} status={onlineUsers[miniProfileUser] || 'offline'} />}

      {/* --- SIDEBAR --- */}
      <aside className={`flex flex-col w-full md:w-[400px] bg-black border-r border-zinc-900 h-full ${(activeChat || activeThread) ? 'hidden md:flex' : 'flex'}`}>
        <div className="h-16 bg-zinc-950 flex items-center justify-between px-4 border-b border-zinc-900 shrink-0 pt-[env(safe-area-inset-top)] box-content">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                 <div className="relative w-9 h-9">
                    <div className="w-full h-full rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.username[0]}
                    </div>
                    <StatusIndicator status={userStatus} className="absolute -bottom-0.5 -right-0.5 w-3 h-3 ring-2 ring-black" showInvisible />
                 </div>
                 <div className="font-bold text-white text-sm">{user.username}</div>
             </div>
             {showStatusMenu && (
                <div className="absolute top-16 left-4 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50">
                    <button onClick={() => handleChangeStatus('online')} className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300"><StatusIndicator status="online" className="w-2.5 h-2.5" /> Online</button>
                    <button onClick={() => handleChangeStatus('idle')} className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300"><StatusIndicator status="idle" className="w-2.5 h-2.5" /> Idle</button>
                    <button onClick={() => handleChangeStatus('dnd')} className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300"><StatusIndicator status="dnd" className="w-2.5 h-2.5" /> DND</button>
                    <div className="h-px bg-zinc-800 my-1"></div>
                    <button onClick={() => handleChangeStatus('invisible')} className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300"><StatusIndicator status="invisible" className="w-2.5 h-2.5" /> Invisible</button>
                </div>
            )}
             <div className="flex gap-1 text-zinc-400">
                 <button onClick={() => { setViewMode('forums'); setActiveCategory(null); setActiveThread(null); }} className={`p-2 rounded-full ${viewMode === 'forums' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900'}`} title="Global Forums"><Globe className="w-5 h-5"/></button>
                 <button onClick={() => { setViewMode('chats'); setActiveChat(null); }} className={`p-2 rounded-full ${viewMode === 'chats' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900'}`} title="Chats"><MessageSquare className="w-5 h-5"/></button>
                 <div className="w-px h-6 bg-zinc-800 mx-1 self-center"></div>
                 <button onClick={() => setShowAddFriend(true)} className="p-2 hover:bg-zinc-900 rounded-full relative" title="New Contact">
                    <UserPlus className="w-5 h-5"/>
                    {(myProfile?.incomingRequests?.length || 0) > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
                 </button>
                 <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-zinc-900 rounded-full" title="Settings"><Settings className="w-5 h-5"/></button>
                 <button onClick={onLogout} className="p-2 hover:bg-zinc-900 rounded-full text-red-400/70 hover:text-red-400" title="Logout"><LogOut className="w-5 h-5"/></button>
             </div>
        </div>

        {viewMode === 'chats' ? (
            <>
                <div className="p-3 bg-black flex flex-col gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-white" />
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-700 rounded-lg py-2 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition-all"
                            placeholder="Search chats..."
                        />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"><X className="w-3 h-3"/></button>}
                    </div>
                    <div className="flex gap-2 justify-between">
                         <div className="flex gap-2">
                            <button onClick={() => setFilterMode('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterMode === 'all' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>All</button>
                            <button onClick={() => setFilterMode('unread')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterMode === 'unread' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>Unread</button>
                            <button onClick={() => setFilterMode('groups')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterMode === 'groups' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>Groups</button>
                         </div>
                         <button onClick={() => setShowCreateGroup(true)} className="p-1 hover:bg-zinc-900 rounded text-zinc-500" title="New Group"><Plus className="w-5 h-5"/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {displayedChats.length === 0 ? (
                        <div className="text-center text-zinc-600 text-xs py-10">No chats found.</div>
                    ) : (
                        displayedChats.map(chat => {
                            let displayName = chat.name;
                            let displayAvatar = chat.avatar;
                            let isVerified = false;
                            let chatStatus: UserStatus | undefined = undefined;
                            
                            if (chat.type === 'dm') {
                            const otherUser = chat.participants.find(p => p !== user.username) || 'Unknown';
                            displayName = otherUser;
                            displayAvatar = profilesCache[otherUser]?.avatar;
                            isVerified = otherUser === 'night';
                            chatStatus = onlineUsers[otherUser];
                            } else if (chat.id === OFFICIAL_CHAT_ID) {
                            isVerified = true;
                            }
        
                            const isActive = activeChat?.id === chat.id;
                            const isOff = chat.id === OFFICIAL_CHAT_ID;
                            const unread = unreadCounts[chat.id] || 0;
                            
                            let lastMsgText = '';
                            if (chat.lastMessage) {
                                try {
                                    const content = JSON.parse(chat.lastMessage.content);
                                    lastMsgText = content.text || (content.attachments?.length ? '📷 Photo' : '');
                                } catch { lastMsgText = chat.lastMessage.content; }
                            }
        
                            return (
                            <div 
                                key={chat.id}
                                onClick={() => setActiveChat(chat)}
                                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors ${isActive ? 'bg-zinc-900' : ''}`}
                            >
                                <div className="relative shrink-0 w-12 h-12">
                                    <div className="w-full h-full rounded-full bg-black border border-zinc-800 overflow-hidden flex items-center justify-center">
                                        {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" /> : (isOff ? <Moon className="w-6 h-6 text-indigo-400 fill-indigo-400" /> : (chat.type === 'group' ? <Hash className="w-6 h-6 text-zinc-500"/> : <span className="text-lg font-bold">{displayName[0]?.toUpperCase()}</span>))}
                                    </div>
                                    {chatStatus && chatStatus !== 'offline' && chatStatus !== 'invisible' && <StatusIndicator status={chatStatus} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ring-2 ring-black" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="font-medium text-zinc-200 truncate text-sm flex items-center gap-1">
                                            {displayName} {isVerified && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                                        </h4>
                                        {chat.lastMessage && <span className={`text-[10px] ${unread > 0 ? 'text-indigo-400 font-bold' : 'text-zinc-500'}`}>{new Date(chat.lastMessage.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs truncate max-w-[200px] ${unread > 0 ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>
                                            {isOff ? "Welcome to Glycon" : (lastMsgText || <span className="italic opacity-50">No messages yet</span>)}
                                        </p>
                                        {unread > 0 && <div className="bg-indigo-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">{unread > 99 ? '99+' : unread}</div>}
                                    </div>
                                </div>
                            </div>
                            );
                        })
                    )}
                </div>
            </>
        ) : (
            // FORUMS SIDEBAR
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-zinc-900 bg-zinc-950 cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => { setActiveCategory(null); setActiveThread(null); }}>
                     <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Global Forums</h2>
                     <p className="text-zinc-600 text-[10px]">Dashboard & Activity</p>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {forumCategories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat); setActiveThread(null); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeCategory?.id === cat.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
                        >
                            <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                                {renderCategoryIcon(cat.icon)}
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-sm">{cat.name}</div>
                                <div className="text-[10px] opacity-60 truncate">{cat.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </aside>

      {/* --- MAIN AREA --- */}
      <main className={`flex-1 flex flex-col h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-100 relative ${(activeChat || activeThread) ? 'flex' : 'hidden md:flex'}`}>
         {/* Wallpaper Overlay */}
         <div className="absolute inset-0 bg-black opacity-95 z-0 pointer-events-none"></div>

         {viewMode === 'chats' && activeChat ? (
             <>
                <header className="h-16 bg-zinc-950 flex items-center justify-between px-4 border-b border-zinc-900 z-10 shrink-0 pt-[env(safe-area-inset-top)] box-content">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveChat(null)} className="md:hidden text-zinc-400 p-1"><ChevronLeft className="w-6 h-6"/></button>
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowInfoPanel(!showInfoPanel)}>
                            <div className="w-10 h-10 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center">
                                {activeChat?.type === 'dm' ? (
                                    <img src={profilesCache[activeChat.participants.find(p => p !== user.username)||'']?.avatar} className="w-full h-full object-cover" />
                                ) : (
                                    activeChat?.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : (activeChat?.id === OFFICIAL_CHAT_ID ? <Moon className="w-5 h-5 text-indigo-400 fill-indigo-400" /> : <Hash className="w-5 h-5 text-zinc-500" />)
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-white font-bold text-sm flex items-center gap-1">
                                    {activeChat?.name}
                                    {activeChat?.id === OFFICIAL_CHAT_ID && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                                </h2>
                                <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                                    {activeChat.type === 'group' 
                                        ? (activeChat.participants.map(p => p === user.username ? 'You' : p).join(', '))
                                        : (onlineUsers[activeChat.participants.find(p=>p!==user.username)||''] === 'online' ? 'Online' : 'Click for info')
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400">
                        <button className="p-2 hover:bg-zinc-900 rounded-full"><Search className="w-5 h-5"/></button>
                        <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 hover:bg-zinc-900 rounded-full ${showInfoPanel ? 'bg-zinc-900 text-white' : ''}`}><Menu className="w-5 h-5"/></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-6 z-10 custom-scrollbar flex flex-col scroll-smooth">
                    {(() => {
                        const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
                        let lastDateStr = '';

                        return sortedMessages.map((m, i) => {
                            const prevMessage = sortedMessages[i - 1];
                            const isSequence = prevMessage && prevMessage.sender === m.sender && (m.timestamp - prevMessage.timestamp < 2 * 60 * 1000); 
                            const nextMessage = sortedMessages[i + 1];
                            const isLastInSequence = !nextMessage || nextMessage.sender !== m.sender || (nextMessage.timestamp - m.timestamp >= 2 * 60 * 1000);
                            
                            const dateSeparatorStr = formatDateSeparator(m.timestamp);
                            const showSeparator = dateSeparatorStr !== lastDateStr;
                            if (showSeparator) lastDateStr = dateSeparatorStr;

                            return (
                                <React.Fragment key={m.id}>
                                    {showSeparator && (
                                        <div className="flex justify-center my-6 sticky top-2 z-10">
                                            <span className="bg-zinc-900/80 backdrop-blur text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-zinc-800 shadow-sm">
                                                {dateSeparatorStr}
                                            </span>
                                        </div>
                                    )}
                                    <MessageBubble 
                                        msg={m} 
                                        isMe={m.sender === user.username} 
                                        senderProfile={profilesCache[m.sender]} 
                                        chatId={activeChat.id} 
                                        onReact={handleReaction} 
                                        isGroup={activeChat.type === 'group'} 
                                        onDelete={() => deleteMessage(m.id).then(()=>setMessages(p=>p.filter(x=>x.id!==m.id)))} 
                                        onEdit={(id, txt) => updateMessage(activeChat.id, id, { text: txt }).then(()=>setMessages(p=>p.map(x=>x.id===id ? {...x, content: JSON.stringify({...JSON.parse(x.content), text: txt})} : x)))}
                                        onProfileClick={setMiniProfileUser}
                                        onReply={(msg) => setReplyingTo(msg)}
                                        onForward={(msg) => setForwardingMessage(msg)}
                                        isSequence={!!isSequence}
                                        isLastInSequence={isLastInSequence}
                                    />
                                </React.Fragment>
                            );
                        });
                    })()}
                    <div ref={messagesEndRef} className="h-1" />
                </div>

                {activeChat.id !== OFFICIAL_CHAT_ID || user.username === 'night' ? (
                <div className="p-3 bg-zinc-950 border-t border-zinc-900 z-20 pb-[max(1rem,env(safe-area-inset-bottom))] box-content shrink-0 mb-4">
                   {/* Reply Preview */}
                   {replyingTo && (
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-t border-x border-zinc-800 rounded-t-xl mx-2 -mb-2 z-0 relative top-1">
                            <div className="flex flex-col relative pl-3 border-l-2 border-indigo-500">
                                <span className="text-[10px] font-bold text-indigo-400">Replying to {replyingTo.sender}</span>
                                <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                                    {(() => {
                                        try {
                                            const c = JSON.parse(replyingTo.content);
                                            return c.text || (c.attachments?.length ? 'Attachment' : 'Message');
                                        } catch { return replyingTo.content; }
                                    })()}
                                </span>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 hover:text-white text-zinc-500"><X className="w-4 h-4" /></button>
                        </div>
                   )}

                   <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
                        {attachments.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800 flex gap-2 shadow-xl z-50">
                                {attachments.map((att, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center group">
                                        {att.type === 'image' ? <img src={att.url} className="w-full h-full object-cover"/> : <File className="w-8 h-8 text-zinc-500" />}
                                        <button onClick={() => setAttachments([])} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button type="button" onClick={() => { setShowInputEmoji(!showInputEmoji); setShowGifPicker(false); }} className={`p-3 rounded-full hover:bg-zinc-900 text-zinc-400 transition-colors ${showInputEmoji ? 'text-white' : ''}`}><Smile className="w-6 h-6"/></button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full hover:bg-zinc-900 text-zinc-400 transition-colors"><Plus className="w-6 h-6"/></button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple />
                        
                        {showInputEmoji && (
                            <div className="absolute bottom-16 left-0 bg-zinc-950 border border-zinc-800 rounded-xl p-2 w-72 grid grid-cols-8 gap-1 shadow-2xl z-50 h-64 overflow-y-auto custom-scrollbar animate-scale-in">
                                {MORE_EMOJIS.map(e => (<button key={e} type="button" onClick={() => { setInputText(prev => prev + e); setShowInputEmoji(false); }} className="p-1 hover:bg-zinc-800 rounded text-xl">{e}</button>))}
                            </div>
                        )}

                        <div className={`flex-1 bg-zinc-900 flex items-center border border-zinc-800 focus-within:border-zinc-700 transition-colors ${replyingTo ? 'rounded-b-lg rounded-tr-lg' : 'rounded-lg'}`}>
                             <textarea 
                                ref={textAreaRef}
                                value={inputText}
                                onChange={e => { setInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                rows={1}
                                placeholder="Type a message"
                                className="w-full bg-transparent border-none text-zinc-200 resize-none py-3 px-4 max-h-32 min-h-[44px] custom-scrollbar placeholder-zinc-500 outline-none text-sm"
                                style={{ outline: 'none', boxShadow: 'none' }} 
                             />
                             <div className="relative pr-2">
                                <button type="button" onClick={() => { setShowGifPicker(!showGifPicker); setShowInputEmoji(false); }} className={`p-2 rounded-full hover:bg-zinc-800 transition-colors ${showGifPicker ? 'text-white' : 'text-zinc-500'}`}><Clapperboard className="w-5 h-5"/></button>
                                {showGifPicker && <GifPicker onSelect={(url) => { handleSendMessage(undefined, url); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />}
                             </div>
                        </div>

                        {inputText.trim() || attachments.length > 0 ? (
                            <button onClick={() => handleSendMessage()} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors shadow-lg"><Send className="w-5 h-5 fill-current" /></button>
                        ) : null}
                   </div>
                </div>
                ) : <div className="p-4 bg-zinc-950 border-t border-zinc-900 text-center text-zinc-600 text-sm flex items-center justify-center gap-2"><Lock className="w-4 h-4" />Read Only Channel</div>}
             </>
         ) : viewMode === 'forums' && activeThread ? (
             <>
                 <header className="h-16 bg-zinc-950/80 backdrop-blur-md flex items-center gap-3 px-4 border-b border-zinc-900 z-10 shrink-0 pt-[env(safe-area-inset-top)] box-content sticky top-0">
                     <button onClick={() => setActiveThread(null)} className="text-zinc-400 p-1 hover:text-white"><ArrowLeft className="w-6 h-6"/></button>
                     <div className="flex flex-col flex-1 min-w-0">
                         <h2 className="text-white font-bold text-base flex items-center gap-2 truncate">
                             <Hash className="w-4 h-4 text-zinc-500 flex-shrink-0"/> {activeThread.title}
                         </h2>
                         <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>in {activeCategory?.name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> {activeThread.views || 0}</span>
                         </div>
                     </div>
                 </header>

                 <div className="flex-1 overflow-y-auto z-10 custom-scrollbar flex flex-col scroll-smooth">
                     
                     {/* Hero Banner (if exists) */}
                     <div className="relative w-full">
                        {activeThread.banner && (
                            <div className="w-full h-48 md:h-64 relative">
                                <img src={activeThread.banner} className="w-full h-full object-cover mask-image-gradient-b" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            </div>
                        )}
                        
                        {/* Thread Header Context */}
                        <div className={`px-4 md:px-8 pb-6 ${activeThread.banner ? '-mt-20 relative z-20' : 'mt-8'}`}>
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-black border-2 border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl">
                                    {profilesCache[activeThread.author]?.avatar ? <img src={profilesCache[activeThread.author].avatar} className="w-full h-full object-cover"/> : <Hash className="w-8 h-8 text-zinc-600" />}
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight drop-shadow-lg">{activeThread.title}</h1>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {activeThread.tags?.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-500/30">{tag}</span>
                                        ))}
                                    </div>
                                    <p className="text-zinc-400 text-sm">Started by <span className="text-white font-bold">{activeThread.author}</span> on {new Date(activeThread.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* Content Area */}
                     <div className="px-4 pb-6">
                        {/* Rendering Forum Posts as Chat Bubbles */}
                        {(() => {
                            const sortedPosts = [...forumPosts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                            let lastDateStr = '';

                            return sortedPosts.map((p, i) => {
                                const timestamp = new Date(p.created_at).getTime();
                                const prevPost = sortedPosts[i - 1];
                                const isSequence = prevPost && prevPost.author === p.author && (timestamp - new Date(prevPost.created_at).getTime() < 5 * 60 * 1000);
                                const nextPost = sortedPosts[i + 1];
                                const isLastInSequence = !nextPost || nextPost.author !== p.author || (new Date(nextPost.created_at).getTime() - timestamp >= 5 * 60 * 1000);
                                
                                const dateSeparatorStr = formatDateSeparator(timestamp);
                                const showSeparator = dateSeparatorStr !== lastDateStr;
                                if (showSeparator) lastDateStr = dateSeparatorStr;

                                // Convert ForumPost to ChatMessage structure for compatibility
                                const fakeMsg: ChatMessage = {
                                    id: p.id,
                                    sender: p.author,
                                    content: p.content,
                                    timestamp: timestamp
                                };

                                return (
                                    <React.Fragment key={p.id}>
                                        {showSeparator && (
                                            <div className="flex justify-center my-6 sticky top-2 z-10">
                                                <span className="bg-zinc-900/80 backdrop-blur text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-zinc-800 shadow-sm">
                                                    {dateSeparatorStr}
                                                </span>
                                            </div>
                                        )}
                                        <MessageBubble 
                                            msg={fakeMsg} 
                                            isMe={p.author === user.username} 
                                            senderProfile={profilesCache[p.author]} 
                                            chatId={`forum_thread_${activeThread.id}`} 
                                            onReact={() => {}} 
                                            isGroup={true} 
                                            onDelete={() => {}} 
                                            onEdit={() => {}}
                                            onProfileClick={setMiniProfileUser}
                                            onReply={() => {}}
                                            onForward={() => {}}
                                            isSequence={!!isSequence}
                                            isLastInSequence={isLastInSequence}
                                        />
                                    </React.Fragment>
                                );
                            });
                        })()}
                     </div>
                     <div ref={forumEndRef} className="h-4"></div>
                 </div>

                 {/* Forum Input Box - Rich Media Support */}
                 <div className="p-3 bg-zinc-950 border-t border-zinc-900 z-20 pb-[max(1rem,env(safe-area-inset-bottom))] box-content shrink-0 mb-4">
                   <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
                        {forumAttachments.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800 flex gap-2 shadow-xl z-50">
                                {forumAttachments.map((att, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center group">
                                        {att.type === 'image' ? <img src={att.url} className="w-full h-full object-cover"/> : <File className="w-8 h-8 text-zinc-500" />}
                                        <button onClick={() => setForumAttachments([])} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button type="button" onClick={() => { setShowForumEmoji(!showForumEmoji); setShowForumGif(false); }} className={`p-3 rounded-full hover:bg-zinc-900 text-zinc-400 transition-colors ${showForumEmoji ? 'text-white' : ''}`}><Smile className="w-6 h-6"/></button>
                        <button type="button" onClick={() => forumFileInputRef.current?.click()} className="p-3 rounded-full hover:bg-zinc-900 text-zinc-400 transition-colors"><Plus className="w-6 h-6"/></button>
                        <input type="file" ref={forumFileInputRef} className="hidden" onChange={handleForumFileSelect} multiple />
                        
                        {showForumEmoji && (
                            <div className="absolute bottom-16 left-0 bg-zinc-950 border border-zinc-800 rounded-xl p-2 w-72 grid grid-cols-8 gap-1 shadow-2xl z-50 h-64 overflow-y-auto custom-scrollbar animate-scale-in">
                                {MORE_EMOJIS.map(e => (<button key={e} type="button" onClick={() => { setForumInputText(prev => prev + e); setShowForumEmoji(false); }} className="p-1 hover:bg-zinc-800 rounded text-xl">{e}</button>))}
                            </div>
                        )}

                        <div className="flex-1 bg-zinc-900 rounded-lg flex items-center border border-zinc-800 focus-within:border-zinc-700 transition-colors">
                             <textarea 
                                ref={forumTextAreaRef}
                                value={forumInputText}
                                onChange={e => { setForumInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleForumSendMessage(); } }}
                                rows={1}
                                placeholder={`Reply to ${activeThread.title}...`}
                                className="w-full bg-transparent border-none text-zinc-200 resize-none py-3 px-4 max-h-32 min-h-[44px] custom-scrollbar placeholder-zinc-500 outline-none text-sm"
                                style={{ outline: 'none', boxShadow: 'none' }} 
                             />
                             <div className="relative pr-2">
                                <button type="button" onClick={() => { setShowForumGif(!showForumGif); setShowForumEmoji(false); }} className={`p-2 rounded-full hover:bg-zinc-800 transition-colors ${showForumGif ? 'text-white' : 'text-zinc-500'}`}><Clapperboard className="w-5 h-5"/></button>
                                {showForumGif && <GifPicker onSelect={(url) => { handleForumSendMessage(undefined, url); setShowForumGif(false); }} onClose={() => setShowForumGif(false)} />}
                             </div>
                        </div>

                        {forumInputText.trim() || forumAttachments.length > 0 ? (
                            <button onClick={() => handleForumSendMessage()} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors shadow-lg"><Send className="w-5 h-5 fill-current" /></button>
                        ) : null}
                   </div>
                </div>
             </>
         ) : viewMode === 'forums' && activeCategory ? (
             <>
                 <header className="h-16 bg-zinc-950 flex items-center justify-between px-6 border-b border-zinc-900 z-10 shrink-0 pt-[env(safe-area-inset-top)] box-content">
                     <div className="flex items-center gap-3">
                         <button onClick={() => setActiveCategory(null)} className="md:hidden text-zinc-400"><ArrowLeft className="w-5 h-5"/></button>
                         <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {renderCategoryIcon(activeCategory.icon)}
                            {activeCategory.name}
                         </h2>
                     </div>
                     <button onClick={() => setShowCreateThread(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-indigo-900/50 transition-all"><Plus className="w-4 h-4"/> New Topic</button>
                 </header>
                 <div className="flex-1 overflow-y-auto px-6 py-6 z-10 custom-scrollbar">
                     <div className="grid grid-cols-1 gap-3">
                         {forumThreads.length === 0 ? (
                             <div className="text-center text-zinc-600 py-20 flex flex-col items-center">
                                 <MessageSquare className="w-12 h-12 mb-4 opacity-20"/>
                                 <p>No threads here yet.</p>
                                 <p className="text-sm">Be the first to ignite the conversation.</p>
                             </div>
                         ) : (
                             forumThreads.map(thread => (
                                 <div key={thread.id} onClick={() => setActiveThread(thread)} className="group relative bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-0 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-xl">
                                     {thread.banner && <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"><img src={thread.banner} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" /></div>}
                                     <div className="relative p-5 flex justify-between items-start gap-4">
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center gap-2 mb-2">
                                                 <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                                                     {profilesCache[thread.author]?.avatar ? <img src={profilesCache[thread.author].avatar} className="w-full h-full object-cover"/> : <div className="text-[10px] w-full h-full flex items-center justify-center font-bold text-zinc-500">{thread.author[0]}</div>}
                                                 </div>
                                                 <span className="text-xs font-bold text-zinc-400">{thread.author}</span>
                                                 <span className="text-zinc-600 text-[10px]">•</span>
                                                 <span className="text-xs text-zinc-500">{new Date(thread.updated_at).toLocaleDateString()}</span>
                                             </div>
                                             <h3 className="font-bold text-zinc-200 text-lg mb-2 group-hover:text-white transition-colors truncate pr-4">{thread.title}</h3>
                                             <div className="flex flex-wrap gap-2">
                                                 {thread.tags?.map(t => <span key={t} className="px-2 py-0.5 rounded bg-black/50 border border-zinc-800 text-[10px] text-zinc-400 font-medium">{t}</span>)}
                                                 {thread.attachments && thread.attachments.length > 0 && <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-medium flex items-center gap-1"><Paperclip className="w-3 h-3"/> Media</span>}
                                             </div>
                                         </div>
                                         <div className="flex flex-col items-end gap-2 text-zinc-600 group-hover:text-zinc-400">
                                             <ChevronRight className="w-5 h-5"/>
                                         </div>
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>
             </>
         ) : viewMode === 'forums' && !activeCategory ? (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar relative">
                {/* Snowfall Overlay */}
                <Snowfall />

                <div className="flex justify-between items-end mb-8 relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
                            Global Forums <span className="text-2xl animate-pulse">❄️</span>
                        </h1>
                        <p className="text-zinc-500 text-sm">Dashboard & Recent Activity</p>
                    </div>
                </div>
                
                {/* Recent Activity Section */}
                <div className="mb-8 relative z-10">
                     <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500"/> Trending & Recent</h2>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {allForumThreads.length === 0 ? (
                             <div className="col-span-2 text-center text-zinc-700 py-10 border border-zinc-900 border-dashed rounded-xl">
                                 No global activity yet.
                             </div>
                        ) : (
                             allForumThreads.slice(0, 6).map(thread => (
                                 <div key={thread.id} onClick={() => { 
                                     const cat = forumCategories.find(c => c.id === thread.category_id);
                                     if (cat) setActiveCategory(cat);
                                     setActiveThread(thread);
                                 }} className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer group flex gap-4 hover:shadow-lg shadow-black/50">
                                     <div className="w-12 h-12 bg-black rounded-lg border border-zinc-800 shrink-0 overflow-hidden relative">
                                        {thread.banner ? <img src={thread.banner} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex items-center justify-center"><Hash className="w-5 h-5 text-zinc-700"/></div>}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <h4 className="font-bold text-zinc-200 text-sm truncate group-hover:text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400">{thread.title}</h4>
                                         <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                             <span className="font-bold text-zinc-400">{thread.author}</span>
                                             <span>in {forumCategories.find(c => c.id === thread.category_id)?.name || 'Unknown'}</span>
                                         </div>
                                     </div>
                                 </div>
                             ))
                        )}
                     </div>
                </div>

                {/* Categories Grid (Festive) */}
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10"><Filter className="w-4 h-4"/> All Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                    {forumCategories.map(cat => (
                        <div 
                            key={cat.id} 
                            onClick={() => { setActiveCategory(cat); setActiveThread(null); }}
                            className="bg-black/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl hover:border-zinc-600 transition-all cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
                        >
                            {/* Festive Background Glows based on category */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            {/* Swaying Tree Decoration */}
                            <SwayingTree />

                            <div className="flex items-center gap-3 mb-2 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:scale-110 transition-all shadow-lg group-hover:shadow-emerald-500/20">
                                    {renderCategoryIcon(cat.icon, "w-4 h-4")}
                                </div>
                                <h3 className="font-bold text-zinc-300 group-hover:text-white flex items-center gap-2">
                                    {cat.name}
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                                        {cat.name.includes('Game') ? '🎮' : 
                                         cat.name.includes('Music') ? '🎵' : 
                                         cat.name.includes('Tech') ? '🎁' : '❄️'}
                                    </span>
                                </h3>
                            </div>
                            <p className="text-zinc-600 text-xs line-clamp-2 group-hover:text-zinc-500 transition-colors relative z-10">{cat.description}</p>
                        </div>
                    ))}
                </div>
            </div>
         ) : (
            // --- IDLE STATE / SYSTEM STANDBY ---
            <SystemStandby />
         )}
      </main>

      {/* --- CREATE THREAD MODAL --- (Unchanged) */}
      {showCreateThread && activeCategory && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4 overflow-y-auto">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl animate-scale-in shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                                {renderCategoryIcon(activeCategory.icon)}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Create New Topic</h3>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">in {activeCategory.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowCreateThread(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                        {/* Banner Upload */}
                        <div className="w-full h-32 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 transition-all group relative overflow-hidden">
                            {newThreadBanner ? (
                                <>
                                    <img src={newThreadBanner} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                                    <button onClick={(e) => { e.stopPropagation(); setNewThreadBanner(''); }} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-red-500"><X className="w-4 h-4"/></button>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-white transition-colors" />
                                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider group-hover:text-zinc-300">Add Cover Image</span>
                                    <input type="file" onChange={e => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload=()=>setNewThreadBanner(r.result as string); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                </>
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Title</label>
                            <input value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-lg font-bold outline-none focus:border-indigo-500 transition-colors placeholder-zinc-700" placeholder="What's this about?" />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Tags</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {newThreadTags.map(tag => (
                                    <span key={tag} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center gap-1 border border-indigo-500/30">
                                        {tag}
                                        <button onClick={() => setNewThreadTags(prev => prev.filter(t => t !== tag))} className="hover:text-white"><X className="w-3 h-3"/></button>
                                    </span>
                                ))}
                                <input 
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="bg-transparent text-white text-sm outline-none placeholder-zinc-600 min-w-[100px]"
                                    placeholder="+ Add tag (Enter)"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                             <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Content</label>
                             <textarea value={newThreadContent} onChange={e => setNewThreadContent(e.target.value)} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-sm outline-none resize-none h-40 focus:border-zinc-700 leading-relaxed custom-scrollbar" placeholder="Start the discussion..." />
                        </div>

                        {/* Attachments */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Attachments</label>
                                <button onClick={() => createThreadFileRef.current?.click()} className="text-xs text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1"><Paperclip className="w-3 h-3"/> Add Files</button>
                                <input type="file" ref={createThreadFileRef} className="hidden" onChange={handleCreateThreadFileSelect} multiple />
                            </div>
                            {newThreadAttachments.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                    {newThreadAttachments.map((att, i) => (
                                        <div key={i} className="relative w-20 h-20 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center shrink-0 group">
                                            {att.type === 'image' ? <img src={att.url} className="w-full h-full object-cover rounded-lg opacity-70" /> : <File className="w-8 h-8 text-zinc-600" />}
                                            <button onClick={() => setNewThreadAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t border-zinc-900 bg-black rounded-b-2xl flex justify-end gap-3">
                        <button onClick={() => setShowCreateThread(false)} className="px-6 py-2 text-zinc-500 text-sm font-bold hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleCreateForumThread} disabled={!newThreadTitle || !newThreadContent} className="px-8 py-2 bg-white text-black rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">Post Topic</button>
                    </div>
                </div>
            </div>
      )}

      {/* --- INFO PANEL --- */}
      {viewMode === 'chats' && activeChat && (
        <aside className={`w-[300px] bg-black border-l border-zinc-900 flex-col z-20 shrink-0 pt-[env(safe-area-inset-top)] ${showInfoPanel ? 'hidden md:flex' : 'hidden'}`}>
            <div className="h-16 flex items-center px-4 border-b border-zinc-900 bg-zinc-950 shrink-0">
                <div className="font-bold text-white text-base">Contact Info</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               <ChannelInfoContent 
                  activeChat={activeChat} 
                  user={user} 
                  profilesCache={profilesCache} 
                  groupLogoRef={groupLogoRef} 
                  handleGroupLogoUpload={handleGroupLogoUpload} 
                  setMiniProfileUser={setMiniProfileUser}
                  onUpdateDescription={handleUpdateDescription}
                  myFriends={myProfile?.friends || []}
                  onAddMembers={handleAddMembers}
                  onlineUsers={onlineUsers}
               />
            </div>
        </aside>
      )}

      {/* Mobile Info Overlay */}
      {showInfoPanel && activeChat && viewMode === 'chats' && (
        <div className="fixed inset-0 z-[60] bg-black md:hidden animate-fade-in flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="h-14 flex items-center px-4 border-b border-zinc-900">
                    <button onClick={() => setShowInfoPanel(false)} className="mr-4"><ChevronLeft className="w-6 h-6 text-zinc-400" /></button>
                    <h3 className="text-white font-bold">Info</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                <ChannelInfoContent 
                    activeChat={activeChat} 
                    user={user} 
                    profilesCache={profilesCache} 
                    groupLogoRef={groupLogoRef} 
                    handleGroupLogoUpload={handleGroupLogoUpload} 
                    setMiniProfileUser={setMiniProfileUser}
                    onUpdateDescription={handleUpdateDescription}
                    myFriends={myProfile?.friends || []}
                    onAddMembers={handleAddMembers}
                    onlineUsers={onlineUsers}
                />
            </div>
        </div>
      )}

      {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4 md:p-0">
           <div className="w-full h-full md:max-w-2xl md:h-[80vh] bg-black md:border border-zinc-800 md:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-scale-in">
              <div className="h-16 bg-zinc-950 border-b border-zinc-900 flex items-center px-6 justify-between shrink-0">
                  <h2 className="text-lg font-bold text-white">Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"><X className="w-6 h-6"/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-black">
                  <div className="h-40 bg-zinc-900 relative group cursor-pointer w-full shrink-0">
                    {settingsBanner ? <img src={settingsBanner} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold uppercase tracking-widest bg-gradient-to-br from-zinc-800 to-black">Upload Banner</div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="text-white w-8 h-8"/></div>
                    <input type="file" onChange={e => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload=()=>setSettingsBanner(r.result as string); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div className="px-8 pb-12">
                     <div className="-mt-14 mb-4 relative inline-block group cursor-pointer z-10">
                        <div className="w-28 h-28 rounded-full border-[6px] border-black bg-zinc-800 overflow-hidden shadow-xl">
                           {settingsAvatar ? <img src={settingsAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-500">{user.username[0]}</div>}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="text-white w-8 h-8"/></div>
                        <input type="file" onChange={e => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload=()=>setSettingsAvatar(r.result as string); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>
                     <div className="space-y-6">
                        <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-1">About</label><textarea value={settingsBio} onChange={e => setSettingsBio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white resize-none h-24 focus:border-zinc-600 outline-none text-sm" placeholder="Bio" /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Email</label><input value={settingsEmail} onChange={e => setSettingsEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white text-sm outline-none" placeholder="Email" /><div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={settingsShowEmail} onChange={e => setSettingsShowEmail(e.target.checked)} className="accent-white" /><span className="text-xs text-zinc-500">Publicly visible</span></div></div>
                     </div>
                  </div>
              </div>
              <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-3 shrink-0">
                 <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-medium">Cancel</button>
                 <button onClick={handleSaveProfile} className="px-6 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-200">Save</button>
              </div>
           </div>
         </div>
      )}

      {showAddFriend && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-black border border-zinc-800 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
              <h3 className="text-white font-bold mb-4 uppercase text-xs">New Contact</h3>
              
              {/* PENDING REQUESTS SECTION */}
              {(myProfile?.incomingRequests?.length || 0) > 0 ? (
                  <div className="mb-6 bg-zinc-900/50 rounded-xl p-3 border border-zinc-800">
                      <div className="text-[10px] font-bold text-red-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Pending Requests
                      </div>
                      <div className="space-y-2">
                          {myProfile?.incomingRequests.map(req => (
                              <div key={req} className="flex justify-between items-center bg-black p-2 rounded-lg border border-zinc-800">
                                  <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">{req[0]}</div>
                                     <span className="text-sm font-bold text-zinc-200">{req}</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => { handleAcceptFriend(req); addToast('Friend Accepted', 'success'); }} className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md transition-colors" title="Accept"><Check className="w-4 h-4"/></button>
                                      <button onClick={() => handleRejectFriend(req)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors" title="Decline"><X className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : null}

              <div className="mb-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Add by Username</label>
                  <input value={addFriendInput} onChange={e => setAddFriendInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-sm outline-none focus:border-white transition-colors" placeholder="Username" />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowAddFriend(false)} className="px-4 py-2 text-zinc-500 text-xs font-bold hover:text-white">Cancel</button>
                  <button onClick={() => { if(addFriendInput) { sendFriendRequest(user.username, addFriendInput.toLowerCase()); setShowAddFriend(false); addToast('Request Sent', 'success'); } }} className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200">Send Request</button>
              </div>
           </div>
         </div>
      )}

      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-black border border-zinc-800 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
              <h3 className="text-white font-bold mb-4 uppercase text-xs">New Group</h3>
              <input value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-sm mb-4 outline-none" placeholder="Group Subject" />
              <textarea value={groupDescInput} onChange={e => setGroupDescInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-sm mb-4 outline-none resize-none" placeholder="Description (Optional)" rows={2} />
              <div className="max-h-40 overflow-y-auto mb-4 bg-zinc-950 rounded-xl p-2 border border-zinc-900 custom-scrollbar">{myProfile?.friends.map(f => (<label key={f} className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded cursor-pointer"><input type="checkbox" className="accent-white" onChange={e => e.target.checked ? setSelectedFriendsForGroup(p=>[...p,f]) : setSelectedFriendsForGroup(p=>p.filter(x=>x!==f))} /><span className="text-zinc-300 text-sm font-medium">{f}</span></label>))}</div>
              <div className="flex justify-end gap-2"><button onClick={() => setShowCreateGroup(false)} className="px-4 py-2 text-zinc-500">Cancel</button><button onClick={handleCreateGroup} className="px-4 py-2 bg-white text-black rounded-lg font-bold">Create</button></div>
           </div>
         </div>
      )}
    </div>
  );
};

export default Dashboard;
