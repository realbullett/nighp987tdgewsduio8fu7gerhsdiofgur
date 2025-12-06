
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { User, ChatRoom, ChatMessage, UserProfile, MessageContent, Attachment, UserStatus } from '../types';
import { 
  getMessages, saveMessageToDB, prepareMessagePayload, getMyChats, getWelcomeChat,
  getUserProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
  createGroupChat, updateAvatar, updateProfile, decryptMessage, resizeImage, detectLinks,
  getDMChatId, updateGroupAvatar, addMessageReaction, deleteMessage, updateMessage, subscribeToGlobalMessages,
  getProfiles, updateGroupDescription, leaveGroup, addGroupMembers, fetchTenorGifs, TenorGif, supabase, fetchChatDetails, subscribeToPresence,
  markChatRead, fetchReadStates
} from '../utils';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  Send, LogOut, MessageSquare, Users, Hash, 
  UserPlus, Menu, Info, X, Check, Camera, Paperclip, 
  Image as ImageIcon, ExternalLink, Settings, Link as LinkIcon, Moon, Sparkles, Loader2,
  ChevronLeft, Plus, Smile, MoreVertical, Trash, Lock, Edit2, Copy, File, Download, UserMinus, Image, Mail,
  Search, Clapperboard, Flame, Gamepad2, Coffee, BookOpen, Music, ChevronRight, Circle, AlertTriangle
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
    
    if (status === 'online') colorClass = 'bg-green-500';
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

// --- 3D Sleeping Creature Component ---
const SleepingCreature = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none select-none">
      <div className="relative w-40 h-40 animate-float">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-purple-500/20 blur-[60px] rounded-full animate-pulse-slow"></div>
        
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
      
      <div className="mt-12 text-center relative z-10">
          <h3 className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs mb-2">Encrypted Feed Offline</h3>
          <p className="text-zinc-700 text-[10px] font-mono">Waiting for secure handshake...</p>
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

// --- SUB-COMPONENTS ---
// ... (OnboardingModal, GifPicker, MessageBubble, MiniProfile - Unchanged)

const OnboardingModal = ({ onCreateOwn, onTemplate, onSkip }: { onCreateOwn: () => void, onTemplate: (name: string, desc: string) => void, onSkip: () => void }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
            <div className="w-full max-w-lg bg-black border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col md:flex-row relative">
                <button onClick={onSkip} className="absolute top-4 right-4 text-zinc-600 hover:text-white z-20"><X className="w-5 h-5"/></button>
                
                {/* Left Side (Visual) */}
                <div className="w-full md:w-1/3 bg-zinc-900/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    <div className="relative z-10 transform scale-75 md:scale-90">
                        <SleepingCreature />
                    </div>
                </div>

                {/* Right Side (Content) */}
                <div className="flex-1 p-6 md:p-8 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-2 text-center md:text-left">Create Your First Haunt</h2>
                    <p className="text-zinc-500 text-xs mb-6 text-center md:text-left">Your space to lurk, chat, and vibe with others. Make it yours.</p>

                    <button 
                        onClick={onCreateOwn}
                        className="w-full p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between group transition-all mb-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black border border-zinc-700 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-zinc-300" />
                            </div>
                            <span className="font-bold text-sm text-zinc-200 group-hover:text-white">Create My Own</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white" />
                    </button>

                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Start from a template</div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        <button onClick={() => onTemplate("Gaming Lounge", "A place for late night raids and ranked matches.")} className="w-full p-2 rounded-lg hover:bg-zinc-900 flex items-center gap-3 group transition-colors text-left">
                            <Gamepad2 className="w-8 h-8 p-1.5 bg-purple-500/10 text-purple-400 rounded-lg" />
                            <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Gaming</span>
                        </button>
                        <button onClick={() => onTemplate("Late Night Chill", "Vibes, music, and quiet company.")} className="w-full p-2 rounded-lg hover:bg-zinc-900 flex items-center gap-3 group transition-colors text-left">
                            <Coffee className="w-8 h-8 p-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg" />
                            <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Friends & Chill</span>
                        </button>
                        <button onClick={() => onTemplate("Study Void", "Focus room for productive nights.")} className="w-full p-2 rounded-lg hover:bg-zinc-900 flex items-center gap-3 group transition-colors text-left">
                            <BookOpen className="w-8 h-8 p-1.5 bg-blue-500/10 text-blue-400 rounded-lg" />
                            <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Study Group</span>
                        </button>
                    </div>
                    
                    <div className="mt-auto pt-4 text-center">
                         <button onClick={onSkip} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-bold">Skip for now</button>
                    </div>
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
    
    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadGifs(search || (activeCategory === 'Trending' ? '' : activeCategory), true);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, activeCategory]);

    const loadGifs = async (query: string, reset: boolean = false) => {
        if (loading) return;
        setLoading(true);
        
        const pos = reset ? '' : nextCursor;
        const response = await fetchTenorGifs(query === 'Trending' ? '' : query, 20, pos);
        
        if (reset) {
            setGifs(response.results);
        } else {
            setGifs(prev => [...prev, ...response.results]);
        }
        
        setNextCursor(response.next);
        setLoading(false);
    };

    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 100 && nextCursor && !loading) {
                loadGifs(search || (activeCategory === 'Trending' ? '' : activeCategory), false);
            }
        }
    };

    return (
        <div className="absolute bottom-full right-0 mb-2 w-[350px] max-w-[95vw] bg-black border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col h-[400px] animate-scale-in">
            <div className="p-3 border-b border-zinc-900 bg-zinc-950">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input 
                        value={search}
                        onChange={e => { setSearch(e.target.value); if(e.target.value) setActiveCategory('Search'); }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-700 outline-none"
                        placeholder="Search Tenor GIFs..."
                        autoFocus
                    />
                </div>
                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {GIF_CATEGORIES.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => { setActiveCategory(cat); setSearch(''); setNextCursor(''); }}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${activeCategory === cat && !search ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                        >
                            {cat === 'Trending' && <Flame className="w-3 h-3 inline mr-1" />}
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-black"
            >
                <div className="grid grid-cols-2 gap-2">
                    {gifs.map(gif => (
                        <div 
                            key={gif.id} 
                            onClick={() => onSelect(gif.url)}
                            className="cursor-pointer rounded overflow-hidden bg-zinc-900 relative group aspect-video hover:ring-2 hover:ring-white transition-all"
                        >
                            <img src={gif.preview} alt={gif.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    ))}
                </div>
                {loading && (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
                    </div>
                )}
                {!loading && gifs.length === 0 && <div className="text-center text-zinc-600 text-xs py-10">No GIFs found.</div>}
            </div>
            
            <div className="p-2 border-t border-zinc-900 bg-zinc-950 flex justify-between items-center text-[10px] text-zinc-500">
                <span>Via Tenor</span>
                <button onClick={onClose} className="hover:text-white">Close</button>
            </div>
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
  isSequence: boolean;
  isLastInSequence: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  msg, isMe, senderProfile, chatId, onReact, isGroup, onDelete, onEdit, onProfileClick, isSequence, isLastInSequence
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

  const handleSaveEdit = () => {
    onEdit(msg.id, editText);
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start items-start'} ${isSequence ? 'mt-0.5' : 'mt-6'} ${hasReactions ? 'mb-2' : ''} group animate-fade-in-up relative`}>
      {/* Avatar (Left side) - Only show if not a sequence */}
      {!isMe && (
         <div className="w-8 h-8 mr-3 flex-shrink-0 pt-0 items-start"> 
            {!isSequence && (
              <div onClick={() => onProfileClick(msg.sender)} className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden cursor-pointer relative hover:scale-105 transition-transform items-start" title={msg.sender}>
                {senderProfile?.avatar ? (
                  <img src={senderProfile.avatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{msg.sender[0].toUpperCase()}</div>
                )}
              </div>
            )}
         </div>
      )}
      
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && !isSequence && (
          <div className="flex items-center gap-2 mb-1 ml-1">
             <span onClick={() => onProfileClick(msg.sender)} className="text-[12px] font-bold text-white hover:underline cursor-pointer flex items-center gap-1">
                {msg.sender}
                {msg.sender === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
             </span>
          </div>
        )}
        
        <div className={`
          relative p-3 shadow-sm transition-all group/bubble
          ${isMe 
            ? `bg-zinc-800 text-zinc-100 ${isSequence ? (isLastInSequence ? 'rounded-tr-md rounded-br-2xl rounded-l-2xl' : 'rounded-tr-md rounded-br-sm rounded-l-2xl') : (isLastInSequence ? 'rounded-2xl rounded-br-2xl' : 'rounded-2xl rounded-br-sm')}` 
            : `bg-zinc-950 text-zinc-200 border border-zinc-800 shadow-[0_0_10px_rgba(0,0,0,0.2)] ${isSequence ? (isLastInSequence ? 'rounded-tl-md rounded-bl-2xl rounded-r-2xl' : 'rounded-tl-md rounded-bl-sm rounded-r-2xl') : (isLastInSequence ? 'rounded-2xl rounded-bl-2xl' : 'rounded-2xl rounded-bl-sm')}`
          }
        `}>
          {/* Menu Trigger - Desktop Hover Menu */}
          <div className={`absolute -top-4 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10 md:flex hidden`}>
             <div className="bg-zinc-950 border border-zinc-800 rounded-full flex p-1 shadow-lg relative">
               {REACTION_EMOJIS.map(emoji => (
                 <button key={emoji} onClick={() => onReact(msg.id, emoji)} className="hover:scale-125 transition-transform px-1 text-sm">
                   {emoji}
                 </button>
               ))}
               <button onClick={() => setShowPicker(!showPicker)} className="hover:scale-125 transition-transform px-1 text-sm text-zinc-400 hover:text-white">
                 <Plus className="w-3 h-3" />
               </button>
               {showPicker && (
                  <div className="absolute top-full mt-2 left-0 w-64 bg-black border border-zinc-800 rounded-lg shadow-xl p-2 grid grid-cols-8 gap-1 z-50">
                     {MORE_EMOJIS.map(e => (
                        <button key={e} onClick={() => { onReact(msg.id, e); setShowPicker(false); }} className="text-sm hover:bg-zinc-800 rounded p-1">{e}</button>
                     ))}
                  </div>
               )}
             </div>
             {isMe && (
               <div className="bg-zinc-950 border border-zinc-800 rounded-full flex p-1 shadow-lg gap-1">
                  <button onClick={() => setIsEditing(true)} className="p-1 text-zinc-400 hover:text-white"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onDelete(msg.id)} className="p-1 text-zinc-400 hover:text-red-500"><Trash className="w-3 h-3" /></button>
               </div>
             )}
          </div>

          {/* Attachments */}
          {content.attachments && content.attachments.map((att, idx) => (
            <div key={idx} className="mb-2">
              {att.type === 'image' ? (
                 <div className="rounded-lg overflow-hidden border border-black/5 bg-black/5">
                    <img src={att.url} alt="attachment" className="max-w-full max-h-[300px] object-cover block" />
                 </div>
              ) : (
                 <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors">
                    <div className="p-2 bg-zinc-800 rounded text-zinc-400"><File className="w-5 h-5"/></div>
                    <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium text-zinc-200 truncate">{att.name || "File Attachment"}</div>
                       <div className="text-xs text-zinc-500">{att.size ? Math.round(att.size/1024) + ' KB' : 'Binary File'}</div>
                    </div>
                    <a href={att.url} download={att.name || "download"} className="p-2 text-zinc-400 hover:text-white"><Download className="w-4 h-4" /></a>
                 </div>
              )}
            </div>
          ))}

          {/* Text Content */}
          {isEditing ? (
             <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea 
                  value={editText} 
                  onChange={e => setEditText(e.target.value)} 
                  className="bg-black/50 text-white p-2 rounded text-sm border border-zinc-700 w-full"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                   <button onClick={() => setIsEditing(false)} className="text-xs text-zinc-400">Cancel</button>
                   <button onClick={handleSaveEdit} className="text-xs text-blue-400 font-bold">Save</button>
                </div>
             </div>
          ) : (
            content.text && <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{content.text}</div>
          )}

          {/* Links */}
          {links.length > 0 && !isEditing && links.map((link, i) => {
             // Updated Regex to support GIFs from Tenor which might include query params or end in .gif
             const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(link);
             return (
               <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={`block mt-2 rounded-lg overflow-hidden border transition-all ${isMe ? 'border-zinc-700 bg-zinc-900/20' : 'border-zinc-800 bg-black/50'}`}>
                 {isImage ? (
                   <div className="w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                      <img src={link} className="w-full h-auto max-h-[300px] object-cover opacity-90 hover:opacity-100 transition-opacity" />
                   </div>
                 ) : (
                   <div className="p-2 flex items-center gap-2 text-xs text-blue-400">
                      <LinkIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate underline">{link}</span>
                   </div>
                 )}
               </a>
             );
          })}

          {/* ABSOLUTE REACTIONS - Positioned overlapping the bubble corners */}
          {hasReactions && (
             <div className={`absolute -bottom-3 ${isMe ? 'left-[-10px]' : 'right-[-10px]'} flex gap-1 flex-wrap z-20`}>
               {Object.entries(content.reactions!).map(([emoji, users]) => (
                 <div key={emoji} className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20 ${users.length > 0 ? 'flex' : 'hidden'} ${isMe ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`} title={users.join(', ')} onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); }}>
                    <span>{emoji}</span>
                    <span className="font-bold">{users.length}</span>
                 </div>
               ))}
             </div>
          )}
        </div>
        
        {/* Footer */}
        <div className={`flex items-center gap-2 mt-1 ${isMe ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
          {isLastInSequence ? (
            <div className={`text-[9px] opacity-50 font-medium flex items-center gap-1`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <button 
                  onClick={() => setShowPicker(!showPicker)} 
                  className="md:hidden text-zinc-500 hover:text-white p-2 -my-2"
                >
                  <Smile className="w-3 h-3" />
                </button>
            </div>
          ) : (
             // Show reaction button on sequence messages for mobile access
             <button 
                onClick={() => setShowPicker(!showPicker)} 
                className="md:hidden text-zinc-500 hover:text-white p-2 -my-2 opacity-50"
             >
                <Smile className="w-3 h-3" />
             </button>
          )}

          {/* Mobile Reaction Picker Popup (Fixed Modal) */}
          {showPicker && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setShowPicker(false)}>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-[90%] max-w-[320px] shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                      <div className="text-center mb-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">React</div>
                      <div className="grid grid-cols-6 gap-3 mb-6">
                          {REACTION_EMOJIS.map(emoji => (
                              <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowPicker(false); }} className="text-3xl hover:bg-zinc-800 p-2 rounded-xl transition-colors flex items-center justify-center bg-black/50 border border-zinc-800/50">
                                  {emoji}
                              </button>
                          ))}
                      </div>
                      <div className="h-px bg-zinc-800 my-4"></div>
                      <div className="grid grid-cols-8 gap-2 h-48 overflow-y-auto custom-scrollbar p-1">
                          {MORE_EMOJIS.map(e => (
                              <button key={e} onClick={() => { onReact(msg.id, e); setShowPicker(false); }} className="text-xl hover:bg-zinc-800 rounded-lg p-2 flex items-center justify-center">{e}</button>
                          ))}
                      </div>
                      {isMe && (
                          <div className="mt-4 flex gap-3 pt-4 border-t border-zinc-800">
                              <button onClick={() => { setIsEditing(true); setShowPicker(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 rounded-xl text-sm font-bold text-white hover:bg-zinc-700 transition-colors"><Edit2 className="w-4 h-4"/> Edit</button>
                              <button onClick={() => { onDelete(msg.id); setShowPicker(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors"><Trash className="w-4 h-4"/> Delete</button>
                          </div>
                      )}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MiniProfileProps {
  username: string;
  initialData?: UserProfile;
  onClose: () => void;
  onMessage: (user: string) => void;
  status: UserStatus;
}

const MiniProfile: React.FC<MiniProfileProps> = ({ username, initialData, onClose, onMessage, status }) => {
    const [profile, setProfile] = useState<UserProfile | null>(initialData || null);
    
    useEffect(() => { 
        getUserProfile(username).then(p => {
            if (p) setProfile(p);
        }); 
    }, [username]);

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
                        <button onClick={() => onMessage(username)} className="mb-1 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-1 shadow-lg">
                           <MessageSquare className="w-3 h-3" /> Message
                        </button>
                    </div>
                    
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                            {username}
                            {username === 'night' && <VerifiedIcon className="w-5 h-5 text-[#1d9bf0]" />}
                        </h3>
                        <span className="text-zinc-500 text-xs font-mono mb-2">ID: {profile?.id?.slice(0,8)}</span>
                        
                        {profile?.show_email && profile?.public_email && (
                            <div className="flex items-center gap-2 mb-3 text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{profile.public_email}</span>
                            </div>
                        )}

                        {profile?.bio ? (
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                        ) : (
                            <p className="text-sm text-zinc-600 italic">No bio available.</p>
                        )}
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

const Dashboard: React.FC<ChatProps> = ({ user, onLogout }) => {
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [myChats, setMyChats] = useState<ChatRoom[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const [profilesCache, setProfilesCache] = useState<Record<string, UserProfile>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  // UI States
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'contacts'>('chats');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [miniProfileUser, setMiniProfileUser] = useState<string | null>(null);
  const [closedChatIds, setClosedChatIds] = useState<Set<string>>(new Set());
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
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
  const groupLogoRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Contacts Cache
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfile>>({});

  // Refs for Global Subscriptions (prevents stale closure issues)
  const activeChatIdRef = useRef<string | null>(null);
  const myChatsRef = useRef<ChatRoom[]>([]);
  // IMPORTANT: Track messages in Ref to allow global listener to check for dupes without re-running effect
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeChannelRef = useRef<RealtimeChannel | null>(null);
  const myProfileRef = useRef<UserProfile | null>(null);

  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
     const id = Date.now();
     setToasts(prev => [...prev, { id, message, type }]);
     setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // PRESENCE SUBSCRIPTION
  useEffect(() => {
     const presence = subscribeToPresence(user.username, (users) => {
         setOnlineUsers(users);
     });
     presenceRef.current = presence;
     
     return () => { presence.unsubscribe(); };
  }, [user.username]);

  const handleChangeStatus = (status: UserStatus) => {
      setUserStatus(status);
      presenceRef.current?.updateStatus(status);
      setShowStatusMenu(false);
  };
  
  const refreshData = async () => {
    const [profile, chats] = await Promise.all([
      getUserProfile(user.username),
      getMyChats(user.username)
    ]);
    setMyProfile(profile);
    setMyChats(chats);
    
    const participants = new Set<string>();
    chats.forEach(c => c.participants.forEach(p => participants.add(p)));
    if (profile?.friends) profile.friends.forEach(f => participants.add(f));
    if (profile?.incomingRequests) profile.incomingRequests.forEach(f => participants.add(f));
    
    if (participants.size > 0) {
        getProfiles(Array.from(participants)).then(p => {
            setProfilesCache(prev => ({...prev, ...p}));
            setFriendProfiles(p);
        });
    }
  };

  useEffect(() => {
    const init = async () => {
      const closed = localStorage.getItem('night_closed_chats');
      if (closed) setClosedChatIds(new Set(JSON.parse(closed)));

      if (Notification.permission === 'default') await Notification.requestPermission();
      
      const [profile, welcome, chats] = await Promise.all([
        getUserProfile(user.username),
        getWelcomeChat(),
        getMyChats(user.username)
      ]);
      
      // Initial Sort (Crucial for offline loading)
      const sortedChats = chats.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
      setMyChats(sortedChats);
      setMyProfile(profile);
      
      // Compute Offline Unread Counts
      try {
          const reads = await fetchReadStates(user.username);
          const counts: Record<string, number> = {};
          
          sortedChats.forEach(chat => {
              const lastRead = reads[chat.id] || 0;
              const lastMsgTime = chat.lastMessage?.timestamp || 0;
              
              // Only mark as unread if the last message is significantly newer than the read receipt
              // This helps prevent clock skew issues where user reads a message at 12:00:00 but server says msg is 12:00:01
              if (lastMsgTime > lastRead + 1000) { 
                  counts[chat.id] = 1;
              }
          });
          setUnreadCounts(counts);
      } catch(e) { console.error(e); }

      // Onboarding Check
      const onboardingKey = `night_onboarding_completed_${user.username}`;
      const hasCompletedOnboarding = localStorage.getItem(onboardingKey);
      if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
      }
      
      if (profile) {
          setSettingsAvatar(profile.avatar);
          setSettingsBanner(profile.banner || '');
          setSettingsBio(profile.bio || '');
          setSettingsEmail(profile.public_email || '');
          setSettingsShowEmail(profile.show_email || false);
      }

      const allUsers = new Set<string>();
      chats.forEach(c => c.participants.forEach(p => allUsers.add(p)));
      if (profile?.friends) profile.friends.forEach(f => allUsers.add(f));
      if (profile?.incomingRequests) profile.incomingRequests.forEach(r => allUsers.add(r));
      
      if (allUsers.size > 0) {
          const profiles = await getProfiles(Array.from(allUsers));
          setProfilesCache(profiles);
          setFriendProfiles(profiles);
      }

      setLoadingInitial(false);
    };
    init();
  }, [user.username]);

  useEffect(() => {
     if (activeChat) {
         getProfiles(activeChat.participants).then(profiles => {
             setProfilesCache(prev => ({ ...prev, ...profiles }));
         });
         // Mark as read immediately when opening, using the timestamp of the latest message
         setUnreadCounts(prev => ({ ...prev, [activeChat.id]: 0 }));
         markChatRead(activeChat.id, user.username, activeChat.lastMessage?.timestamp || 0);
     }
  }, [activeChat?.id, activeChat?.lastMessage?.timestamp]);

  // Sync refs for subscriptions
  useEffect(() => { activeChatIdRef.current = activeChat?.id || null; }, [activeChat]);
  useEffect(() => { myChatsRef.current = myChats; }, [myChats]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // --- BROADCAST CHANNEL SUBSCRIPTION (For Active Chat Instant Speed) ---
  useEffect(() => {
     if (!activeChat) return;

     const channelId = `room:${activeChat.id}`;
     // Join a dedicated channel for this chat to listen to broadcasts
     const channel = supabase.channel(channelId);

     channel
       .on('broadcast', { event: 'message' }, async (event: any) => {
          const payload = event.payload;
          // 1. DEDUPLICATION: If we already have this message (via Optimistic or DB), ignore it
          if (messagesRef.current.some(m => m.id === payload.id)) {
              return;
          }

          // 2. Decrypt immediately
          let contentStr = '';
          try {
              contentStr = await decryptMessage(payload.iv, payload.content, activeChat.id);
          } catch(e) { console.error("Broadcast Decrypt Fail", e); }

          const newMsg: ChatMessage = {
              id: payload.id,
              sender: payload.sender,
              content: contentStr,
              timestamp: new Date(payload.created_at).getTime()
          };

          // 3. Update Messages List
          setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
          });
          
          // Mark read immediately if we are in this chat
          markChatRead(activeChat.id, user.username, newMsg.timestamp);

          // 4. Update Chat Sidebar AND SORT
          setMyChats(prevChats => {
             const updated = prevChats.map(c => c.id === activeChat.id ? { ...c, lastMessage: newMsg } : c);
             return updated.sort((a, b) => ((b.lastMessage?.timestamp as number) || 0) - ((a.lastMessage?.timestamp as number) || 0));
          });
          
          try { audioRef.current.play(); } catch(e){}
       })
       .subscribe();

     activeChannelRef.current = channel;

     // Cleanup: Leave channel when switching chats
     return () => {
         supabase.removeChannel(channel);
         activeChannelRef.current = null;
     };
  }, [activeChat?.id]);


  // --- GLOBAL DATABASE SUBSCRIPTION (For Background / Sidebar / Friends Updates) ---
  useEffect(() => {
    const handleMessageEvent = async (payload: any) => {
       const eventType = payload.eventType;
       const newRecord = payload.new;
       const oldRecord = payload.old;

       // Handle INSERT (New Messages via DB)
       if (eventType === 'INSERT') {
          const chatId = newRecord.chat_id;
          const belongsToMyChat = myChatsRef.current.some(c => c.id === chatId);
          
          if (belongsToMyChat) {
             // 1. Decrypt
             let contentStr = '';
             try {
                contentStr = await decryptMessage(newRecord.iv, newRecord.content, chatId);
             } catch(e) { }

             const newMessageObj: ChatMessage = {
                 id: newRecord.id,
                 sender: newRecord.sender,
                 content: contentStr,
                 timestamp: new Date(newRecord.created_at).getTime()
             };

             // 2. Update Active Chat (Check for duplicates first!)
             if (activeChatIdRef.current === chatId) {
                 setMessages(prev => {
                     // If we already have it (from Broadcast or Optimistic), ignore DB event
                     if (prev.some(m => m.id === newMessageObj.id)) return prev;
                     return [...prev, newMessageObj];
                 });
                 // Mark read since we are looking at it
                 markChatRead(chatId, user.username, newMessageObj.timestamp);
             } else {
                setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
                try { audioRef.current.play(); } catch(e){}
             }

             // 3. Update Sidebar (Always sync with DB truth) & SORT
             setMyChats(prevChats => {
                 const updatedChats = prevChats.map(chat => {
                     if (chat.id === chatId) {
                         // Only update if timestamp is newer (avoids overwriting optimistic updates with old data)
                         if (!chat.lastMessage || (newMessageObj.timestamp as number) >= (chat.lastMessage.timestamp as number)) {
                             return { ...chat, lastMessage: newMessageObj };
                         }
                     }
                     return chat;
                 });
                 return updatedChats.sort((a, b) => {
                     const tA = a.lastMessage?.timestamp || 0;
                     const tB = b.lastMessage?.timestamp || 0;
                     return tB - tA;
                 });
             });
          } else {
              // Unknown chat (New DM or Group invite) -> Auto Fetch
              const newChat = await fetchChatDetails(chatId);
              if (newChat && newChat.participants.includes(user.username)) {
                  // Decrypt initial message
                  let contentStr = 'Encrypted Message';
                  try { contentStr = await decryptMessage(newRecord.iv, newRecord.content, chatId); } catch {}
                  
                  const msg = { id: newRecord.id, sender: newRecord.sender, content: contentStr, timestamp: new Date(newRecord.created_at).getTime() };
                  const chatWithMsg = { ...newChat, lastMessage: msg };

                  // Add to top of list
                  setMyChats(prev => [chatWithMsg, ...prev]);
                  setUnreadCounts(prev => ({ ...prev, [chatId]: 1 }));
                  try { audioRef.current.play(); } catch(e){}
              }
          }
       }
       
       // Handle UPDATE (Edits, Reactions)
       if (eventType === 'UPDATE') {
           const chatId = newRecord.chat_id;
           if (activeChatIdRef.current === chatId) {
               try {
                   const contentStr = await decryptMessage(newRecord.iv, newRecord.content, chatId);
                   setMessages(prev => prev.map(m => m.id === newRecord.id ? { ...m, content: contentStr } : m));
               } catch(e) {}
           }
       }

       // Handle DELETE
       if (eventType === 'DELETE') {
           if (activeChatIdRef.current) {
               setMessages(prev => prev.filter(m => m.id !== oldRecord.id));
           }
       }
    };

    const handleChatEvent = async (payload: any) => {
       const eventType = payload.eventType;
       const newRecord = payload.new;
       
       // Handle NEW CHATS (e.g. Someone added you to a group)
       if (eventType === 'INSERT') {
           if (newRecord.participants.includes(user.username)) {
               // Check if we already have it (Optimistic creation)
               if (!myChatsRef.current.some(c => c.id === newRecord.id)) {
                   setMyChats(prev => [newRecord, ...prev]);
                   addToast(`Added to ${newRecord.name || 'a new chat'}`, 'info');
               }
           }
       }

       // Handle CHATS Table Updates (Avatars, Descriptions, Members)
       if (eventType === 'UPDATE') {
           const updatedChat = newRecord as ChatRoom;
           // If we are part of this chat
           if (updatedChat.participants.includes(user.username)) {
               setMyChats(prev => {
                   const mapped = prev.map(c => c.id === updatedChat.id ? { ...c, ...updatedChat, lastMessage: c.lastMessage } : c);
                   // Maintain sort
                   return mapped.sort((a,b) => (b.lastMessage?.timestamp||0) - (a.lastMessage?.timestamp||0));
               });

               if (activeChatIdRef.current === updatedChat.id) {
                   setActiveChat(prev => prev ? { ...prev, ...updatedChat } : null);
               }
               
               // Fetch profiles for new members if needed
               const newMembers = updatedChat.participants.filter(p => !Object.keys(profilesCache).includes(p));
               if (newMembers.length > 0) {
                   getProfiles(newMembers).then(p => setProfilesCache(prev => ({...prev, ...p})));
               }
           }
       }
    };

    const handleFriendEvent = async (payload: any) => {
        const eventType = payload.eventType;
        const newRecord = payload.new;
        const oldRecord = payload.old;

        // NEW FRIEND REQUEST
        if (eventType === 'INSERT') {
            if (newRecord.receiver === user.username) {
                setMyProfile(prev => prev ? {
                    ...prev,
                    incomingRequests: [...prev.incomingRequests, newRecord.sender]
                } : null);
                
                // Fetch sender profile immediately
                const profiles = await getProfiles([newRecord.sender]);
                setFriendProfiles(prev => ({...prev, ...profiles}));
                addToast(`New friend request from ${newRecord.sender}`, 'info');
                try { audioRef.current.play(); } catch(e){}
            }
        }

        // FRIEND REQUEST STATUS CHANGE (Accepted)
        if (eventType === 'UPDATE') {
            // Case A: You accepted them (handled optimistically, but this ensures sync)
            // Case B: They accepted you
            if (newRecord.status === 'accepted') {
                const friendName = newRecord.sender === user.username ? newRecord.receiver : newRecord.sender;
                
                // Add to friends list if not already there
                setMyProfile(prev => {
                    if (!prev) return null;
                    if (prev.friends.includes(friendName)) return prev;
                    return { ...prev, friends: [...prev.friends, friendName] };
                });

                // Remove from pending lists
                setMyProfile(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        incomingRequests: prev.incomingRequests.filter(r => r !== friendName),
                        outgoingRequests: prev.outgoingRequests.filter(r => r !== friendName)
                    };
                });
                
                // Fetch profile
                const profiles = await getProfiles([friendName]);
                setFriendProfiles(prev => ({...prev, ...profiles}));

                if (newRecord.sender === user.username) {
                     addToast(`${friendName} accepted your request`, 'success');
                }
            }
        }

        // FRIEND REMOVED / REQUEST REJECTED
        if (eventType === 'DELETE') {
            const sender = oldRecord.sender;
            const receiver = oldRecord.receiver;
            const otherPerson = sender === user.username ? receiver : sender;

            setMyProfile(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    friends: prev.friends.filter(f => f !== otherPerson),
                    incomingRequests: prev.incomingRequests.filter(f => f !== otherPerson),
                    outgoingRequests: prev.outgoingRequests.filter(f => f !== otherPerson)
                };
            });
        }
    };

    const unsub = subscribeToGlobalMessages(handleMessageEvent, handleChatEvent, handleFriendEvent);

    return () => { unsub(); };
  }, [user.username]); // Re-subscribe if user changes (rare)

  // Fetch history when switching chats
  useEffect(() => {
    if (!activeChat) return;
    setUnreadCounts(prev => ({ ...prev, [activeChat.id]: 0 }));
    // Fetch latest DB messages to fill gaps
    getMessages(activeChat.id).then(msgs => {
        // Merge with any optimistic/broadcast messages we might already have? 
        // Simpler: Just set them, but keep any that are newer than DB (rare edge case)
        setMessages(msgs);
    });
  }, [activeChat?.id]);

  useLayoutEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages, activeChat?.id]);
  
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputText;
    
    if ((!textToSend.trim() && attachments.length === 0) || !activeChat) return;
    if (activeChat.id === OFFICIAL_CHAT_ID && user.username !== 'night') return;

    const payload: MessageContent = { text: textToSend, attachments: attachments.length > 0 ? attachments : undefined };
    const contentString = JSON.stringify(payload);
    
    // 1. Generate ID Client-Side
    const tempId = crypto.randomUUID(); 
    const timestamp = Date.now();
    const isoTimestamp = new Date(timestamp).toISOString();

    // 2. Optimistic UI Update (Immediate Display)
    const optimisticMsg: ChatMessage = { id: tempId, sender: user.username, content: contentString, timestamp };
    
    setMessages(prev => [...prev, optimisticMsg]);
    
    // Update Sidebar Immediately AND SORT
    setMyChats(prev => {
        const updated = prev.map(c => c.id === activeChat.id ? { ...c, lastMessage: optimisticMsg } : c);
        return updated.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
    });

    if (!overrideText) {
        setInputText(''); setAttachments([]);
        if (textAreaRef.current) textAreaRef.current.style.height = 'auto';
    }

    try {
      // 3. Encrypt Payload
      const encrypted = await prepareMessagePayload(activeChat.id, contentString);

      // 4. BROADCAST to peers via WebSocket (Fastest Path)
      // This sends the message directly to other online users in this chat
      if (activeChannelRef.current) {
          await activeChannelRef.current.send({
              type: 'broadcast',
              event: 'message',
              payload: {
                  id: tempId,
                  sender: user.username,
                  content: encrypted.data,
                  iv: encrypted.iv,
                  chat_id: activeChat.id,
                  created_at: isoTimestamp
              }
          });
      }

      // 5. Persist to DB (Background Sync)
      // We don't await this to block UI, but we catch errors
      await saveMessageToDB(activeChat.id, user.username, encrypted, tempId);
      
      // Update read receipt to the timestamp of the message we just sent
      markChatRead(activeChat.id, user.username, timestamp);
      
    } catch (err) {
      console.error("Failed to send", err);
      // Show error toast
      addToast("Failed to save message to history", "alert");
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
          if (file.type.startsWith('image/')) {
              url = await resizeImage(url, 800, 800, 0.7);
          }
          const type = file.type.startsWith('image/') ? 'image' : 'file';
          setAttachments(prev => [...prev, { type, url, name: file.name, size: file.size, mimeType: file.type }]);
        };
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReaction = async (messageId: string, emoji: string) => {
     if (!activeChat) return;
     setMessages(prev => prev.map(msg => {
       if (msg.id !== messageId) return msg;
       let content: MessageContent = { text: msg.content };
       try { content = JSON.parse(msg.content); } catch {}
       if (!content.reactions) content.reactions = {};
       const current = content.reactions[emoji] || [];
       if (current.includes(user.username)) {
         content.reactions[emoji] = current.filter(u => u !== user.username);
         if (content.reactions[emoji].length === 0) delete content.reactions[emoji];
       } else {
         content.reactions[emoji] = [...current, user.username];
       }
       return { ...msg, content: JSON.stringify(content) };
     }));
     try { await addMessageReaction(activeChat.id, messageId, emoji, user.username); } catch (e) {}
  };
  
  // OPTIMISTIC FRIEND ACTIONS
  const handleAcceptFriend = async (req: string) => {
      // 1. Optimistic UI
      setMyProfile(prev => prev ? {
          ...prev,
          incomingRequests: prev.incomingRequests.filter(r => r !== req),
          friends: [...prev.friends, req]
      } : null);

      // 2. DB Update
      await acceptFriendRequest(user.username, req);
      
      // 3. Refresh (optional to sync avatars etc)
      // refreshData(); 
  };

  const handleRejectFriend = async (req: string) => {
      setMyProfile(prev => prev ? {
          ...prev,
          incomingRequests: prev.incomingRequests.filter(r => r !== req)
      } : null);
      await rejectFriendRequest(user.username, req);
  };
  
  const handleFriendRemove = async (friend: string) => {
      if (confirm(`Remove ${friend} from contacts?`)) {
          setMyProfile(prev => prev ? {
              ...prev,
              friends: prev.friends.filter(f => f !== friend)
          } : null);
          await removeFriend(user.username, friend);
      }
  };

  const handleRemoveChat = async (e: React.MouseEvent, chat: ChatRoom) => {
      e.stopPropagation();
      
      if (chat.type === 'group') {
          if (confirm(`Are you sure you want to leave ${chat.name}?`)) {
              await leaveGroup(chat.id, user.username);
              setMyChats(prev => prev.filter(c => c.id !== chat.id));
              if (activeChat?.id === chat.id) setActiveChat(null);
              addToast("Left Group", "info");
          }
      } else {
          // Close DM (Hide)
          const newSet = new Set(closedChatIds);
          newSet.add(chat.id);
          setClosedChatIds(newSet);
          localStorage.setItem('night_closed_chats', JSON.stringify(Array.from(newSet)));
          if (activeChat?.id === chat.id) setActiveChat(null);
      }
  };
  
  const handleMessageUser = async (targetUsername: string) => {
      if (targetUsername === user.username) return;
      let chat = myChats.find(c => c.type === 'dm' && c.participants.includes(targetUsername));
      if (!chat) {
          const chatId = getDMChatId(user.username, targetUsername);
          chat = {
              id: chatId, type: 'dm', name: targetUsername, participants: [user.username, targetUsername], avatar: ''
          };
          // Optimistically add chat
          setMyChats(p => [chat!, ...p]);
      }
      setMiniProfileUser(null);
      setActiveChat(chat);
      setSidebarTab('chats');
  };
  
  const handleCreateGroup = async () => {
      setShowCreateGroup(false);
      // Optimistic Chat Creation is hard because we need the real ID for other users to find it?
      // Actually we generate ID in frontend, so we can be optimistic!
      
      // BUT `createGroupChat` function does the logic. Let's wrap it.
      try {
          const newChat = await createGroupChat(groupNameInput, groupDescInput, user.username, selectedFriendsForGroup);
          
          setMyChats(p => [newChat, ...p]);
          setActiveChat(newChat);
          
          setGroupNameInput('');
          setGroupDescInput('');
          setSelectedFriendsForGroup([]);
      } catch(e) { console.error(e); }
  };
  
  const handleCreateFromTemplate = async (name: string, desc: string) => {
      try {
          const newChat = await createGroupChat(name, desc, user.username, []);
          setMyChats(p => [newChat, ...p]);
          setActiveChat(newChat);
          handleOnboardingComplete();
      } catch(e) { console.error(e); }
  };

  const handleSaveProfile = async () => {
      await updateProfile(user.username, { 
          avatar: settingsAvatar, 
          banner: settingsBanner, 
          bio: settingsBio,
          public_email: settingsEmail,
          show_email: settingsShowEmail
      });
      user.avatar = settingsAvatar; 
      refreshData();
      setShowSettings(false);
      addToast("Profile Updated", 'success');
  };
  
  const handleGroupLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files?.[0] && activeChat) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = async () => {
           const res = await resizeImage(reader.result as string, 200, 200);
           await updateGroupAvatar(activeChat.id, res);
           setActiveChat(p => p ? {...p, avatar: res} : null);
           refreshData();
           addToast("Group Icon Updated", 'success');
        };
        reader.readAsDataURL(file);
     }
  };

  const handleUpdateDescription = async (desc: string) => {
    if (!activeChat) return;
    await updateGroupDescription(activeChat.id, desc);
    const updated = { ...activeChat, description: desc };
    setActiveChat(updated);
    setMyChats(prev => prev.map(c => c.id === activeChat.id ? updated : c));
    addToast("Description updated", "success");
  };

  const handleAddMembers = async (newMembers: string[]) => {
    if (!activeChat) return;
    await addGroupMembers(activeChat.id, newMembers);
    const updatedParticipants = [...activeChat.participants, ...newMembers];
    const updatedChat = { ...activeChat, participants: updatedParticipants };
    setActiveChat(updatedChat);
    setMyChats(prev => prev.map(c => c.id === activeChat.id ? updatedChat : c));
    addToast("Members added", "success");
    getProfiles(newMembers).then(p => {
        setProfilesCache(prev => ({...prev, ...p}));
    });
  };
  
  const handleOnboardingComplete = () => {
      setShowOnboarding(false);
      localStorage.setItem(`night_onboarding_completed_${user.username}`, 'true');
  };

  // FILTER LOGIC
  const displayedChats = myChats.filter(c => !closedChatIds.has(c.id)).filter(c => {
      if (!searchQuery) return true;
      const lowerQ = searchQuery.toLowerCase();
      if (c.name.toLowerCase().includes(lowerQ)) return true;
      if (c.type === 'dm') {
          const other = c.participants.find(p => p !== user.username);
          if (other?.toLowerCase().includes(lowerQ)) return true;
      }
      return false;
  });

  const displayedFriends = (myProfile?.friends || [])
    .filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
        // Sort: Online/Busy/Idle first, then Offline/Invisible
        const statusA = onlineUsers[a] || 'offline';
        const statusB = onlineUsers[b] || 'offline';
        const isOnlineA = statusA !== 'offline' && statusA !== 'invisible';
        const isOnlineB = statusB !== 'offline' && statusB !== 'invisible';
        
        if (isOnlineA && !isOnlineB) return -1;
        if (!isOnlineA && isOnlineB) return 1;
        return a.localeCompare(b);
    });

  const totalUnread = Object.values(unreadCounts).reduce((a: number, b: number) => a + b, 0);
  const totalUnreadLabel = totalUnread > 99 ? '99+' : totalUnread.toString();

  if (loadingInitial) return <div className="h-full w-full bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-500"/></div>;

  return (
    <div className="flex h-full w-full bg-black text-zinc-200 overflow-hidden font-sans relative">
      
      <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
         {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-in-right ${t.type === 'alert' ? 'bg-red-950/90 border-red-900 text-red-200' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
               {t.type === 'success' ? <Check className="w-4 h-4 text-green-400" /> : (t.type === 'alert' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Info className="w-4 h-4 text-blue-400" />)}
               <span className="text-sm font-medium">{t.message}</span>
            </div>
         ))}
      </div>

      {/* Onboarding Modal for New Users */}
      {showOnboarding && (
          <OnboardingModal 
              onSkip={handleOnboardingComplete}
              onCreateOwn={() => { setShowCreateGroup(true); handleOnboardingComplete(); }}
              onTemplate={handleCreateFromTemplate}
          />
      )}

      {miniProfileUser && <MiniProfile key={miniProfileUser} username={miniProfileUser} initialData={profilesCache[miniProfileUser]} onClose={() => setMiniProfileUser(null)} onMessage={handleMessageUser} status={onlineUsers[miniProfileUser] || 'offline'} />}

      <aside className={`md:flex flex-col w-full md:w-[320px] bg-black border-r border-zinc-900 transition-all ${activeChat ? 'hidden' : 'flex'}`}>
        <div className="flex pt-[env(safe-area-inset-top)] border-b border-zinc-900 bg-black/50 min-h-[3.5rem] items-end">
           <div className="flex w-full px-2 pb-2 gap-1">
             <button onClick={() => { setSidebarTab('chats'); setSearchQuery(''); }} className={`flex-1 py-2 text-[11px] font-bold rounded transition-colors relative flex items-center justify-center gap-2 ${sidebarTab === 'chats' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                CHATS
                {totalUnread > 0 && <span className="bg-red-500 text-white text-[9px] px-1 rounded-full">{totalUnreadLabel}</span>}
             </button>
             <button onClick={() => { setSidebarTab('contacts'); setSearchQuery(''); }} className={`flex-1 py-2 text-[11px] font-bold rounded transition-colors relative ${sidebarTab === 'contacts' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
               CONTACTS
               {(myProfile?.incomingRequests?.length || 0) > 0 && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
           {sidebarTab === 'chats' ? (
             <>
               <button onClick={() => setShowCreateGroup(true)} className="w-full py-2 mb-2 rounded border border-dashed border-zinc-900 text-zinc-600 text-[10px] font-bold hover:bg-zinc-900 flex items-center justify-center gap-2"><Plus className="w-3 h-3" /> NEW GROUP</button>
               
               {/* Search Bar for Chats */}
               <div className="px-1 mb-3">
                   <div className="relative group">
                       <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-500 group-focus-within:text-white transition-colors" />
                       <input 
                           value={searchQuery}
                           onChange={e => setSearchQuery(e.target.value)}
                           className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-zinc-700 rounded-xl py-2 pl-8 pr-3 text-[11px] text-white placeholder-zinc-600 outline-none transition-all"
                           placeholder="Search chats..."
                       />
                       {searchQuery && (
                           <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-zinc-500 hover:text-white">
                               <X className="w-3 h-3" />
                           </button>
                       )}
                   </div>
               </div>

               {displayedChats.length === 0 && searchQuery && (
                    <div className="text-center text-zinc-600 text-[10px] mt-4">No chats found.</div>
               )}

               {displayedChats.map(chat => {
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
                 const badgeLabel = unread > 99 ? '99+' : unread.toString();
                 
                 let lastMsgText = '';
                 if (chat.lastMessage) {
                     try {
                         const content = JSON.parse(chat.lastMessage.content);
                         lastMsgText = content.text || (content.attachments?.length ? 'Attachment' : '');
                     } catch { lastMsgText = chat.lastMessage.content; }
                 }

                 return (
                   <button 
                     key={chat.id}
                     onClick={() => setActiveChat(chat)}
                     className={`w-full text-left p-2 rounded-xl mx-0.5 flex items-center gap-3 transition-all group relative ${isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-900/50 text-zinc-500'} ${unread > 0 ? 'bg-zinc-900/30 border-l-2 border-purple-500 pl-3 shadow-[inset_10px_0_20px_-10px_rgba(168,85,247,0.1)]' : ''}`}
                   >
                     <div className="relative shrink-0 w-10 h-10">
                        <div className={`w-full h-full rounded-full flex items-center justify-center border overflow-hidden relative ${isActive ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-900 bg-black'}`}>
                            {displayAvatar ? (
                                <img src={displayAvatar} className="w-full h-full object-cover" />
                            ) : (
                                isOff ? <Moon className="w-5 h-5 text-purple-400 fill-purple-400" /> : (chat.type === 'group' ? <Hash className="w-5 h-5" /> : <span className="font-bold text-lg">{displayName[0]?.toUpperCase()}</span>)
                            )}
                        </div>
                        {chatStatus && chatStatus !== 'offline' && chatStatus !== 'invisible' && (
                                <StatusIndicator status={chatStatus} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5" />
                        )}
                        {unread > 0 && <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center shadow-lg border border-black px-1">{badgeLabel}</div>}
                     </div>

                     <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate flex items-center gap-1 ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'} ${unread > 0 ? 'text-white' : ''}`}>
                             {displayName} {isVerified && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                        </div>
                        <div className="flex justify-between items-center w-full">
                            <div className={`text-xs truncate max-w-[120px] ${unread > 0 ? 'text-zinc-300 font-medium' : 'opacity-60'}`}>{lastMsgText}</div>
                            {chat.lastMessage && <div className="text-[9px] opacity-40">{new Date(chat.lastMessage.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>}
                        </div>
                     </div>
                     {!isOff && (
                         <div onClick={(e) => handleRemoveChat(e, chat)} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 hover:text-white hover:bg-red-500/20 rounded transition-all" title={chat.type === 'group' ? "Leave Group" : "Close Chat"}>
                             <X className={`w-3 h-3 ${chat.type === 'group' ? 'text-red-400' : ''}`} />
                         </div>
                     )}
                   </button>
                 );
               })}
             </>
           ) : (
             <>
                <button onClick={() => setShowAddFriend(true)} className="w-full py-2 mb-4 rounded bg-zinc-900 text-white text-[10px] font-bold hover:bg-zinc-800 flex items-center justify-center gap-2 shadow-lg"><UserPlus className="w-3 h-3" /> ADD FRIEND</button>
                
                {/* Search Bar for Contacts */}
                <div className="px-1 mb-3">
                   <div className="relative group">
                       <Search className="absolute left-3 top-2.5 w-3 h-3 text-zinc-500 group-focus-within:text-white transition-colors" />
                       <input 
                           value={searchQuery}
                           onChange={e => setSearchQuery(e.target.value)}
                           className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-zinc-700 rounded-xl py-2 pl-8 pr-3 text-[11px] text-white placeholder-zinc-600 outline-none transition-all"
                           placeholder="Search contacts..."
                       />
                       {searchQuery && (
                           <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-zinc-500 hover:text-white">
                               <X className="w-3 h-3" />
                           </button>
                       )}
                   </div>
               </div>

                {(myProfile?.incomingRequests?.length || 0) > 0 && !searchQuery && (
                    <div className="mb-4">
                        <div className="px-2 text-[10px] font-bold text-zinc-600 uppercase mb-2 tracking-wider flex items-center gap-2">Pending Requests <div className="h-px bg-zinc-900 flex-1"></div></div>
                        {myProfile?.incomingRequests.map(req => {
                            const p = friendProfiles[req];
                            return (
                               <div key={req} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 mb-1 border border-zinc-900">
                                 <div className="flex items-center gap-2">
                                     <div className="w-8 h-8 rounded-full bg-zinc-900 overflow-hidden">{p?.avatar ? <img src={p.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{req[0]}</div>}</div>
                                     <span className="text-sm text-zinc-300 font-bold">{req}</span>
                                 </div>
                                 <div className="flex gap-1">
                                   <button onClick={() => handleAcceptFriend(req)} className="p-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"><Check className="w-3 h-3"/></button>
                                   <button onClick={() => handleRejectFriend(req)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><X className="w-3 h-3"/></button>
                                 </div>
                               </div>
                            )
                        })}
                    </div>
                )}
                <div>
                   <div className="px-2 text-[10px] font-bold text-zinc-600 uppercase mb-2 tracking-wider flex items-center gap-2">Friends — {displayedFriends.length} <div className="h-px bg-zinc-900 flex-1"></div></div>
                   
                   {displayedFriends.length === 0 && searchQuery && (
                        <div className="text-center text-zinc-600 text-[10px] mt-4">No contacts found.</div>
                   )}

                   {displayedFriends.map(friend => {
                       const p = friendProfiles[friend];
                       const isVer = friend === 'night';
                       const status = onlineUsers[friend] || 'offline';
                       
                       return (
                          <div key={friend} className="w-full text-left p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 group transition-all cursor-pointer" onClick={() => handleMessageUser(friend)}>
                            <div className="relative w-9 h-9 shrink-0">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center border border-zinc-900 text-xs font-bold overflow-hidden relative">
                                    {p?.avatar ? <img src={p.avatar} className="w-full h-full object-cover"/> : friend[0].toUpperCase()}
                                </div>
                                {status !== 'offline' && status !== 'invisible' && <StatusIndicator status={status} className="absolute -bottom-0.5 -right-0.5 w-3 h-3" />}
                            </div>
                            <span className="text-sm font-medium flex-1 flex items-center gap-1">
                                {friend} {isVer && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); handleFriendRemove(friend); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 rounded bg-zinc-950 border border-zinc-900"><Trash className="w-3 h-3"/></button>
                          </div>
                       )
                   })}
                </div>
             </>
           )}
        </div>

        <div className="h-14 bg-black flex items-center px-3 border-t border-zinc-900 justify-between shrink-0 pb-[env(safe-area-inset-bottom)] box-content relative">
            <div className="flex items-center gap-3 overflow-hidden hover:bg-zinc-900/50 p-1.5 rounded-lg cursor-pointer transition-colors" onClick={() => setShowStatusMenu(!showStatusMenu)}>
               <div className="relative w-9 h-9 shrink-0">
                   <div className="w-full h-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800 relative">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.username[0]}
                   </div>
                   <StatusIndicator status={userStatus} className="absolute -bottom-0.5 -right-0.5 w-3 h-3 ring-2 ring-black" showInvisible />
               </div>
               <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1">
                    {user.username} {user.username === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono capitalize">{userStatus === 'dnd' ? 'Do Not Disturb' : userStatus}</div>
               </div>
            </div>

            {/* Status Dropdown */}
            {showStatusMenu && (
                <div className="absolute bottom-full left-3 mb-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 animate-scale-in">
                    <button onClick={() => handleChangeStatus('online')} className="w-full text-left px-3 py-2 hover:bg-zinc-900 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300 hover:text-white">
                        <StatusIndicator status="online" className="w-2.5 h-2.5" /> Online
                    </button>
                    <button onClick={() => handleChangeStatus('idle')} className="w-full text-left px-3 py-2 hover:bg-zinc-900 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300 hover:text-white">
                        <StatusIndicator status="idle" className="w-2.5 h-2.5" /> Idle
                    </button>
                    <button onClick={() => handleChangeStatus('dnd')} className="w-full text-left px-3 py-2 hover:bg-zinc-900 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300 hover:text-white">
                        <StatusIndicator status="dnd" className="w-2.5 h-2.5" /> Do Not Disturb
                    </button>
                    <div className="h-px bg-zinc-900 my-1"></div>
                    <button onClick={() => handleChangeStatus('invisible')} className="w-full text-left px-3 py-2 hover:bg-zinc-900 rounded-lg flex items-center gap-3 text-xs font-bold text-zinc-300 hover:text-white">
                        <StatusIndicator status="invisible" className="w-2.5 h-2.5" /> Invisible
                    </button>
                </div>
            )}

            <div className="flex gap-1">
               <button onClick={() => setShowSettings(true)} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-900"><Settings className="w-4 h-4" /></button>
               <button onClick={onLogout} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-900"><LogOut className="w-4 h-4" /></button>
            </div>
        </div>
      </aside>

      <main className={`flex-1 flex-col relative min-w-0 bg-black h-full ${activeChat ? 'flex' : 'hidden md:flex'}`}> 
        <div className="absolute inset-0 z-0 bg-transparent pointer-events-none">
           {[...Array(20)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white opacity-20 animate-pulse" 
                   style={{ width: Math.random()*2+1+'px', height: Math.random()*2+1+'px', top: Math.random()*100+'%', left: Math.random()*100+'%', animationDuration: Math.random()*3+2+'s'}} 
              />
           ))}
        </div>
        <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-900 bg-black/80 backdrop-blur-md shadow-sm z-20 cursor-default pt-[env(safe-area-inset-top)] box-content shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveChat(null)} className="md:hidden text-zinc-400 p-1"><ChevronLeft className="w-6 h-6"/></button>
             <div className="flex items-center gap-3" onClick={() => setShowMobileInfo(true)}>
                <div className="relative w-8 h-8 shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center relative">
                        {activeChat?.type === 'dm' ? (
                             <img src={profilesCache[activeChat.participants.find(p => p !== user.username)||'']?.avatar} className="w-full h-full object-cover" />
                        ) : (
                             activeChat?.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : (activeChat?.id === OFFICIAL_CHAT_ID ? <Moon className="w-4 h-4 text-purple-400 fill-purple-400" /> : <Hash className="w-4 h-4 text-zinc-500" />)
                        )}
                    </div>
                    {(() => {
                        if (activeChat?.type === 'dm') {
                            const other = activeChat.participants.find(p => p !== user.username);
                            const status = other ? onlineUsers[other] : undefined;
                            if (status && status !== 'offline' && status !== 'invisible') {
                                return <StatusIndicator status={status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />;
                            }
                        }
                        return null;
                    })()}
                </div>
                <div className="flex flex-col min-w-0">
                    <h2 className="text-white font-bold text-sm flex items-center gap-1">
                        {activeChat?.name || "Select Chat"}
                        {activeChat?.id === OFFICIAL_CHAT_ID && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                    </h2>
                    {activeChat?.type === 'group' ? (
                       <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                          <span className="shrink-0">{activeChat.participants.length} members</span>
                          {activeChat.description && (
                            <>
                              <span className="text-zinc-700">•</span>
                              <span className="truncate max-w-[150px] md:max-w-[300px]">{activeChat.description}</span>
                            </>
                          )}
                       </div>
                    ) : (
                       // DM status (optional)
                       null
                    )}
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 z-10 custom-scrollbar flex flex-col">
          {activeChat ? (
          (() => {
             // Explicit sort to ensure grouping works even if messages arrive out of order via realtime
             const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
             
             return sortedMessages.map((m, i) => {
                 const prevMessage = sortedMessages[i - 1];
                 const isSequence = prevMessage && prevMessage.sender === m.sender && (m.timestamp - prevMessage.timestamp < 2 * 60 * 1000); 

                 const nextMessage = sortedMessages[i + 1];
                 // isLastInSequence determines if the timestamp footer is shown. 
                 // It is true if: no next message, OR next message is different sender, OR next message is > 2 mins later.
                 const isLastInSequence = !nextMessage || nextMessage.sender !== m.sender || (nextMessage.timestamp - m.timestamp >= 2 * 60 * 1000);

                 return (
                   <MessageBubble 
                     key={m.id} 
                     msg={m} 
                     isMe={m.sender === user.username} 
                     senderProfile={profilesCache[m.sender]} 
                     chatId={activeChat.id} 
                     onReact={handleReaction} 
                     isGroup={activeChat.type === 'group'} 
                     onDelete={() => deleteMessage(m.id).then(()=>setMessages(p=>p.filter(x=>x.id!==m.id)))} 
                     onEdit={(id, txt) => updateMessage(activeChat.id, id, { text: txt }).then(()=>setMessages(p=>p.map(x=>x.id===id ? {...x, content: JSON.stringify({...JSON.parse(x.content), text: txt})} : x)))}
                     onProfileClick={setMiniProfileUser}
                     isSequence={!!isSequence}
                     isLastInSequence={isLastInSequence}
                   />
                 );
             });
          })()
          ) : <SleepingCreature />}
          <div ref={messagesEndRef} className="h-1" />
        </div>
        
        {/* Input Area */}
        {activeChat && (
          <div className="p-4 pb-3 md:mb-0 bg-black/80 backdrop-blur z-20 pb-[env(safe-area-inset-bottom)] box-content shrink-0">
             {activeChat.id !== OFFICIAL_CHAT_ID || user.username === 'night' ? (
                <div className="relative">
                   {attachments.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800 flex gap-2 shadow-xl">
                         {attachments.map((att, i) => (
                            <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-zinc-700 bg-zinc-800 flex items-center justify-center group">
                               {att.type === 'image' ? <img src={att.url} className="w-full h-full object-cover"/> : <File className="w-8 h-8 text-zinc-500" />}
                               <button onClick={() => setAttachments([])} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-4 h-4"/></button>
                            </div>
                         ))}
                      </div>
                   )}
                   <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800 focus-within:border-zinc-700 transition-colors">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"><Paperclip className="w-5 h-5" /></button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple />
                      <textarea ref={textAreaRef} value={inputText} onChange={e => { setInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} rows={1} placeholder={`Message #${activeChat.name}`} className="flex-1 bg-transparent border-none text-zinc-200 resize-none py-2 max-h-32 min-h-[24px] custom-scrollbar placeholder-zinc-600 outline-none" style={{ outline: 'none', boxShadow: 'none' }} />
                      
                      <div className="relative flex gap-1 items-center">
                          {/* GIF Button */}
                          <div className="relative">
                            <button type="button" onClick={() => { setShowGifPicker(!showGifPicker); setShowInputEmoji(false); }} className={`p-2 hover:text-white transition-colors ${showGifPicker ? 'text-white' : 'text-zinc-500'}`}><Clapperboard className="w-5 h-5"/></button>
                            {showGifPicker && (
                                <GifPicker 
                                    onSelect={(url) => { handleSendMessage(undefined, url); setShowGifPicker(false); }} 
                                    onClose={() => setShowGifPicker(false)} 
                                />
                            )}
                          </div>

                          <div className="relative">
                              <button type="button" onClick={() => { setShowInputEmoji(!showInputEmoji); setShowGifPicker(false); }} className={`p-2 hover:text-white transition-colors ${showInputEmoji ? 'text-white' : 'text-zinc-500'}`}><Smile className="w-5 h-5"/></button>
                              {showInputEmoji && (
                                  <div className="absolute bottom-full right-0 mb-2 bg-zinc-950 border border-zinc-800 rounded-xl p-2 w-64 grid grid-cols-8 gap-1 shadow-2xl z-50 h-64 overflow-y-auto custom-scrollbar">
                                      {MORE_EMOJIS.map(e => (
                                          <button key={e} type="button" onClick={() => { setInputText(prev => prev + e); setShowInputEmoji(false); }} className="p-1 hover:bg-zinc-800 rounded text-xl">{e}</button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>

                      {inputText.trim() || attachments.length > 0 ? <button type="submit" className="p-2 rounded hover:bg-zinc-800 text-white transition-colors"><Send className="w-4 h-4" /></button> : null}
                   </form>
                </div>
             ) : <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-center text-zinc-600 text-sm flex items-center justify-center gap-2"><Lock className="w-4 h-4" />Read Only Channel</div>}
          </div>
        )}
      </main>

      {/* CHANNEL INFO */}
      {activeChat && (
        <>
            <aside className="hidden md:flex w-[260px] bg-black border-l border-zinc-900 flex-col z-30 relative shrink-0 pt-[env(safe-area-inset-top)]">
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
            </aside>

            {showMobileInfo && (
                <div className="fixed inset-0 z-[60] bg-black md:hidden animate-fade-in flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                    <div className="h-14 flex items-center px-4 border-b border-zinc-900">
                         <button onClick={() => setShowMobileInfo(false)} className="mr-4"><ChevronLeft className="w-6 h-6 text-zinc-400" /></button>
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
        </>
      )}

      {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4 md:p-0">
           <div className="w-full h-full md:max-w-4xl md:h-[80vh] bg-black md:border border-zinc-800 md:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-scale-in">
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-zinc-800 transition-colors"><X className="w-6 h-6"/></button>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-black">
                  <div className="h-48 bg-zinc-900 relative group cursor-pointer w-full shrink-0">
                    {settingsBanner ? <img src={settingsBanner} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold uppercase tracking-widest bg-gradient-to-br from-zinc-800 to-black">Upload Banner</div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="text-white w-8 h-8"/></div>
                    <input type="file" onChange={e => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload=()=>setSettingsBanner(r.result as string); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>

                  <div className="px-8 pb-12">
                     <div className="-mt-16 mb-4 relative inline-block group cursor-pointer z-10">
                        <div className="w-32 h-32 rounded-full border-[6px] border-black bg-zinc-800 overflow-hidden shadow-xl">
                           {settingsAvatar ? <img src={settingsAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-500">{user.username[0]}</div>}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="text-white w-8 h-8"/></div>
                        <input type="file" onChange={e => { if(e.target.files?.[0]) { const r = new FileReader(); r.onload=()=>setSettingsAvatar(r.result as string); r.readAsDataURL(e.target.files[0]); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>

                     <div className="flex flex-col gap-1 mb-8">
                         <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            {user.username} {user.username === 'night' && <VerifiedIcon className="w-7 h-7 text-[#1d9bf0]" />}
                         </h1>
                         <p className="text-zinc-500 text-sm font-mono">ID: {user.id}</p>
                     </div>

                     <div className="space-y-6 max-w-2xl">
                        <div>
                           <label className="text-xs font-bold text-zinc-400 uppercase block mb-2 tracking-wide">About Me</label>
                           <textarea value={settingsBio} onChange={e => setSettingsBio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white resize-none h-32 focus:border-zinc-600 outline-none transition-colors" placeholder="Write something about yourself..." />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-zinc-400 uppercase block mb-2 tracking-wide">Public Email</label>
                           <input type="email" value={settingsEmail} onChange={e => setSettingsEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-zinc-600 outline-none transition-colors" placeholder="contact@email.com" />
                           <div className="flex items-center gap-2 mt-2">
                               <input type="checkbox" checked={settingsShowEmail} onChange={e => setSettingsShowEmail(e.target.checked)} className="accent-white" />
                               <span className="text-sm text-zinc-500">Show email on public profile</span>
                           </div>
                        </div>
                     </div>
                  </div>
              </div>

              <div className="p-6 border-t border-zinc-900 bg-zinc-950 flex justify-end gap-3 mt-auto shrink-0 z-40">
                 <button onClick={() => setShowSettings(false)} className="px-6 py-2.5 text-zinc-400 hover:text-white font-bold transition-colors">Cancel</button>
                 <button onClick={handleSaveProfile} className="px-8 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">Save Changes</button>
              </div>
           </div>
         </div>
      )}

      {/* Modals for Add Friend / Create Group */}
      {showAddFriend && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-black border border-zinc-800 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
              <h3 className="text-white font-bold mb-4 uppercase text-xs">Add Friend</h3>
              <input value={addFriendInput} onChange={e => setAddFriendInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-sm mb-4 outline-none" placeholder="Username" />
              <div className="flex justify-end gap-2"><button onClick={() => setShowAddFriend(false)} className="px-4 py-2 text-zinc-500">Cancel</button><button onClick={() => { sendFriendRequest(user.username, addFriendInput.toLowerCase()); setShowAddFriend(false); addToast('Sent', 'success'); }} className="px-4 py-2 bg-white text-black rounded-lg font-bold">Send</button></div>
           </div>
         </div>
      )}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-black border border-zinc-800 rounded-2xl p-6 w-full max-w-sm animate-scale-in">
              <h3 className="text-white font-bold mb-4 uppercase text-xs">Create Server</h3>
              <input value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-sm mb-4 outline-none" placeholder="Name" />
              
              <textarea 
                  value={groupDescInput} 
                  onChange={e => setGroupDescInput(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white text-sm mb-4 outline-none resize-none" 
                  placeholder="Description (Optional)" 
                  rows={2}
              />

              <div className="max-h-40 overflow-y-auto mb-4 bg-zinc-950 rounded-xl p-2 border border-zinc-900 custom-scrollbar">
                 {myProfile?.friends.map(f => (
                    <label key={f} className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded cursor-pointer"><input type="checkbox" className="accent-white" onChange={e => e.target.checked ? setSelectedFriendsForGroup(p=>[...p,f]) : setSelectedFriendsForGroup(p=>p.filter(x=>x!==f))} /><span className="text-zinc-300 text-sm font-medium">{f}</span></label>
                 ))}
              </div>
              <div className="flex justify-end gap-2"><button onClick={() => setShowCreateGroup(false)} className="px-4 py-2 text-zinc-500">Cancel</button><button onClick={handleCreateGroup} className="px-4 py-2 bg-white text-black rounded-lg font-bold">Create</button></div>
           </div>
         </div>
      )}
    </div>
  );
};

const ChannelInfoContent = ({ 
    activeChat, 
    user, 
    profilesCache, 
    groupLogoRef, 
    handleGroupLogoUpload, 
    setMiniProfileUser, 
    onUpdateDescription, 
    myFriends, 
    onAddMembers, 
    onlineUsers 
}: {
    activeChat: ChatRoom;
    user: User;
    profilesCache: Record<string, UserProfile>;
    groupLogoRef: React.RefObject<HTMLInputElement>;
    handleGroupLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setMiniProfileUser: (user: string | null) => void;
    onUpdateDescription: (desc: string) => void;
    myFriends: string[];
    onAddMembers: (members: string[]) => void;
    onlineUsers: Record<string, UserStatus>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(activeChat.description || '');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);

  useEffect(() => {
    setEditDesc(activeChat.description || '');
    setIsEditing(false);
    setShowAddMemberModal(false);
    setSelectedToAdd([]);
  }, [activeChat.id]);

  const handleSave = () => {
    onUpdateDescription(editDesc);
    setIsEditing(false);
  };
  
  const handleAddSubmit = () => {
      onAddMembers(selectedToAdd);
      setShowAddMemberModal(false);
      setSelectedToAdd([]);
  };

  const isAdmin = activeChat.type === 'group' && (activeChat.admins?.includes(user.username) || user.username === 'night');

  // Filter friends who are NOT already in the chat
  const eligibleFriends = (myFriends || []).filter((f: string) => !activeChat.participants.includes(f));

  // Split participants into Online and Offline
  const onlineParticipants = activeChat.participants.filter((p: string) => {
      const s = onlineUsers[p];
      return s === 'online' || s === 'idle' || s === 'dnd';
  }).sort();

  const offlineParticipants = activeChat.participants.filter((p: string) => {
      const s = onlineUsers[p];
      return !s || s === 'offline' || s === 'invisible';
  }).sort();

  const renderParticipant = (p: string) => {
      const status = onlineUsers?.[p] || 'offline';
      return (
         <div key={p} className="flex items-center gap-3 mb-2 p-2 hover:bg-zinc-900/50 rounded-lg cursor-pointer group transition-colors" onClick={() => setMiniProfileUser(p)}>
            <div className="relative w-8 h-8 shrink-0">
                <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 overflow-hidden">
                    {profilesCache[p]?.avatar ? <img src={profilesCache[p].avatar} className="w-full h-full object-cover"/> : p[0].toUpperCase()}
                </div>
                {/* Always show indicator, even for offline */}
                <StatusIndicator status={status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />
            </div>
            <div className="text-sm text-zinc-300 truncate font-medium flex items-center gap-1">{p} {p === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}</div>
         </div>
      );
  };

  return (
    <>
       <div className="h-14 border-b border-zinc-900 flex items-center px-4 font-bold text-white text-base bg-black/50 backdrop-blur hidden md:flex">{activeChat.type === 'dm' ? 'User Info' : 'Channel Info'}</div>
       <div className="p-6 flex flex-col items-center border-b border-zinc-900 relative">
          <div className="w-24 h-24 rounded-full bg-zinc-900 mb-3 border-4 border-black ring-1 ring-zinc-800 flex items-center justify-center overflow-hidden relative group">
             {activeChat.type === 'group' ? (
                 activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : <Hash className="w-10 h-10 text-zinc-600" />
             ) : (
                 <img src={profilesCache[activeChat.participants.find((p: string) => p !== user.username)||'']?.avatar} className="w-full h-full object-cover"/>
             )}
             {activeChat.type === 'group' && isAdmin && (
                 <>
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input type="file" ref={groupLogoRef} onChange={handleGroupLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </>
             )}
          </div>
          <h3 className="font-bold text-white text-xl text-center leading-tight mb-1">{activeChat.name}</h3>
          
          {activeChat.type === 'group' && (
             <div className="w-full mt-2 text-center">
                 {isEditing ? (
                     <div className="flex flex-col gap-2 animate-fade-in">
                         <textarea 
                            value={editDesc} 
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-300 outline-none resize-none focus:border-zinc-700"
                            placeholder="Add a description..."
                            rows={3}
                         />
                         <div className="flex justify-center gap-2">
                             <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-[10px] text-zinc-500 hover:text-white">Cancel</button>
                             <button onClick={handleSave} className="px-3 py-1 bg-white text-black text-[10px] font-bold rounded hover:bg-zinc-200">Save</button>
                         </div>
                     </div>
                 ) : (
                     <div className="relative group/desc">
                         <p className="text-sm text-zinc-500 leading-relaxed px-2">
                            {activeChat.description || <span className="italic opacity-50">No description</span>}
                         </p>
                         {isAdmin && (
                            <button onClick={() => { setEditDesc(activeChat.description || ''); setIsEditing(true); }} className="mt-2 text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center justify-center gap-1 w-full opacity-0 group-hover/desc:opacity-100 transition-opacity">
                                <Edit2 className="w-3 h-3" /> Edit Description
                            </button>
                         )}
                     </div>
                 )}
             </div>
          )}

          {activeChat.id === OFFICIAL_CHAT_ID && <span className="text-blue-400 text-xs mt-3 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" /> Verified</span>}
       </div>
       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
             <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Members</div>
             {isAdmin && activeChat.type === 'group' && (
                 <button onClick={() => setShowAddMemberModal(true)} className="p-1 text-zinc-500 hover:text-white bg-zinc-900 rounded hover:bg-zinc-800 transition-colors" title="Add Members">
                    <UserPlus className="w-3 h-3" />
                 </button>
             )}
          </div>
          
          {onlineParticipants.length > 0 && (
             <div className="mb-4">
                 <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Online — {onlineParticipants.length}</div>
                 {onlineParticipants.map(renderParticipant)}
             </div>
          )}

          {offlineParticipants.length > 0 && (
             <div className="mb-4">
                 <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Offline — {offlineParticipants.length}</div>
                 {offlineParticipants.map(renderParticipant)}
             </div>
          )}
       </div>

       {/* Add Member Modal */}
       {showAddMemberModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4" onClick={() => setShowAddMemberModal(false)}>
             <div className="bg-black border border-zinc-800 rounded-2xl p-6 w-full max-w-sm animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-bold mb-4 uppercase text-xs">Add Participants</h3>
                {eligibleFriends.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm py-4">
                        All your friends are already here!
                    </div>
                ) : (
                    <div className="max-h-48 overflow-y-auto mb-4 bg-zinc-950 rounded-xl p-2 border border-zinc-900 custom-scrollbar">
                        {eligibleFriends.map((f: string) => (
                            <label key={f} className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded cursor-pointer">
                                <input type="checkbox" className="accent-white" checked={selectedToAdd.includes(f)} onChange={e => e.target.checked ? setSelectedToAdd(p => [...p, f]) : setSelectedToAdd(p => p.filter(x => x !== f))} />
                                <span className="text-zinc-300 text-sm font-medium">{f}</span>
                            </label>
                        ))}
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 text-zinc-500 text-xs font-bold hover:text-white">Cancel</button>
                    {eligibleFriends.length > 0 && (
                        <button onClick={handleAddSubmit} disabled={selectedToAdd.length === 0} className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold disabled:opacity-50">Add</button>
                    )}
                </div>
             </div>
          </div>
       )}
    </>
  );
};

export default Dashboard;
