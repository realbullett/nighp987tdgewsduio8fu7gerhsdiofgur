
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatRoom, ChatMessage, UserProfile } from '../types';
import { 
  getMessages, sendMessage, getMyChats, getWelcomeChat,
  getUserProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  createGroupChat, updateAvatar, subscribeToChat
} from '../utils';
import { 
  Send, LogOut, MessageSquare, Users, Hash, Lock, 
  UserPlus, Menu, Info, X, Check, Camera, Settings, Plus
} from 'lucide-react';

interface ChatProps {
  user: User;
  onLogout: () => void;
}

type TabView = 'chats' | 'friends' | 'settings';

const Dashboard: React.FC<ChatProps> = ({ user, onLogout }) => {
  // State
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('chats');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  // Data
  const [myChats, setMyChats] = useState<ChatRoom[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [chatParticipants, setChatParticipants] = useState<UserProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---

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

  // Initial Load
  useEffect(() => {
    const init = async () => {
      const welcome = await getWelcomeChat();
      setActiveChat(welcome);
      await fetchChats();
      await refreshProfile();
    };
    init();
  }, [user.username]);

  // Realtime Subscription for Active Chat
  useEffect(() => {
    if (activeChat) {
      refreshMessages(); // Initial fetch
      
      // Subscribe to Realtime Updates
      const unsubscribe = subscribeToChat(activeChat.id, () => {
        refreshMessages();
        fetchChats(); // Update sidebar last message
      });

      // Load participant details
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChat?.id]);

  // --- Handlers ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;
    
    // Optimistic UI update could go here, but with Supabase Realtime it's fast enough usually
    await sendMessage(activeChat.id, user.username, inputText);
    setInputText('');
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendFriendRequest(user.username, friendInput.toLowerCase());
      alert("Request sent!");
      setFriendInput('');
      await refreshProfile();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAcceptRequest = async (requester: string) => {
    await acceptFriendRequest(user.username, requester);
    await refreshProfile();
    await fetchChats();
  };

  const handleRejectRequest = async (requester: string) => {
    await rejectFriendRequest(user.username, requester);
    await refreshProfile();
  };

  const handleCreateGroup = async () => {
    if (!groupNameInput) return;
    try {
      const newGroup = await createGroupChat(groupNameInput, user.username, selectedGroupMembers);
      setShowCreateGroup(false);
      setGroupNameInput('');
      setSelectedGroupMembers([]);
      await fetchChats();
      setActiveChat(newGroup);
      setActiveTab('chats');
    } catch (e: any) {
      alert("Failed to create group: " + e.message);
    }
  };

  const handleUpdateAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await updateAvatar(user.username, reader.result as string);
        await refreshProfile();
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Render Sections ---

  const renderSidebarContent = () => {
    if (activeTab === 'friends') {
      return (
        <div className="p-4 space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          {/* Add Friend */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Add Contact</h3>
            <form onSubmit={handleSendFriendRequest} className="flex gap-2">
              <input 
                value={friendInput}
                onChange={e => setFriendInput(e.target.value)}
                placeholder="Username..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-600 transition-colors placeholder-slate-600"
              />
              <button type="submit" className="bg-purple-900/50 hover:bg-purple-800 text-purple-200 p-2.5 rounded-lg border border-purple-500/20 transition-all">
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Requests */}
          {myProfile?.incomingRequests && myProfile.incomingRequests.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3">Pending Requests</h3>
              <div className="space-y-2">
                {myProfile.incomingRequests.map(req => (
                  <div key={req} className="bg-purple-950/10 border border-purple-500/10 p-3 rounded-xl flex items-center justify-between">
                    <span className="font-medium text-purple-100 text-sm">{req}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptRequest(req)}
                        className="p-1.5 bg-green-900/20 text-green-400 rounded hover:bg-green-900/40 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(req)}
                        className="p-1.5 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Contacts ({myProfile?.friends.length || 0})</h3>
            <div className="space-y-1">
              {myProfile?.friends.map(friend => (
                <div key={friend} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group" 
                  onClick={() => {
                     // Find chat
                     const chat = myChats.find(c => c.type === 'dm' && c.participants.includes(friend));
                     if(chat) { 
                       setActiveChat(chat); 
                       setActiveTab('chats'); 
                       setSidebarOpen(false); 
                     } else {
                       // Create temp object for DM if it doesn't exist yet
                       const sorted = [user.username, friend].sort();
                       const newDmId = `dm_${sorted[0]}_${sorted[1]}`;
                       setActiveChat({
                         id: newDmId,
                         type: 'dm',
                         name: friend,
                         participants: [user.username, friend]
                       });
                       setActiveTab('chats');
                       setSidebarOpen(false);
                     }
                  }}>
                  <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden group-hover:border-purple-500/30 transition-colors">
                    <div className="text-xs font-bold text-slate-400">{friend[0].toUpperCase()}</div>
                  </div>
                  <span className="text-slate-300 text-sm group-hover:text-white transition-colors">{friend}</span>
                </div>
              ))}
              {(!myProfile?.friends || myProfile.friends.length === 0) && (
                <div className="text-slate-700 text-xs italic p-2">No contacts yet. Add someone above.</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="p-6 flex flex-col items-center animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-full bg-slate-900 border-2 border-slate-800 group-hover:border-purple-500/50 transition-all overflow-hidden shadow-2xl shadow-black">
              {myProfile?.avatar ? (
                <img src={myProfile.avatar} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Camera className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpdateAvatar} accept="image/*" />
          
          <h2 className="mt-5 text-xl font-bold text-white tracking-tight">{user.username}</h2>
          <p className="text-purple-400 text-xs font-medium tracking-wide uppercase mt-1">Encrypted • Online</p>

          <div className="w-full mt-10 space-y-2">
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-400 bg-red-950/10 hover:bg-red-950/20 border border-red-900/20 px-4 py-3 rounded-xl transition-all text-sm font-medium">
              <LogOut className="w-4 h-4" /> Disconnect Session
            </button>
          </div>
        </div>
      );
    }

    // Default: Chats
    return (
      <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="p-4 flex items-center justify-between sticky top-0 bg-[#020617]/95 backdrop-blur z-10 border-b border-white/5">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recent Chats</h3>
          <button onClick={() => setShowCreateGroup(true)} className="text-purple-400 hover:text-purple-300 bg-purple-900/20 p-1.5 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1 px-2 py-2">
          {myChats.map(chat => {
             // For DMs, find the other person's name
             let displayName = chat.name;
             if (chat.type === 'dm') {
               const other = chat.participants.find(p => p !== user.username);
               displayName = other || 'Unknown';
             }

             // Time formatting
             const timeStr = chat.lastMessage 
               ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
               : '';

             const isActive = activeChat?.id === chat.id;

             return (
              <button
                key={chat.id}
                onClick={() => { setActiveChat(chat); setSidebarOpen(false); }}
                className={`w-full text-left p-3.5 rounded-xl flex items-center gap-3.5 transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-900/30 to-slate-900/30 border border-purple-500/20 shadow-lg' 
                    : 'hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner
                  ${chat.type === 'group' ? 'bg-slate-900' : 'bg-slate-900'}
                `}>
                  {chat.id === 'group_welcome' ? (
                     <Hash className="w-5 h-5 text-purple-400" />
                  ) : chat.type === 'group' ? (
                     <Users className="w-5 h-5 text-blue-400" />
                  ) : (
                     <div className="font-bold text-slate-500 text-lg group-hover:text-purple-400 transition-colors">
                        {displayName[0].toUpperCase()}
                     </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <div className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {displayName}
                    </div>
                    {timeStr && (
                      <div className="text-[10px] text-slate-600 group-hover:text-slate-500">
                        {timeStr}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 truncate group-hover:text-slate-500 transition-colors">
                    {chat.lastMessage ? chat.lastMessage.content : (chat.type === 'group' ? 'Group created' : 'Start chatting')}
                  </div>
                </div>
              </button>
             );
          })}
          {!isChatsLoading && myChats.length === 0 && (
             <div className="text-center p-8 text-slate-700 text-xs">
                No conversations yet.
             </div>
          )}
        </div>
      </div>
    );
  };

  // If no chat loaded yet (rare, but possible during first async tick)
  if (!activeChat) {
    return <div className="h-screen bg-black flex items-center justify-center text-slate-500">Syncing with Secure Cloud...</div>;
  }

  return (
    <div className="flex h-screen bg-[#000000] text-slate-200 overflow-hidden font-sans">
      
      {/* --- Sidebar --- */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-80 bg-[#020617] border-r border-white/5 flex flex-col transition-transform duration-300 shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header Me */}
        <div className="p-4 bg-[#020617] border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden cursor-pointer border border-white/5 hover:border-purple-500/50 transition-colors" onClick={() => setActiveTab('settings')}>
             {myProfile?.avatar ? <img src={myProfile.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900" />}
          </div>
          <div className="flex-1 min-w-0">
             <div className="font-bold text-white text-sm truncate">{user.username}</div>
             <div className="text-[10px] text-purple-500 font-medium tracking-wide">CLOUD CONNECTED</div>
          </div>
          <div className="flex gap-1">
             <button onClick={() => setActiveTab('chats')} className={`p-2 rounded-lg transition-colors ${activeTab === 'chats' ? 'text-purple-400 bg-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
               <MessageSquare className="w-5 h-5" />
             </button>
             <button onClick={() => setActiveTab('friends')} className={`p-2 rounded-lg transition-colors ${activeTab === 'friends' ? 'text-purple-400 bg-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
               <Users className="w-5 h-5" />
             </button>
             <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'text-purple-400 bg-white/5' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>

        {renderSidebarContent()}
      </aside>

      {/* --- Main Chat --- */}
      <main className="flex-1 flex flex-col relative bg-black z-0">
        {/* Chat Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-10 cursor-pointer"
          onClick={() => setInfoPanelOpen(!infoPanelOpen)}
        >
          <div className="flex items-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }} className="md:hidden text-slate-400">
              <Menu className="w-6 h-6" />
            </button>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-900 border border-white/5 overflow-hidden`}>
              {activeChat.id === 'group_welcome' ? <Hash className="w-5 h-5 text-purple-400" /> : 
               activeChat.type === 'group' ? <Users className="w-5 h-5 text-blue-400" /> :
               <div className="text-lg font-bold text-slate-300">{activeChat.name[0].toUpperCase()}</div>
              }
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight tracking-tight">{activeChat.name}</h2>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider font-medium mt-0.5">
                 {activeChat.type === 'group' ? 'Tap for Group Info' : 'Encrypted Connection'}
              </p>
            </div>
          </div>
          <button className="text-slate-500 hover:text-purple-400 transition-colors">
             <Info className="w-5 h-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-[#000000]">
          {messages.map((msg, idx) => {
            const isMe = msg.sender === user.username;
            const showAvatar = !isMe && (idx === 0 || messages[idx-1].sender !== msg.sender);
            const senderProfile = chatParticipants.find(p => p.username === msg.sender);

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group ${showAvatar ? 'mt-6' : 'mt-1'}`}>
                {!isMe && (
                   <div className="w-8 h-8 mr-3 flex-shrink-0 flex flex-col justify-end">
                     {showAvatar ? (
                       <div className="w-8 h-8 rounded-full bg-slate-900 overflow-hidden border border-white/10">
                         {senderProfile?.avatar ? (
                           <img src={senderProfile.avatar} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">{msg.sender[0].toUpperCase()}</div>
                         )}
                       </div>
                     ) : <div className="w-8" />}
                   </div>
                )}
                
                <div className={`max-w-[80%] md:max-w-[60%] relative`}>
                  {!isMe && showAvatar && <div className="text-[10px] text-purple-400/80 mb-1 ml-1 font-medium">{msg.sender}</div>}
                  <div className={`
                    px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm break-words
                    ${isMe 
                      ? 'bg-purple-900 text-white rounded-tr-none' 
                      : 'bg-[#111827] text-slate-200 rounded-tl-none border border-white/5'
                    }
                  `}>
                    {msg.content}
                  </div>
                  <div className={`text-[9px] mt-1 opacity-40 font-medium tracking-wide ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-[#020617] border-t border-white/5">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-slate-900/50 border border-slate-800 rounded-full py-3.5 pl-6 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder-slate-600 text-sm font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3.5 bg-purple-700 hover:bg-purple-600 text-white rounded-full disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-purple-900/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>

      {/* --- Right Info Panel --- */}
      {infoPanelOpen && (
        <aside className="w-80 bg-[#020617] border-l border-white/5 hidden lg:flex flex-col animate-in slide-in-from-right duration-300 z-20 shadow-xl">
           <div className="h-16 border-b border-white/5 flex items-center justify-between px-6">
             <h3 className="font-bold text-white text-sm">Info</h3>
             <button onClick={() => setInfoPanelOpen(false)} className="hover:text-purple-400 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
           </div>
           
           <div className="p-8 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-slate-900/20 to-transparent">
              <div className="w-24 h-24 rounded-full bg-slate-900 mb-4 overflow-hidden border-2 border-slate-800 shadow-2xl">
                {activeChat.avatar ? (
                   <img src={activeChat.avatar} className="w-full h-full object-cover" />
                ) : activeChat.type === 'dm' ? (
                   <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600 font-bold">
                     {activeChat.name[0].toUpperCase()}
                   </div>
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-600"><Hash className="w-10 h-10" /></div>
                )}
              </div>
              <h2 className="text-xl font-bold text-white text-center tracking-tight">{activeChat.name}</h2>
              <p className="text-purple-400 text-xs mt-1.5 font-medium uppercase tracking-widest">{activeChat.type === 'group' ? `${activeChat.participants.length} members` : 'Personal Chat'}</p>
           </div>

           <div className="flex-1 overflow-y-auto p-6">
              {activeChat.type === 'group' && (
                <>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Members</h4>
                  <div className="space-y-4">
                    {chatParticipants.map(p => (
                      <div key={p.username} className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-full bg-slate-900 overflow-hidden border border-white/5">
                            {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">{p.username[0]}</div>}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="text-sm font-medium text-slate-200 truncate">{p.username}</div>
                           {activeChat.admins?.includes(p.username) && <div className="text-[9px] text-purple-500 font-bold uppercase tracking-wider mt-0.5">Admin</div>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[80vh] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600"></div>
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">New Group</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block tracking-widest">Group Name</label>
                <input 
                  value={groupNameInput}
                  onChange={e => setGroupNameInput(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-xl p-3.5 text-white focus:border-purple-500 focus:outline-none transition-colors placeholder-slate-600"
                  placeholder="e.g. The Inner Circle"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block tracking-widest">Add Participants</label>
                <div className="max-h-48 overflow-y-auto border border-slate-700/50 bg-black/20 rounded-xl p-2 space-y-1 custom-scrollbar">
                   {myProfile?.friends.map(friend => (
                     <label key={friend} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-purple-600 rounded border-slate-600 bg-slate-800"
                          checked={selectedGroupMembers.includes(friend)}
                          onChange={e => {
                             if(e.target.checked) setSelectedGroupMembers([...selectedGroupMembers, friend]);
                             else setSelectedGroupMembers(selectedGroupMembers.filter(f => f !== friend));
                          }}
                        />
                        <span className="text-slate-300 font-medium">{friend}</span>
                     </label>
                   ))}
                   {(!myProfile?.friends || myProfile.friends.length === 0) && <div className="text-slate-500 text-sm p-4 text-center italic">You need to add friends before creating a group.</div>}
                </div>
              </div>
              
              <button 
                onClick={handleCreateGroup}
                disabled={!groupNameInput || selectedGroupMembers.length === 0}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 transition-all"
              >
                Create Secure Group
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
