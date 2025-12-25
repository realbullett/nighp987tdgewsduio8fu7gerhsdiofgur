
import { createClient } from '@supabase/supabase-js';
import { EncryptedFile, ChatMessage, ChatRoom, UserProfile, User, MessageContent, UserStatus, ForumCategory, ForumThread, ForumPost, Attachment } from './types';

// --- Supabase Config ---
// Safe access to process.env for browser environments
const getEnv = (key: string, fallback: string) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error if process is not defined
  }
  return fallback;
};

const SUPABASE_URL = getEnv('SUPABASE_URL', 'https://sadylwdqwawqstvlrbex.supabase.co');
const SUPABASE_KEY = getEnv('SUPABASE_KEY', 'sb_publishable_LPj1KJOvVsJ-ZXAsbqE14A_o9CMmtGF');

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: {
        params: {
            eventsPerSecond: 20 // Increased for snappier feeling
        }
    }
});

const WELCOME_CHAT_ID = 'group_official_night';
const TENOR_KEY = 'AIzaSyBADzP48occrT2Id2u61yhMX-FR8pRMB40';

// --- Crypto Utilities ---
const ENC_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';

const bufferToBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
};

const base64ToBuffer = (base64: string): Uint8Array => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

// Key Derivation
const getChatKey = async (chatId: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(chatId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  // Fixed salt ensures same key for same chatId. 
  const fixedSalt = enc.encode('obsidian_vault_secure_salt_v10'); 

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fixedSalt,
      iterations: 100000, 
      hash: HASH_ALGO,
    },
    keyMaterial,
    { name: ENC_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (text: string, chatId: string): Promise<EncryptedFile> => {
  const key = await getChatKey(chatId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: ENC_ALGO, iv: iv },
    key,
    enc.encode(text)
  );

  return {
    iv: bufferToBase64(iv),
    data: bufferToBase64(new Uint8Array(encryptedContent))
  };
};

export const decryptMessage = async (ivStr: string, dataStr: string, chatId: string): Promise<string> => {
  try {
    const key = await getChatKey(chatId);
    const iv = base64ToBuffer(ivStr);
    const data = base64ToBuffer(dataStr);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: ENC_ALGO, iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    // console.error("Decryption failed", e);
    return "🔒 Decryption Failed";
  }
};

export const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
        resolve(base64Str);
        return;
    }

    // Bypass resizing for GIFs to preserve animation
    if (base64Str.startsWith('data:image/gif')) {
        resolve(base64Str);
        return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
            }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
            resolve(base64Str); 
        }
      } catch (e) {
          resolve(base64Str);
      }
    };
    img.onerror = () => {
        resolve(base64Str); 
    };
  });
};

export const detectLinks = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// --- Tenor API ---
export interface TenorGif {
    id: string;
    url: string;
    preview: string;
    title: string;
}

export interface TenorResponse {
    results: TenorGif[];
    next: string;
}

export const fetchTenorGifs = async (search: string = '', limit = 20, pos: string = ''): Promise<TenorResponse> => {
    try {
        let endpoint = search 
            ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(search)}&key=${TENOR_KEY}&client_key=NightApp&limit=${limit}&media_filter=minimal`
            : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&client_key=NightApp&limit=${limit}&media_filter=minimal`;
        
        if (pos) {
            endpoint += `&pos=${pos}`;
        }
        
        const res = await fetch(endpoint);
        const data = await res.json();
        
        if (!data.results) return { results: [], next: '' };

        const results = data.results.map((r: any) => ({
            id: r.id,
            url: r.media_formats.gif.url,
            preview: r.media_formats.tinygif.url,
            title: r.content_description
        }));

        return { results, next: data.next || '' };
    } catch (e) {
        console.error("Tenor API Error", e);
        return { results: [], next: '' };
    }
};

// --- Auth Functions ---

const getEmail = (username: string) => `${username}@obsidian.chat`;

// NEW: Robust Session Restoration
export const restoreSession = async (): Promise<User | null> => {
  try {
    // 1. Check local session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      return null;
    }

    // 2. Verify against database (Source of Truth)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    // 3. Handle Corruption: Session exists, but Profile doesn't.
    if (profileError || !profile) {
      console.warn("Detected corrupt session. Purging.");
      await purgeSession();
      return null;
    }

    // 4. Success
    return {
      username: profile.username,
      isAuthenticated: true,
      avatar: profile.avatar,
      id: session.user.id
    };

  } catch (e) {
    console.error("Critical error restoring session:", e);
    await purgeSession();
    return null;
  }
};

export const purgeSession = async () => {
  await supabase.auth.signOut();
  localStorage.clear(); // Nuclear option to ensure clean state
};

// Legacy support for Chat component (though restoreSession replaces its initial use)
export const getCurrentUser = restoreSession; 

export const registerUser = async (username: string, password: string, avatarBase64: string, publicEmail?: string): Promise<void> => {
  const email = getEmail(username);
  
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    throw new Error("Username already registered. Please log in.");
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Registration failed.");

  if (!authData.session) {
    throw new Error("Confirmation Required. Please disable 'Confirm Email' in Supabase dashboard.");
  }

  const avatar = await resizeImage(avatarBase64, 200, 200);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{ 
        id: authData.user.id, 
        username, 
        avatar, 
        public_email: publicEmail || null,
        updated_at: new Date() 
    }]);

  if (profileError) {
    if (profileError.code !== '23505') throw new Error(profileError.message);
  }
};

export const loginUser = async (username: string, password: string) => {
  const email = getEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Login failed.");
  
  let profile = await getUserProfile(username);
  
  // Robustness Fix: Auto-Heal Profile if missing
  if (!profile) {
    const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    await supabase.from('profiles').upsert([{ id: data.user.id, username, avatar: defaultAvatar, updated_at: new Date() }]);
    profile = await getUserProfile(username);
    
    if (!profile) {
        // Construct temp profile to allow UI to proceed
        profile = {
            id: data.user.id,
            username: username,
            avatar: defaultAvatar,
            friends: [],
            incomingRequests: [],
            outgoingRequests: []
        };
    }
  }

  return { user: data.user, profile };
};

export const logoutUser = async () => {
  await purgeSession();
};

export const getUserProfile = async (username: string): Promise<UserProfile | null> => {
  try {
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (error || !profile) return null;

    const { data: friendships } = await supabase
        .from('friend_requests')
        .select('sender, receiver')
        .eq('status', 'accepted')
        .or(`sender.eq.${username},receiver.eq.${username}`);
        
    const friends = (friendships || []).map((f: any) => f.sender === username ? f.receiver : f.sender);

    const { data: incoming } = await supabase
        .from('friend_requests')
        .select('sender')
        .eq('receiver', username)
        .eq('status', 'pending');

    const { data: outgoing } = await supabase
        .from('friend_requests')
        .select('receiver')
        .eq('sender', username)
        .eq('status', 'pending');
    
    return {
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar,
        banner: profile.banner,
        bio: profile.bio,
        public_email: profile.public_email,
        show_email: profile.show_email,
        friends,
        incomingRequests: incoming?.map((r:any) => r.sender) || [],
        outgoingRequests: outgoing?.map((r:any) => r.receiver) || []
    };
  } catch (e) {
      console.error("Error fetching user profile:", e);
      return null;
  }
};

export const updateProfile = async (username: string, updates: Partial<UserProfile>) => {
    const dbUpdates: any = {};
    if (updates.avatar) dbUpdates.avatar = await resizeImage(updates.avatar, 300, 300);
    if (updates.banner) dbUpdates.banner = await resizeImage(updates.banner, 800, 400);
    if (typeof updates.bio === 'string') dbUpdates.bio = updates.bio;
    if (typeof updates.public_email === 'string') dbUpdates.public_email = updates.public_email;
    if (typeof updates.show_email === 'boolean') dbUpdates.show_email = updates.show_email;

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('profiles').update(dbUpdates).eq('username', username);
        if (error) {
            console.error("Failed to update profile", error);
        }
    }
};

export const getProfiles = async (usernames: string[]): Promise<Record<string, UserProfile>> => {
    if (!usernames || usernames.length === 0) return {};
    const { data } = await supabase.from('profiles').select('username, avatar, banner, bio, public_email, show_email').in('username', usernames);
    const map: Record<string, UserProfile> = {};
    if (data) {
        data.forEach((p: any) => {
            map[p.username] = p as UserProfile;
        });
    }
    return map;
};

export const updateAvatar = async (username: string, avatarBase64: string) => {
  const avatar = await resizeImage(avatarBase64, 200, 200);
  await supabase.from('profiles').update({ avatar }).eq('username', username);
};

export const updateGroupAvatar = async (groupId: string, avatarBase64: string) => {
  // Pass base64 directly (it might be a GIF which resizeImage handles)
  // We assume avatarBase64 is already processed by resizeImage in the UI component
  await supabase.from('chats').update({ avatar: avatarBase64 }).eq('id', groupId);
};

export const updateGroupDescription = async (groupId: string, description: string) => {
  await supabase.from('chats').update({ description }).eq('id', groupId);
};

export const addGroupMembers = async (chatId: string, newMembers: string[]) => {
  const { data } = await supabase.from('chats').select('participants').eq('id', chatId).single();
  if (data) {
    const current = new Set(data.participants);
    newMembers.forEach(m => current.add(m));
    await supabase.from('chats').update({ participants: Array.from(current) }).eq('id', chatId);
  }
};

export const leaveGroup = async (chatId: string, username: string) => {
  const { data } = await supabase.from('chats').select('participants').eq('id', chatId).single();
  if (data) {
    const newParticipants = data.participants.filter((p: string) => p !== username);
    if (newParticipants.length === 0) {
        if (chatId !== WELCOME_CHAT_ID) {
            await supabase.from('chats').delete().eq('id', chatId);
        }
    } else {
        await supabase.from('chats').update({ participants: newParticipants }).eq('id', chatId);
    }
  }
};

// --- READ RECEIPT PERSISTENCE ---

export const markChatRead = async (chatId: string, userId: string, minTimestamp: number = 0) => {
    // We use the MAX of current time or the message timestamp to handle clock skew
    // If device clock is slow, minTimestamp (from server message) will ensure correct logic
    const now = Date.now();
    const finalTimestamp = Math.max(now, minTimestamp);
    
    const key = `night_read_${userId}`;

    // 1. ALWAYS update LocalStorage first (The Source of Truth for this device)
    try {
        const existing = JSON.parse(localStorage.getItem(key) || '{}');
        // Only update if newer
        if (!existing[chatId] || finalTimestamp > existing[chatId]) {
            existing[chatId] = finalTimestamp;
            localStorage.setItem(key, JSON.stringify(existing));
        }
    } catch(err) { /* ignore */ }

    // 2. Try DB Upsert (Sync to other devices)
    try {
        await supabase.from('chat_read_receipts').upsert({
            user_id: userId,
            chat_id: chatId,
            last_read_at: new Date(finalTimestamp).toISOString()
        }, { onConflict: 'user_id, chat_id' });
    } catch (e) {
        // Silently fail on DB - LocalStorage covers us for this session
    }
};

export const fetchReadStates = async (userId: string): Promise<Record<string, number>> => {
    const reads: Record<string, number> = {};
    
    // 1. Load from LocalStorage first (Instant)
    try {
        const key = `night_read_${userId}`;
        const local = JSON.parse(localStorage.getItem(key) || '{}');
        Object.assign(reads, local);
    } catch(e) {}

    // 2. Try Fetch from DB to sync (Merge Strategy)
    try {
        const { data, error } = await supabase.from('chat_read_receipts').select('chat_id, last_read_at').eq('user_id', userId);
        if (data && !error) {
            data.forEach((row: any) => {
                const ts = new Date(row.last_read_at).getTime();
                // Prefer newer timestamp
                if (!reads[row.chat_id] || ts > reads[row.chat_id]) {
                    reads[row.chat_id] = ts;
                }
            });
            // Optional: Update local storage with merged DB data for next time
            const key = `night_read_${userId}`;
            localStorage.setItem(key, JSON.stringify(reads));
        }
    } catch(e) {}
    
    return reads;
};


// --- Chats ---

export const getDMChatId = (userA: string, userB: string) => {
  const sorted = [userA, userB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

export const getWelcomeChat = async (): Promise<ChatRoom> => {
  const { data } = await supabase.from('chats').select('*').eq('id', WELCOME_CHAT_ID).single();
  
  const { data: allProfiles } = await supabase.from('profiles').select('username');
  const allUsernames = allProfiles ? allProfiles.map((p: any) => p.username) : ['night'];

  if (!data) {
    await supabase.from('chats').insert({
      id: WELCOME_CHAT_ID,
      type: 'group',
      name: 'Official Glycon',
      description: '#1 Roblox External Experience',
      participants: ['night'], 
      admins: ['night']
    });
  }
  
  return {
    id: WELCOME_CHAT_ID,
    type: 'group',
    name: 'Official Glycon',
    description: data?.description || '#1 Roblox External Experience',
    participants: allUsernames, 
    admins: ['night'],
    avatar: ''
  };
};

export const createGroupChat = async (name: string, description: string, creator: string, members: string[]) => {
  const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const participants = Array.from(new Set([creator, ...members]));
  
  const room = { id, type: 'group', name, description, participants, admins: [creator], avatar: '' };
  const { error } = await supabase.from('chats').insert(room);
  if (error) throw error;
  return room as ChatRoom;
};

// Helper to fetch single chat details (used for real-time when chat is missing from list)
export const fetchChatDetails = async (chatId: string): Promise<ChatRoom | null> => {
    const { data } = await supabase.from('chats').select('*').eq('id', chatId).single();
    if (!data) return null;
    return data as ChatRoom;
};

export const getMyChats = async (username: string): Promise<ChatRoom[]> => {
  const { data } = await supabase.from('chats').select('*').contains('participants', [username]);
  const chats = data ? data.map((c:any) => c as ChatRoom) : [];
  
  if (!chats.find(c => c.id === WELCOME_CHAT_ID)) {
    chats.unshift(await getWelcomeChat());
  } else {
    const welcome = chats.find(c => c.id === WELCOME_CHAT_ID);
    if (welcome) {
        const { data: allProfiles } = await supabase.from('profiles').select('username');
        welcome.participants = allProfiles ? allProfiles.map((p: any) => p.username) : ['night'];
        welcome.name = 'Official Glycon'; 
    }
  }

  const hydrated = await Promise.all(chats.map(async (chat) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (msgs && msgs.length > 0) {
      try {
        const content = await decryptMessage(msgs[0].iv, msgs[0].content, chat.id);
        return { 
          ...chat, 
          lastMessage: { 
            id: msgs[0].id, 
            sender: msgs[0].sender, 
            content, 
            timestamp: new Date(msgs[0].created_at).getTime() 
          } 
        };
      } catch(e) { return chat; }
    }
    return chat;
  }));

  // Robust Sort
  return hydrated.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
};

export const getMessages = async (chatId: string): Promise<ChatMessage[]> => {
  // FIX: Fetch the LATEST messages (descending), then reverse them for display.
  // Previously we fetched 'ascending' which grabs the OLDEST messages first.
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false }) // Get newest first
    .limit(50); 

  if (!data) return [];

  const decrypted: ChatMessage[] = [];
  for (const m of data) {
    try {
      const content = await decryptMessage(m.iv, m.content, chatId);
      decrypted.push({
        id: m.id,
        sender: m.sender,
        content,
        timestamp: new Date(m.created_at).getTime()
      });
    } catch (e) { }
  }
  // Reverse to chronological order (Old -> New) for the UI
  return decrypted.reverse();
};

// NEW: Separation of concerns for Broadcast Architecture

// 1. Prepare (Encrypt) - Used by Client before Broadcast
export const prepareMessagePayload = async (chatId: string, content: string): Promise<EncryptedFile> => {
    return await encryptMessage(content, chatId);
};

// 2. Persist (Save to DB) - Called in background or by fallback
export const saveMessageToDB = async (chatId: string, sender: string, encryptedContent: EncryptedFile, messageId: string) => {
  if (chatId === WELCOME_CHAT_ID && sender !== 'night') {
    throw new Error("Only 'night' can post in the Official Night channel.");
  }
  
  if (chatId.startsWith('dm_')) {
     const { data } = await supabase.from('chats').select('id').eq('id', chatId).single();
     if (!data) {
       const parts = chatId.replace('dm_', '').split('_');
       await supabase.from('chats').insert({
         id: chatId, type: 'dm', name: 'DM', participants: parts
       });
     }
  }

  const { error } = await supabase.from('messages').insert({
    id: messageId,
    chat_id: chatId,
    sender,
    content: encryptedContent.data,
    iv: encryptedContent.iv
  });

  if (error) throw error;
};

// Legacy Wrapper for backward compatibility if needed, but updated to use new ID logic
export const sendMessage = async (chatId: string, sender: string, content: string, messageId?: string): Promise<ChatMessage> => {
  const encrypted = await prepareMessagePayload(chatId, content);
  const id = messageId || crypto.randomUUID();
  await saveMessageToDB(chatId, sender, encrypted, id);
  
  return {
      id,
      sender,
      content,
      timestamp: Date.now()
  };
};

export const deleteMessage = async (messageId: string) => {
  await supabase.from('messages').delete().eq('id', messageId);
};

export const updateMessage = async (chatId: string, messageId: string, newContentObj: MessageContent) => {
  const contentString = JSON.stringify(newContentObj);
  const encrypted = await encryptMessage(contentString, chatId);
  
  await supabase.from('messages').update({
    content: encrypted.data,
    iv: encrypted.iv
  }).eq('id', messageId);
};

export const addMessageReaction = async (chatId: string, messageId: string, emoji: string, username: string) => {
  const { data: msg } = await supabase.from('messages').select('*').eq('id', messageId).single();
  if (!msg) return;

  const contentStr = await decryptMessage(msg.iv, msg.content, chatId);
  let content: MessageContent;
  try {
    content = JSON.parse(contentStr);
  } catch {
    content = { text: contentStr };
  }

  if (!content.reactions) content.reactions = {};
  const current = content.reactions[emoji] || [];
  
  if (current.includes(username)) {
    content.reactions[emoji] = current.filter(u => u !== username); 
    if (content.reactions[emoji].length === 0) delete content.reactions[emoji];
  } else {
    content.reactions[emoji] = [...current, username];
  }

  const newContentStr = JSON.stringify(content);
  const encrypted = await encryptMessage(newContentStr, chatId);

  await supabase.from('messages').update({
    content: encrypted.data,
    iv: encrypted.iv
  }).eq('id', messageId);
};

// --- GLOBAL SUBSCRIPTION ---
export const subscribeToGlobalMessages = (
    onMessageEvent: (payload: any) => void, 
    onChatEvent: (payload: any) => void,
    onFriendEvent: (payload: any) => void,
    onForumEvent: (payload: any) => void // New Handler for forums
) => {
    const channel = supabase.channel('global-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onMessageEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, onChatEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, onFriendEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_threads' }, onForumEvent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, onForumEvent)
        .subscribe();
        
    return () => { supabase.removeChannel(channel); };
};

export const subscribeToPresence = (
    username: string,
    onPresenceSync: (onlineUsers: Record<string, UserStatus>) => void
) => {
    const channel = supabase.channel('global_presence', {
        config: { presence: { key: username } }
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const onlineMap: Record<string, UserStatus> = {};
            
            Object.keys(newState).forEach(userKey => {
                const presenceData = newState[userKey][0] as any;
                if (presenceData && presenceData.status) {
                    onlineMap[userKey] = presenceData.status;
                }
            });
            onPresenceSync(onlineMap);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Initial Track as Online
                await channel.track({ status: 'online', onlineAt: new Date().toISOString() });
            }
        });

    return {
        unsubscribe: () => supabase.removeChannel(channel),
        updateStatus: async (status: UserStatus) => {
            await channel.track({ status, onlineAt: new Date().toISOString() });
        }
    };
};


// --- Friends ---
export const sendFriendRequest = async (from: string, to: string) => {
  await supabase.from('friend_requests').insert({ sender: from, receiver: to });
};
export const acceptFriendRequest = async (me: string, them: string) => {
  await supabase.from('friend_requests').update({ status: 'accepted' }).eq('sender', them).eq('receiver', me);
};
export const rejectFriendRequest = async (me: string, them: string) => {
  await supabase.from('friend_requests').delete().eq('sender', them).eq('receiver', me);
};
export const removeFriend = async (me: string, them: string) => {
    await supabase.from('friend_requests').delete().or(`and(sender.eq.${me},receiver.eq.${them}),and(sender.eq.${them},receiver.eq.${me})`);
};

// --- FORUMS API ---

export const getForumCategories = async (): Promise<ForumCategory[]> => {
    const { data } = await supabase.from('forum_categories').select('*').order('name');
    return (data || []) as ForumCategory[];
};

export const getForumThreads = async (categoryId: string): Promise<ForumThread[]> => {
    const { data } = await supabase.from('forum_threads').select('*').eq('category_id', categoryId).order('updated_at', { ascending: false });
    return (data || []) as ForumThread[];
};

export const getAllForumThreads = async (): Promise<ForumThread[]> => {
    const { data } = await supabase.from('forum_threads').select('*').order('updated_at', { ascending: false }).limit(50);
    return (data || []) as ForumThread[];
};

export const createForumThread = async (
    categoryId: string, 
    author: string, 
    title: string, 
    content: string, 
    tags: string[] = [], 
    banner?: string, 
    attachments?: Attachment[]
) => {
    const { data, error } = await supabase.from('forum_threads').insert({
        category_id: categoryId,
        author,
        title,
        content,
        tags,
        banner,
        attachments: attachments || []
    }).select().single();
    if (error) throw error;
    return data as ForumThread;
};

export const getForumPosts = async (threadId: string): Promise<ForumPost[]> => {
    const { data } = await supabase.from('forum_posts').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    return (data || []) as ForumPost[];
};

export const createForumPost = async (threadId: string, author: string, content: string) => {
    const { error } = await supabase.from('forum_posts').insert({
        thread_id: threadId,
        author,
        content
    });
    if (error) throw error;
    
    // Update thread timestamp
    await supabase.from('forum_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
};

export const incrementThreadView = async (threadId: string) => {
    // If the rpc doesn't exist yet, this will fail silently on client side or throw error
    // Use raw update for fallback compatibility if strict SQL migration isn't run
    const { error } = await supabase.rpc('increment_thread_view', { row_id: threadId });
    if (error) {
       // Fallback: Just ignore or try update (though update is race-condition prone without rpc)
    }
};
