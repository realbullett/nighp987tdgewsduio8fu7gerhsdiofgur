import React, { useState, useEffect, useRef } from 'react';
import { User, ChatRoom, ChatMessage, UserProfile, MessageContent, Attachment } from '../types';
import { 
  getMessages, sendMessage, getMyChats, getWelcomeChat,
  getUserProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  createGroupChat, updateAvatar, subscribeToChat, decryptMessage, resizeImage, detectLinks,
  getDMChatId
} from '../utils';
import { 
  Send, LogOut, MessageSquare, Users, Hash, 
  UserPlus, Menu, Info, X, Check, Camera, Plus, Paperclip, 
  Image as ImageIcon, ExternalLink, Settings, Link as LinkIcon, Moon, Sparkles, Loader2
} from 'lucide-react';

interface ChatProps {
  user: User;
  onLogout: () => void;
}

type TabView = 'chats' | 'friends' | 'settings';

// --- Twinkling Background Component ---
const TwinklingBackground = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="star-twinkle absolute bg-white rounded-full"
          style={{
            width: Math.random() * 2 + 1 + 'px',
            height: Math.random() * 2 + 1 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            opacity: Math.random() * 0.5,
            animationDelay: Math.random() * 5 + 's',
            animationDuration: Math.random() * 3 + 2 + 's'
          }}
        />
      ))}
    </div>
  );
};

const Dashboard: React.FC<ChatProps> = ({ user, onLogout }) => {
  // State
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('chats');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  
  // Animation States
  const [removingRequests, setRemovingRequests] = useState<string[]>([]);
  const [friendRequestStatus, setFriendRequestStatus] = useState<'IDLE'|'SENDING'|'SUCCESS'>('IDLE');

  // Data
  const [myChats, setMyChats] = useState<ChatRoom[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [chatParticipants, setChatParticipants] = useState<UserProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')); // Subtle pop sound

  // --- Initial Load ---
  useEffect(() => {
    const init = async () => {
      // Request Notification Permission
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      const welcome = await getWelcomeChat();
      setActiveChat(welcome);
      await fetchChats();
      await refreshProfile();
    };
    init();
  }, [user.username]);

  const fetchChats = async () => {
    const chats = await getMyChats(user.username);
    setMyChats(chats);
    setIsChatsLoading(false);
  };

  const refreshMessages = async () => {
    if (!activeChat) return;
    const msgs = await getMessages(activeChat.id);
    setMessages(msgs);
  };

  const refreshProfile = async () => {
    const profile = await getUserProfile(user.username);
    setMyProfile(profile);
  };

  // --- Realtime Subscription ---
  useEffect(() => {
    if (activeChat) {
      refreshMessages(); 
      
      const unsubscribe = subscribeToChat(activeChat.id, async (payload) => {
        const newRecord = payload.new;
        if (!newRecord) return;

        // Skip if I sent it (Optimistic UI handles it)
        if (newRecord.sender === user.username) return;

        try {
          const contentStr = await decryptMessage(newRecord.iv, newRecord.content, activeChat.id);
          
          const newMessage: ChatMessage = {
            id: newRecord.id,
            sender: newRecord.sender,
            content: contentStr,
            timestamp: new Date(newRecord.created_at).getTime()
          };

          // Notify Logic
          if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
             new Notification(`Message from ${newRecord.sender}`, {
               body: "Encrypted transmission received.",
               icon: '/favicon.ico',
               silent: true
             });
          }
          
          // Play sound
          try {
            audioRef.current.volume = 0.5;
            audioRef.current.currentTime = 0;
            audioRef.current.play();
          } catch(e) {}

          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          setMyChats((prev) => {
            const updated = prev.map(c => 
              c.id === activeChat.id 
                ? { ...c, lastMessage: newMessage }
                : c
            );
            return updated.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
          });

        } catch (e) {
          console.error("Live message error:", e);
        }
      });

      // Update participants
      const loadParticipants = async () => {
        const currentRoom = myChats.find(c => c.id === activeChat.id) || activeChat;
        const participantsData = await Promise.all(
          currentRoom.participants.map(p => getUserProfile(p))
        );
        setChatParticipants(participantsData.filter(Boolean) as UserProfile[]);
      };
      loadParticipants();

      return () => {
        unsubscribe();
      };
    }
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChat?.id, attachments.length]);

  // --- Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: Attachment[] = [];
      
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise<void>((resolve) => {
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            // Resize for performance/storage limits
            const resized = await resizeImage(base64, 800, 800, 0.8);
            newAttachments.push({ type: 'image', url: resized });
            resolve();
          };
        });
      }
      setAttachments([...attachments, ...newAttachments]);
    }
    // Reset input
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || !activeChat) return;
    
    // Construct Message Payload
    const payload: MessageContent = {
      text: inputText,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    
    const contentString = JSON.stringify(payload);

    // Clear UI immediately
    setInputText(''); 
    setAttachments([]);

    try {
      const newMessage = await sendMessage(activeChat.id, user.username, contentString);
      
      setMessages(prev => [...prev, newMessage]);
      setMyChats(prev => {
        const updated = prev.map(c => 
          c.id === activeChat.id 
            ? { ...c, lastMessage: newMessage }
            : c
        );
        return updated.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
      });

    } catch (err) {
      console.error("Send failed", err);
      alert("Failed to send. Check connection.");
      setInputText(payload.text); 
      if (payload.attachments) setAttachments(payload.attachments);
    }
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!friendInput) return;

    setFriendRequestStatus('SENDING');
    try {
      await sendFriendRequest(user.username, friendInput.toLowerCase());
      setFriendRequestStatus('SUCCESS');
      await refreshProfile();
      setTimeout(() => {
        setFriendInput('');
        setFriendRequestStatus('IDLE');
      }, 2000);
    } catch (err: any) {
      alert(err.message);
      setFriendRequestStatus('IDLE');
    }
  };

  const handleRespondRequest = async (requester: string, accept: boolean) => {
    // 1. Mark as removing (trigger animation)
    setRemovingRequests(prev => [...prev, requester]);
    
    // 2. Wait for animation
    setTimeout(async () => {
        try {
            if(accept) await acceptFriendRequest(user.username, requester);
            else await rejectFriendRequest(user.username, requester);
            
            await refreshProfile();
            if(accept) await fetchChats();
        } catch(e) { console.error(e) }
        
        // Cleanup
        setRemovingRequests(prev => prev.filter(r => r !== requester));
    }, 400); // Match CSS animation duration
  };

  // --- Sub-Components ---

  const MessageBubble = ({ msg, isMe, senderProfile }: { msg: ChatMessage, isMe: boolean, senderProfile?: UserProfile }) => {
    let content: MessageContent = { text: msg.content };
    
    try {
      // Try parsing as JSON content
      const parsed = JSON.parse(msg.content);
      if (typeof parsed === 'object' && parsed !== null) {
        content = parsed;
      }
    } catch (e) {
      // Is plain text (legacy)
    }

    const links = detectLinks(content.text);

    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
        {!isMe && (
           <div className="w-8 h-8 mr-3 flex-shrink-0 flex flex-col justify-end">
              <div className="w-8 h-8 rounded-full bg-indigo-950 overflow-hidden border border-indigo-500/30 shadow-lg">
                {senderProfile?.avatar ? (
                  <img src={senderProfile.avatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-indigo-300 font-bold">{msg.sender[0].toUpperCase()}</div>
                )}
              </div>
           </div>
        )}
        
        <div className={`max-w-[85%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {!isMe && <div className="text-[10px] text-indigo-300/70 mb-1 ml-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">{msg.sender}</div>}
          
          <div className={`
            p-3.5 rounded-2xl shadow-lg backdrop-blur-md transition-all
            ${isMe 
              ? 'bg-gradient-to-br from-indigo-600/90 to-purple-700/90 text-white rounded-tr-none border border-indigo-400/30 hover:shadow-purple-500/20' 
              : 'bg-[#0f172a]/80 text-indigo-100 rounded-tl-none border border-indigo-500/20 hover:border-indigo-500/40'
            }
          `}>
            {/* Attachments */}
            {content.attachments && content.attachments.map((att, idx) => (
              <div key={idx} className="mb-3 rounded-xl overflow-hidden border border-black/20 shadow-sm relative group/img">
                <img src={att.url} alt="attachment" className="max-w-full max-h-[300px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}

            {/* Text */}
            {content.text && <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{content.text}</div>}

            {/* Link Previews */}
            {links.map((link, i) => {
               const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(link);
               return (
                 <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block mt-3 overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-950/30 hover:border-indigo-400/50 transition-all group/link">
                   {isImage ? (
                     <div className="w-full h-32 bg-black/50 overflow-hidden flex items-center justify-center">
                        <img src={link} className="w-full h-full object-cover opacity-80 group-hover/link:opacity-100 transition-opacity" alt="preview" />
                     </div>
                   ) : (
                     <div className="p-3 bg-white/[0.03]">
                        <div className="flex items-center gap-2 text-xs text-blue-400 truncate">
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate underline decoration-blue-400/30 group-hover/link:decoration-blue-400">{link}</span>
                        </div>
                     </div>
                   )}
                   {!isImage && <div className="px-3 py-1.5 bg-indigo-900/40 text-[9px] text-indigo-300 uppercase tracking-widest font-bold flex items-center gap-1">
                      <ExternalLink className="w-2.5 h-2.5" /> External Resource
                   </div>}
                 </a>
               );
            })}
          </div>

          <div className={`text-[9px] mt-1 opacity-40 font-medium tracking-wide flex items-center gap-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMe && <Check className="w-2.5 h-2.5" />}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  if (!activeChat) {
    return (
      <div className="h-screen w-full bg-[#020617] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
         <TwinklingBackground />
         <div className="w-16 h-16 rounded-full border-4 border-indigo-900 border-t-indigo-500 animate-spin z-10 relative shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
         <div className="text-indigo-400 font-bold text-xs tracking-[0.3em] animate-pulse z-10">CONNECTING TO NIGHT NETWORK</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-white relative">
      
      {/* --- Sidebar --- */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-80 bg-[#0a0f2c]/95 border-r border-white/5 flex flex-col transition-transform duration-300 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header Me */}
        <div className="p-5 bg-gradient-to-b from-[#0a0f2c] to-transparent flex items-center gap-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="relative group">
            <div className="w-12 h-12 rounded-full bg-indigo-950 overflow-hidden cursor-pointer border-2 border-indigo-500/20 group-hover:border-indigo-400 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]" onClick={() => setActiveTab('settings')}>
              {myProfile?.avatar ? <img src={myProfile.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900" />}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0f2c] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
          <div className="flex-1 min-w-0">
             <div className="font-bold text-indigo-100 text-sm truncate">{user.username}</div>
             <div className="text-[9px] text-indigo-400 font-bold tracking-widest flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></span> ONLINE
             </div>
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
             <button onClick={() => setActiveTab('chats')} className={`p-2 rounded-lg transition-all duration-300 ${activeTab === 'chats' ? 'text-indigo-300 bg-white/10 shadow-sm' : 'text-slate-500 hover:text-white'}`}>
               <MessageSquare className="w-4 h-4" />
             </button>
             <button onClick={() => setActiveTab('friends')} className={`p-2 rounded-lg transition-all duration-300 ${activeTab === 'friends' ? 'text-indigo-300 bg-white/10 shadow-sm' : 'text-slate-500 hover:text-white'}`}>
               <Users className="w-4 h-4" />
             </button>
             <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg transition-all duration-300 ${activeTab === 'settings' ? 'text-indigo-300 bg-white/10 shadow-sm' : 'text-slate-500 hover:text-white'}`}>
               <Settings className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          
          {/* Chats Tab */}
          {activeTab === 'chats' && (
            <div className="space-y-1 animate-in slide-in-from-left-4 duration-300">
              <div className="flex items-center justify-between px-2 mb-2">
                 <h3 className="text-[10px] font-bold text-indigo-400/50 uppercase tracking-widest">Channels</h3>
                 <button onClick={() => setShowCreateGroup(true)} className="text-indigo-400 hover:text-white hover:bg-indigo-500/20 p-1.5 rounded-lg transition-colors">
                   <Plus className="w-4 h-4" />
                 </button>
              </div>
              {myChats.map(chat => {
                 let displayName = chat.name;
                 if (chat.type === 'dm') {
                   displayName = chat.participants.find(p => p !== user.username) || 'Unknown';
                 }

                 let lastMsgText = chat.lastMessage?.content || (chat.type === 'group' ? 'Channel created' : 'Start chatting');
                 try {
                    const parsed = JSON.parse(lastMsgText);
                    if(parsed.attachments && parsed.attachments.length > 0) lastMsgText = "📷 Image";
                    else if(parsed.text) lastMsgText = parsed.text;
                 } catch(e){}

                 const isActive = activeChat?.id === chat.id;

                 return (
                  <button
                    key={chat.id}
                    onClick={() => { setActiveChat(chat); setSidebarOpen(false); }}
                    className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all duration-200 group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-900/40 to-purple-900/20 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                        : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_#6366f1]"></div>}
                    <div className={`
                      w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner border border-white/5 bg-indigo-950/50
                    `}>
                      {chat.id === 'group_welcome' ? (
                         <Moon className="w-5 h-5 text-indigo-300" />
                      ) : chat.type === 'group' ? (
                         <Users className="w-5 h-5 text-purple-400" />
                      ) : (
                         <div className="font-bold text-indigo-300/80 text-lg group-hover:text-white transition-colors">
                            {displayName[0].toUpperCase()}
                         </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <div className={`font-medium text-sm truncate ${isActive ? 'text-white' : 'text-indigo-100/70 group-hover:text-white'}`}>
                          {displayName}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-[9px] text-indigo-500/60 group-hover:text-indigo-400 font-mono">
                            {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-indigo-400/50 truncate group-hover:text-indigo-300/70 transition-colors flex items-center gap-1">
                        {lastMsgText.includes("Image") && <ImageIcon className="w-3 h-3" />}
                        {lastMsgText}
                      </div>
                    </div>
                  </button>
                 );
              })}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
             <div className="space-y-6 animate-in slide-in-from-left-4 duration-300 px-2">
                <div>
                  <h3 className="text-[10px] font-bold text-indigo-400/50 uppercase tracking-widest mb-3">Add Contact</h3>
                  <form onSubmit={handleSendFriendRequest} className="relative group">
                    <input 
                      value={friendInput}
                      onChange={e => setFriendInput(e.target.value)}
                      placeholder="Enter username..."
                      className="w-full bg-[#050b1e] border border-indigo-500/20 rounded-xl pl-4 pr-10 py-3 text-sm text-indigo-100 focus:outline-none focus:border-purple-500 transition-colors placeholder-indigo-500/30"
                    />
                    <button 
                      type="submit" 
                      disabled={friendRequestStatus === 'SENDING' || friendRequestStatus === 'SUCCESS'}
                      className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all duration-300 ${
                        friendRequestStatus === 'SUCCESS' ? 'bg-green-500 text-white animate-pulse-success' : 
                        friendRequestStatus === 'SENDING' ? 'bg-indigo-600/50' : 'bg-indigo-600/50 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {friendRequestStatus === 'SUCCESS' ? <Check className="w-4 h-4" /> : 
                       friendRequestStatus === 'SENDING' ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                       <UserPlus className="w-4 h-4" />}
                    </button>
                  </form>
                </div>

                {myProfile?.incomingRequests && myProfile.incomingRequests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Incoming</h3>
                    {myProfile.incomingRequests.map(req => (
                      <div 
                        key={req} 
                        className={`bg-gradient-to-r from-purple-900/20 to-transparent border border-purple-500/20 p-3 rounded-xl flex items-center justify-between transition-all ${removingRequests.includes(req) ? 'slide-out' : ''}`}
                      >
                        <span className="font-medium text-purple-100 text-sm">{req}</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleRespondRequest(req, true)} className="text-green-400 hover:text-green-300 hover:bg-green-500/10 p-1.5 rounded-lg transition-colors"><Check className="w-5 h-5" /></button>
                          <button onClick={() => handleRespondRequest(req, false)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-indigo-400/50 uppercase tracking-widest">Network</h3>
                  {myProfile?.friends.map(friend => (
                    <div key={friend} 
                      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-white/5 group animate-in fade-in" 
                      onClick={() => {
                        const chat = myChats.find(c => c.type === 'dm' && c.participants.includes(friend));
                        if(chat) { 
                          setActiveChat(chat); 
                          setActiveTab('chats'); 
                          setSidebarOpen(false); 
                        } else {
                          const newDmId = getDMChatId(user.username, friend);
                          setActiveChat({
                            id: newDmId, type: 'dm', name: friend, participants: [user.username, friend]
                          });
                          setActiveTab('chats');
                          setSidebarOpen(false);
                        }
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-300 border border-indigo-500/20 shadow-md">{friend[0].toUpperCase()}</div>
                      <span className="text-indigo-200 text-sm font-medium group-hover:text-white">{friend}</span>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
             <div className="flex flex-col items-center animate-in slide-in-from-left-4 duration-300 pt-8">
               <div className="relative group cursor-pointer" onClick={() => profileInputRef.current?.click()}>
                 <div className="w-24 h-24 rounded-full bg-indigo-950 border-2 border-indigo-500/20 group-hover:border-purple-500 transition-all overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                   {myProfile?.avatar ? <img src={myProfile.avatar} className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 m-auto text-indigo-400/50" />}
                 </div>
                 <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Camera className="w-6 h-6 text-white" />
                 </div>
               </div>
               <input type="file" ref={profileInputRef} className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if(file) {
                    const r = new FileReader();
                    r.onload = () => updateAvatar(user.username, r.result as string).then(refreshProfile);
                    r.readAsDataURL(file);
                  }
               }} accept="image/*" />
               
               <h2 className="mt-4 text-xl font-bold text-white">{user.username}</h2>
               <div className="mt-1 flex items-center gap-1.5 px-3 py-1 bg-green-900/20 border border-green-500/20 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-green-400 font-bold tracking-wider">SECURE CONNECTION</span>
               </div>

               <div className="w-full mt-12 px-6">
                 <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-300 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 px-4 py-3.5 rounded-xl transition-all text-sm font-bold shadow-lg">
                   <LogOut className="w-4 h-4" /> Disconnect
                 </button>
               </div>
             </div>
          )}
        </div>
      </aside>

      {/* --- Main Chat Area --- */}
      <main className="flex-1 flex flex-col relative bg-[#020617] z-0">
        
        {/* Twinkling Stars Background Layer */}
        <TwinklingBackground />

        {/* Chat Header */}
        <header className="h-20 flex items-center justify-between px-6 bg-[#0a0f2c]/70 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setInfoPanelOpen(!infoPanelOpen)}>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }} className="md:hidden text-indigo-400 p-2 hover:bg-white/5 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-indigo-950/50 border border-indigo-500/20 overflow-hidden shadow-lg shadow-indigo-500/10`}>
              {activeChat.id === 'group_welcome' ? <Moon className="w-6 h-6 text-indigo-300" /> : 
               activeChat.type === 'group' ? <Users className="w-6 h-6 text-purple-400" /> :
               <div className="text-xl font-bold text-indigo-200">{activeChat.name[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <h2 className="font-bold text-white text-lg leading-none drop-shadow-md">{activeChat.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                <p className="text-[10px] text-indigo-300/70 uppercase tracking-widest font-semibold">
                   {activeChat.type === 'group' ? 'Encrypted Group' : 'Private Channel'}
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => setInfoPanelOpen(!infoPanelOpen)} className="text-indigo-400/50 hover:text-indigo-300 transition-colors p-2 rounded-full hover:bg-white/5">
             <Info className="w-5 h-5" />
          </button>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-4 space-y-6 relative z-10 custom-scrollbar">
          {messages.map((msg, idx) => {
            const isMe = msg.sender === user.username;
            const senderProfile = chatParticipants.find(p => p.username === msg.sender);
            return <MessageBubble key={msg.id} msg={msg} isMe={isMe} senderProfile={senderProfile} />;
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="px-6 py-3 bg-[#0a0f2c]/80 border-t border-white/5 flex gap-3 overflow-x-auto relative z-20 backdrop-blur-md">
            {attachments.map((att, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-indigo-500/30 group shadow-lg">
                <img src={att.url} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-5 pb-6 bg-gradient-to-t from-[#020617] to-transparent relative z-20">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-3 bg-[#0f172a]/60 backdrop-blur-xl border border-indigo-500/10 rounded-3xl p-2 pl-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <button 
              type="button" 
              onClick={() => attachmentInputRef.current?.click()}
              className="p-2.5 text-indigo-400/60 hover:text-indigo-300 hover:bg-white/5 rounded-full transition-colors mb-0.5"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              ref={attachmentInputRef} 
              className="hidden" 
              onChange={handleFileSelect}
            />

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              placeholder="Write a message into the night..."
              rows={1}
              className="flex-1 bg-transparent border-none text-indigo-50 focus:ring-0 focus:outline-none placeholder-indigo-500/40 min-h-[44px] max-h-32 py-2.5 resize-none text-[15px] font-medium leading-relaxed custom-scrollbar"
              style={{ height: 'auto' }} 
            />
            
            <button
              type="submit"
              disabled={!inputText.trim() && attachments.length === 0}
              className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95 mb-0.5"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>

      {/* --- Right Info Panel --- */}
      {infoPanelOpen && (
        <aside className="w-80 bg-[#0a0f2c]/95 border-l border-white/5 hidden lg:flex flex-col animate-in slide-in-from-right duration-300 z-30 shadow-2xl backdrop-blur-xl">
           <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
             <h3 className="font-bold text-indigo-100 text-sm uppercase tracking-widest">Metadata</h3>
             <button onClick={() => setInfoPanelOpen(false)} className="hover:text-purple-400 transition-colors"><X className="w-5 h-5 text-indigo-400/50" /></button>
           </div>
           
           <div className="p-8 flex flex-col items-center border-b border-white/5 bg-white/[0.01]">
              <div className="w-28 h-28 rounded-full bg-indigo-950 mb-5 overflow-hidden border-2 border-indigo-500/20 shadow-[0_0_40px_rgba(79,70,229,0.2)]">
                {activeChat.avatar ? (
                   <img src={activeChat.avatar} className="w-full h-full object-cover" />
                ) : activeChat.type === 'dm' ? (
                   <div className="w-full h-full flex items-center justify-center text-4xl text-indigo-400 font-bold">{activeChat.name[0].toUpperCase()}</div>
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-indigo-400"><Hash className="w-12 h-12" /></div>
                )}
              </div>
              <h2 className="text-xl font-bold text-white text-center tracking-tight">{activeChat.name}</h2>
              <p className="text-purple-300/80 text-[10px] mt-2 font-bold uppercase tracking-[0.2em] bg-purple-900/20 px-3 py-1 rounded-full border border-purple-500/20">
                {activeChat.type === 'group' ? `${activeChat.participants.length} MEMBERS` : 'ENCRYPTED P2P'}
              </p>
           </div>

           <div className="flex-1 overflow-y-auto p-6">
              {activeChat.type === 'group' && (
                <>
                  <h4 className="text-[10px] font-bold text-indigo-400/50 uppercase tracking-widest mb-4">Operatives</h4>
                  <div className="space-y-4">
                    {chatParticipants.map(p => (
                      <div key={p.username} className="flex items-center gap-3 group">
                         <div className="w-10 h-10 rounded-full bg-indigo-950 overflow-hidden border border-white/5 group-hover:border-purple-500/50 transition-colors">
                            {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-indigo-400 font-bold">{p.username[0]}</div>}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="text-sm font-bold text-indigo-200 truncate group-hover:text-purple-300 transition-colors">{p.username}</div>
                           {activeChat.admins?.includes(p.username) && <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">Administrator</div>}
                         </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
           </div>
        </aside>
      )}

      {/* --- Create Group Modal --- */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-spring duration-300">
          <div className="w-full max-w-md bg-[#0a0f2c] border border-indigo-500/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] relative overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h3 className="font-bold text-white text-lg tracking-tight flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> New Frequency</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-indigo-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] text-indigo-400/50 uppercase font-bold mb-2 block tracking-widest">Channel Name</label>
                <input 
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  className="w-full bg-black/40 border border-indigo-500/20 rounded-xl p-3.5 text-white focus:border-purple-500 focus:outline-none transition-colors placeholder-indigo-500/30"
                  placeholder="e.g. Midnight Protocol"
                />
              </div>

              <div>
                <label className="text-[10px] text-indigo-400/50 uppercase font-bold mb-2 block tracking-widest">Select Members</label>
                <div className="max-h-56 overflow-y-auto border border-indigo-500/10 bg-black/20 rounded-xl p-2 space-y-1 custom-scrollbar">
                   {myProfile?.friends.map(friend => (
                     <label key={friend} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedGroupMembers.includes(friend) ? 'bg-purple-600 border-purple-600' : 'border-indigo-500/30 bg-transparent'}`}>
                           {selectedGroupMembers.includes(friend) && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={selectedGroupMembers.includes(friend)}
                          onChange={e => {
                             if(e.target.checked) setSelectedGroupMembers([...selectedGroupMembers, friend]);
                             else setSelectedGroupMembers(selectedGroupMembers.filter(f => f !== friend));
                          }}
                        />
                        <span className="text-indigo-200 font-medium group-hover:text-white">{friend}</span>
                     </label>
                   ))}
                   {(!myProfile?.friends || myProfile.friends.length === 0) && <div className="text-indigo-400/50 text-xs p-8 text-center">No contacts available.</div>}
                </div>
              </div>
              
              <button 
                onClick={async () => {
                  if (!groupNameInput) return;
                  const newGroup = await createGroupChat(groupNameInput, user.username, selectedGroupMembers);
                  setShowCreateGroup(false);
                  setGroupNameInput('');
                  setSelectedGroupMembers([]);
                  setActiveChat(newGroup);
                  fetchChats();
                }}
                disabled={!groupNameInput || selectedGroupMembers.length === 0}
                className="w-full bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all uppercase tracking-wider text-xs"
              >
                Initialize Channel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;