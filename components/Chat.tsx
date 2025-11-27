import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { User, ChatRoom, ChatMessage, UserProfile, MessageContent, Attachment } from '../types';
import { 
  getMessages, sendMessage, getMyChats, getWelcomeChat,
  getUserProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
  createGroupChat, updateAvatar, updateProfile, subscribeToChat, decryptMessage, resizeImage, detectLinks,
  getDMChatId, updateGroupAvatar, addMessageReaction, deleteMessage, updateMessage, subscribeToGlobalMessages,
  getProfiles
} from '../utils';
import { 
  Send, LogOut, MessageSquare, Users, Hash, 
  UserPlus, Menu, Info, X, Check, Camera, Paperclip, 
  Image as ImageIcon, ExternalLink, Settings, Link as LinkIcon, Moon, Sparkles, Loader2,
  ChevronLeft, Plus, Smile, MoreVertical, Trash, Lock, Edit2, Copy, File, Download, UserMinus, Image, Mail
} from 'lucide-react';

interface ChatProps {
  user: User;
  onLogout: () => void;
}

const OFFICIAL_CHAT_ID = 'group_official_night';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];
const MORE_EMOJIS = ['👋', '🙌', '👀', '💯', '💩', '🤡', '🤮', '💀', '👻', '👽', '🤖', '👾', '🎃', '😺', '🙈', '💢', '💥', '💫', '💦', '💤', '🎉', '🎈', '🎂', '🎄', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'];

// Custom Twitter-Style Verified Badge
const VerifiedIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <g>
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

// --- SUB-COMPONENTS ---

const MessageBubble = ({ 
  msg, isMe, senderProfile, chatId, onReact, isGroup, onDelete, onEdit, onProfileClick 
}: { 
  msg: ChatMessage, isMe: boolean, senderProfile?: UserProfile, chatId: string, onReact: (id: string, emoji: string) => void, isGroup: boolean, onDelete: (id: string) => void, onEdit: (id: string, newText: string) => void, onProfileClick: (username: string) => void 
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

  const handleSaveEdit = () => {
    onEdit(msg.id, editText);
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start items-start'} mb-6 group animate-fade-in-up relative`}>
      {/* Avatar (Left side) */}
      {!isMe && (
         <div className="w-8 h-8 mr-3 flex-shrink-0 items-start pt-1">
            <div onClick={() => onProfileClick(msg.sender)} className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden cursor-pointer relative hover:scale-105 transition-transform" title={msg.sender}>
              {senderProfile?.avatar ? (
                <img src={senderProfile.avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{msg.sender[0].toUpperCase()}</div>
              )}
            </div>
         </div>
      )}
      
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span onClick={() => onProfileClick(msg.sender)} className="text-[10px] text-zinc-500 mb-1 ml-1 hover:text-zinc-300 cursor-pointer flex items-center gap-1">
             {msg.sender}
             {msg.sender === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
          </span>
        )}
        
        <div className={`
          relative p-3 rounded-2xl shadow-sm transition-all group/bubble
          ${isMe 
            ? 'bg-zinc-800 text-zinc-100 rounded-br-sm' 
            : 'bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-bl-sm shadow-[0_0_10px_rgba(0,0,0,0.2)]'
          }
        `}>
          {/* Menu Trigger */}
          <div className={`absolute -top-4 ${isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10`}>
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
             const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(link);
             return (
               <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={`block mt-2 rounded-lg overflow-hidden border transition-all ${isMe ? 'border-zinc-700 bg-zinc-900/20' : 'border-zinc-800 bg-black/50'}`}>
                 {isImage ? (
                   <div className="w-full h-32 bg-zinc-900 flex items-center justify-center overflow-hidden">
                      <img src={link} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
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
        </div>
        
        {/* Footer */}
        <div className={`flex items-center gap-2 mt-1 ${isMe ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
          <div className={`text-[9px] opacity-50 font-medium`}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {content.reactions && Object.keys(content.reactions).length > 0 && (
             <div className="flex gap-1 flex-wrap max-w-[200px]">
               {Object.entries(content.reactions).map(([emoji, users]) => (
                 <div key={emoji} className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer hover:bg-zinc-800 transition-colors ${users.length > 0 ? 'flex' : 'hidden'} ${isMe ? 'bg-zinc-700 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`} title={users.join(', ')}>
                    <span>{emoji}</span>
                    <span className="font-bold">{users.length}</span>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MINI PROFILE POPUP ---
const MiniProfile = ({ username, onClose, onMessage }: { username: string, onClose: () => void, onMessage: (user: string) => void }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
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
                        <div className="w-20 h-20 rounded-full bg-black border-4 border-black overflow-hidden">
                            {profile?.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 font-bold text-xl">{username[0].toUpperCase()}</div>}
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

// --- MAIN DASHBOARD ---

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

  // Settings State
  const [settingsBanner, setSettingsBanner] = useState('');
  const [settingsAvatar, setSettingsAvatar] = useState('');
  const [settingsBio, setSettingsBio] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsShowEmail, setSettingsShowEmail] = useState(false);

  const [addFriendInput, setAddFriendInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupLogoRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Contacts Cache
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfile>>({});

  const addToast = (message: string, type: Toast['type'] = 'info') => {
     const id = Date.now();
     setToasts(prev => [...prev, { id, message, type }]);
     setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
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
      
      setMyProfile(profile);
      setMyChats(chats);
      
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
     }
  }, [activeChat?.id]);

  useEffect(() => {
    const unsub = subscribeToGlobalMessages((payload) => {
       if (payload.eventType === 'INSERT') {
          const newMsg = payload.new;
          const belongsToMyChat = myChats.some(c => c.id === newMsg.chat_id);
          
          if (belongsToMyChat) {
             if (activeChat?.id !== newMsg.chat_id) {
                setUnreadCounts(prev => ({ ...prev, [newMsg.chat_id]: (prev[newMsg.chat_id] || 0) + 1 }));
                if (newMsg.sender !== user.username) {
                   try { audioRef.current.play(); } catch(e){}
                }
             }
             if (closedChatIds.has(newMsg.chat_id)) {
                 const newSet = new Set(closedChatIds);
                 newSet.delete(newMsg.chat_id);
                 setClosedChatIds(newSet);
                 localStorage.setItem('night_closed_chats', JSON.stringify(Array.from(newSet)));
             }
             refreshData();
          }
       }
    });
    return () => { unsub(); };
  }, [myChats, activeChat?.id, closedChatIds]);

  useEffect(() => {
    if (!activeChat) return;
    setUnreadCounts(prev => ({ ...prev, [activeChat.id]: 0 }));
    getMessages(activeChat.id).then(setMessages);
    const unsubscribe = subscribeToChat(activeChat.id, async (payload) => {
      const newRecord = payload.new;
      if (payload.eventType === 'DELETE') {
         setMessages(prev => prev.filter(m => m.id !== payload.old.id));
         return;
      }
      if (!newRecord) return;
      try {
        const contentStr = await decryptMessage(newRecord.iv, newRecord.content, activeChat.id);
        const newMessage: ChatMessage = {
          id: newRecord.id, sender: newRecord.sender, content: contentStr, timestamp: new Date(newRecord.created_at).getTime()
        };
        if (payload.eventType === 'INSERT') {
           setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        } else if (payload.eventType === 'UPDATE') {
           setMessages(prev => prev.map(m => m.id === newMessage.id ? newMessage : m));
        }
      } catch (e) { }
    });
    return () => { unsubscribe(); };
  }, [activeChat?.id]);

  useLayoutEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages, activeChat?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || !activeChat) return;
    if (activeChat.id === OFFICIAL_CHAT_ID && user.username !== 'night') return;

    const payload: MessageContent = { text: inputText, attachments: attachments.length > 0 ? attachments : undefined };
    const contentString = JSON.stringify(payload);
    const tempId = Date.now().toString();
    const optimisticMsg: ChatMessage = { id: tempId, sender: user.username, content: contentString, timestamp: Date.now() };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText(''); setAttachments([]);
    if (textAreaRef.current) textAreaRef.current.style.height = 'auto';

    try {
      const confirmedMsg = await sendMessage(activeChat.id, user.username, contentString);
      setMessages(prev => prev.map(m => m.id === tempId ? confirmedMsg : m));
      setMyChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, lastMessage: confirmedMsg } : c).sort((a,b) => (b.lastMessage?.timestamp||0) - (a.lastMessage?.timestamp||0)));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(payload.text);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
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

  const handleFriendRemove = async (friend: string) => {
      if (confirm(`Remove ${friend} from contacts?`)) {
          await removeFriend(user.username, friend);
          refreshData();
      }
  };

  const handleCloseChat = (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
      const newSet = new Set(closedChatIds);
      newSet.add(chatId);
      setClosedChatIds(newSet);
      localStorage.setItem('night_closed_chats', JSON.stringify(Array.from(newSet)));
      if (activeChat?.id === chatId) setActiveChat(null);
  };
  
  const handleMessageUser = async (targetUsername: string) => {
      if (targetUsername === user.username) return;
      let chat = myChats.find(c => c.type === 'dm' && c.participants.includes(targetUsername));
      if (!chat) {
          const chatId = getDMChatId(user.username, targetUsername);
          chat = {
              id: chatId, type: 'dm', name: targetUsername, participants: [user.username, targetUsername], avatar: ''
          };
          setMyChats(p => [chat!, ...p]);
      }
      setMiniProfileUser(null);
      setActiveChat(chat);
      setSidebarTab('chats');
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

  const displayedChats = myChats.filter(c => !closedChatIds.has(c.id));
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const totalUnreadLabel = totalUnread > 99 ? '99+' : totalUnread.toString();

  if (loadingInitial) return <div className="h-screen w-full bg-black flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-500"/></div>;

  return (
    <div className="flex h-screen bg-black text-zinc-200 overflow-hidden font-sans relative">
      
      <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
         {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-in-right">
               {t.type === 'success' ? <Check className="w-4 h-4 text-green-400" /> : <Info className="w-4 h-4 text-blue-400" />}
               <span className="text-sm font-medium">{t.message}</span>
            </div>
         ))}
      </div>

      {miniProfileUser && <MiniProfile key={miniProfileUser} username={miniProfileUser} onClose={() => setMiniProfileUser(null)} onMessage={handleMessageUser} />}

      {/* SIDEBAR: Visible on desktop always. Visible on mobile ONLY if no active chat. */}
      <aside className={`md:flex flex-col w-full md:w-[320px] bg-black border-r border-zinc-900 transition-all ${activeChat ? 'hidden' : 'flex'}`}>
        <div className="flex p-2 gap-1 border-b border-zinc-900 bg-black/50">
           <button onClick={() => setSidebarTab('chats')} className={`flex-1 py-2 text-[11px] font-bold rounded transition-colors relative flex items-center justify-center gap-2 ${sidebarTab === 'chats' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              CHATS
              {totalUnread > 0 && <span className="bg-red-500 text-white text-[9px] px-1 rounded-full">{totalUnreadLabel}</span>}
           </button>
           <button onClick={() => { setSidebarTab('contacts'); refreshData(); }} className={`flex-1 py-2 text-[11px] font-bold rounded transition-colors relative ${sidebarTab === 'contacts' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
             CONTACTS
             {(myProfile?.incomingRequests?.length || 0) > 0 && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
           {sidebarTab === 'chats' ? (
             <>
               <button onClick={() => setShowCreateGroup(true)} className="w-full py-2 mb-2 rounded border border-dashed border-zinc-900 text-zinc-600 text-[10px] font-bold hover:bg-zinc-900 flex items-center justify-center gap-2"><Plus className="w-3 h-3" /> NEW GROUP</button>
               {displayedChats.map(chat => {
                 let displayName = chat.name;
                 let displayAvatar = chat.avatar;
                 let isVerified = false;
                 
                 if (chat.type === 'dm') {
                    const otherUser = chat.participants.find(p => p !== user.username) || 'Unknown';
                    displayName = otherUser;
                    displayAvatar = profilesCache[otherUser]?.avatar;
                    isVerified = otherUser === 'night';
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
                     className={`w-full text-left p-2 rounded-xl mx-0.5 flex items-center gap-3 transition-all group relative ${isActive ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-900/50 text-zinc-500'} ${unread > 0 ? 'bg-zinc-900/30 border-l-2 border-purple-500 pl-3' : ''}`}
                   >
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border overflow-hidden relative ${isActive ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-900 bg-black'}`}>
                        {displayAvatar ? (
                            <img src={displayAvatar} className="w-full h-full object-cover" />
                        ) : (
                            isOff ? <Moon className="w-5 h-5 text-purple-400 fill-purple-400" /> : (chat.type === 'group' ? <Hash className="w-5 h-5" /> : <span className="font-bold text-lg">{displayName[0]?.toUpperCase()}</span>)
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
                     {!isOff && chat.type === 'dm' && (
                         <div onClick={(e) => handleCloseChat(e, chat.id)} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity"><X className="w-3 h-3" /></div>
                     )}
                   </button>
                 );
               })}
             </>
           ) : (
             <>
                <button onClick={() => setShowAddFriend(true)} className="w-full py-2 mb-4 rounded bg-zinc-900 text-white text-[10px] font-bold hover:bg-zinc-800 flex items-center justify-center gap-2 shadow-lg"><UserPlus className="w-3 h-3" /> ADD FRIEND</button>
                {(myProfile?.incomingRequests?.length || 0) > 0 && (
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
                                   <button onClick={() => { acceptFriendRequest(user.username, req).then(refreshData); }} className="p-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"><Check className="w-3 h-3"/></button>
                                   <button onClick={() => { rejectFriendRequest(user.username, req).then(refreshData); }} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><X className="w-3 h-3"/></button>
                                 </div>
                               </div>
                            )
                        })}
                    </div>
                )}
                <div>
                   <div className="px-2 text-[10px] font-bold text-zinc-600 uppercase mb-2 tracking-wider flex items-center gap-2">Friends <div className="h-px bg-zinc-900 flex-1"></div></div>
                   {myProfile?.friends.map(friend => {
                       const p = friendProfiles[friend];
                       const isVer = friend === 'night';
                       return (
                          <div key={friend} className="w-full text-left p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 group transition-all">
                            <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center border border-zinc-900 text-xs font-bold overflow-hidden">
                                {p?.avatar ? <img src={p.avatar} className="w-full h-full object-cover"/> : friend[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium flex-1 flex items-center gap-1">
                                {friend} {isVer && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                            </span>
                            <button onClick={() => handleFriendRemove(friend)} className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 rounded bg-zinc-950 border border-zinc-900"><Trash className="w-3 h-3"/></button>
                          </div>
                       )
                   })}
                </div>
             </>
           )}
        </div>

        <div className="h-14 bg-black flex items-center px-3 border-t border-zinc-900 justify-between shrink-0">
            <div className="flex items-center gap-3 overflow-hidden hover:bg-zinc-900/50 p-1.5 rounded-lg cursor-pointer transition-colors" onClick={() => setShowSettings(true)}>
               <div className="w-9 h-9 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.username[0]}
               </div>
               <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1">
                    {user.username} {user.username === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">#{user.id?.substr(0,4)}</div>
               </div>
            </div>
            <div className="flex gap-1">
               <button onClick={() => setShowSettings(true)} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-900"><Settings className="w-4 h-4" /></button>
               <button onClick={onLogout} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-900"><LogOut className="w-4 h-4" /></button>
            </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA: Visible on desktop always. Visible on mobile ONLY if active chat. */}
      <main className={`flex-1 flex-col relative min-w-0 bg-black ${activeChat ? 'flex' : 'hidden md:flex'}`}> 
        <div className="absolute inset-0 z-0 bg-transparent pointer-events-none">
           {[...Array(20)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white opacity-20 animate-pulse" 
                   style={{ width: Math.random()*2+1+'px', height: Math.random()*2+1+'px', top: Math.random()*100+'%', left: Math.random()*100+'%', animationDuration: Math.random()*3+2+'s'}} 
              />
           ))}
        </div>
        <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-900 bg-black/80 backdrop-blur-md shadow-sm z-20 cursor-default">
          <div className="flex items-center gap-3">
             <button onClick={() => setActiveChat(null)} className="md:hidden text-zinc-400 p-1"><ChevronLeft className="w-6 h-6"/></button>
             <div className="flex items-center gap-3" onClick={() => setShowMobileInfo(true)}>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                    {activeChat?.type === 'dm' ? (
                         <img src={profilesCache[activeChat.participants.find(p => p !== user.username)||'']?.avatar} className="w-full h-full object-cover" />
                    ) : (
                         activeChat?.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : (activeChat?.id === OFFICIAL_CHAT_ID ? <Moon className="w-4 h-4 text-purple-400 fill-purple-400" /> : <Hash className="w-4 h-4 text-zinc-500" />)
                    )}
                </div>
                <div>
                    <h2 className="text-white font-bold text-sm flex items-center gap-1">
                        {activeChat?.name || "Select Chat"}
                        {activeChat?.id === OFFICIAL_CHAT_ID && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}
                    </h2>
                    {activeChat?.type === 'group' && <span className="text-[10px] text-zinc-500 font-medium">{activeChat.participants.length} members</span>}
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 z-10 custom-scrollbar flex flex-col">
          {activeChat ? messages.map((m) => (
             <MessageBubble 
               key={m.id} msg={m} isMe={m.sender === user.username} senderProfile={profilesCache[m.sender]} chatId={activeChat.id} onReact={handleReaction} isGroup={activeChat.type === 'group'} onDelete={() => deleteMessage(m.id).then(()=>setMessages(p=>p.filter(x=>x.id!==m.id)))} onEdit={(id, txt) => updateMessage(activeChat.id, id, { text: txt }).then(()=>setMessages(p=>p.map(x=>x.id===id ? {...x, content: JSON.stringify({...JSON.parse(x.content), text: txt})} : x)))}
               onProfileClick={setMiniProfileUser}
             />
          )) : <div className="flex flex-col items-center justify-center h-full text-zinc-800"><Moon className="w-16 h-16 mb-4 opacity-20" /><p className="text-xs tracking-widest uppercase">Encrypted Feed Offline</p></div>}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {activeChat && (
          <div className="p-4 bg-black/80 backdrop-blur z-20">
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
                      {inputText.trim() || attachments.length > 0 ? <button type="submit" className="p-2 rounded hover:bg-zinc-800 text-white transition-colors"><Send className="w-4 h-4" /></button> : null}
                   </form>
                </div>
             ) : <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-center text-zinc-600 text-sm flex items-center justify-center gap-2"><Lock className="w-4 h-4" />Read Only Channel</div>}
          </div>
        )}
      </main>

      {/* CHANNEL INFO: Desktop Sidebar OR Mobile Modal */}
      {activeChat && (
        <>
            {/* Desktop View */}
            <aside className="hidden md:flex w-[260px] bg-black border-l border-zinc-900 flex-col z-30 relative shrink-0">
               <ChannelInfoContent activeChat={activeChat} user={user} profilesCache={profilesCache} groupLogoRef={groupLogoRef} handleGroupLogoUpload={handleGroupLogoUpload} setMiniProfileUser={setMiniProfileUser} />
            </aside>

            {/* Mobile View (Modal) */}
            {showMobileInfo && (
                <div className="fixed inset-0 z-[60] bg-black md:hidden animate-fade-in flex flex-col">
                    <div className="h-14 flex items-center px-4 border-b border-zinc-900">
                         <button onClick={() => setShowMobileInfo(false)} className="mr-4"><ChevronLeft className="w-6 h-6 text-zinc-400" /></button>
                         <h3 className="text-white font-bold">Info</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <ChannelInfoContent activeChat={activeChat} user={user} profilesCache={profilesCache} groupLogoRef={groupLogoRef} handleGroupLogoUpload={handleGroupLogoUpload} setMiniProfileUser={setMiniProfileUser} />
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
              <div className="max-h-40 overflow-y-auto mb-4 bg-zinc-950 rounded-xl p-2 border border-zinc-900 custom-scrollbar">
                 {myProfile?.friends.map(f => (
                    <label key={f} className="flex items-center gap-2 p-2 hover:bg-zinc-900 rounded cursor-pointer"><input type="checkbox" className="accent-white" onChange={e => e.target.checked ? setSelectedFriendsForGroup(p=>[...p,f]) : setSelectedFriendsForGroup(p=>p.filter(x=>x!==f))} /><span className="text-zinc-300 text-sm font-medium">{f}</span></label>
                 ))}
              </div>
              <div className="flex justify-end gap-2"><button onClick={() => setShowCreateGroup(false)} className="px-4 py-2 text-zinc-500">Cancel</button><button onClick={() => { createGroupChat(groupNameInput, user.username, selectedFriendsForGroup).then(c => { setMyChats(p=>[c,...p]); setActiveChat(c); setShowCreateGroup(false); }); }} className="px-4 py-2 bg-white text-black rounded-lg font-bold">Create</button></div>
           </div>
         </div>
      )}
    </div>
  );
};

const ChannelInfoContent = ({ activeChat, user, profilesCache, groupLogoRef, handleGroupLogoUpload, setMiniProfileUser }: any) => (
   <>
       <div className="h-14 border-b border-zinc-900 flex items-center px-4 font-bold text-white text-base bg-black/50 backdrop-blur hidden md:flex">{activeChat.type === 'dm' ? 'User Info' : 'Channel Info'}</div>
       <div className="p-6 flex flex-col items-center border-b border-zinc-900 relative">
          <div className="w-24 h-24 rounded-full bg-zinc-900 mb-3 border-4 border-black ring-1 ring-zinc-800 flex items-center justify-center overflow-hidden relative group">
             {activeChat.type === 'group' ? (
                 activeChat.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : <Hash className="w-10 h-10 text-zinc-600" />
             ) : (
                 <img src={profilesCache[activeChat.participants.find(p=>p!==user.username)||'']?.avatar} className="w-full h-full object-cover"/>
             )}
             {activeChat.type === 'group' && (activeChat.admins?.includes(user.username) || user.username === 'night') && (
                 <>
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input type="file" ref={groupLogoRef} onChange={handleGroupLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </>
             )}
          </div>
          <h3 className="font-bold text-white text-xl text-center leading-tight">{activeChat.name}</h3>
          {activeChat.id === OFFICIAL_CHAT_ID && <span className="text-blue-400 text-xs mt-1 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" /> Verified</span>}
       </div>
       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="text-[10px] font-bold text-zinc-600 uppercase mb-3 tracking-wider">Participants — {activeChat.participants.length}</div>
          {activeChat.participants.map((p: string) => (
             <div key={p} className="flex items-center gap-3 mb-2 p-2 hover:bg-zinc-900/50 rounded-lg cursor-pointer group transition-colors" onClick={() => setMiniProfileUser(p)}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 overflow-hidden">
                    {profilesCache[p]?.avatar ? <img src={profilesCache[p].avatar} className="w-full h-full object-cover"/> : p[0].toUpperCase()}
                </div>
                <div className="text-sm text-zinc-300 truncate font-medium flex items-center gap-1">{p} {p === 'night' && <VerifiedIcon className="w-3 h-3 text-[#1d9bf0]" />}</div>
             </div>
          ))}
       </div>
   </>
);

export default Dashboard;